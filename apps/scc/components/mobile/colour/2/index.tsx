"use client";

import { useEffect, useRef } from "react";
import { FaceLandmarker, FilesetResolver, type NormalizedLandmark } from "@mediapipe/tasks-vision";
import { createYell } from "./sound/yell";
import styles from "./screen.module.css";

const STEP_MS = 1000 / 60;
const DETECT_MS = 50;
const LOST_MS = 600;
// The head's share of the viewport, on whichever side binds first.
const FILL = 0.84;
// Steep enough to leave two tones, soft enough to hide sensor noise.
const CONTRAST = 10;

// MediaPipe's face outline, in order around the head.
const OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
  152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];

type Head = { x: number; y: number; width: number; height: number };

function readHead(points: NormalizedLandmark[], width: number, height: number): Head | null {
  let left = Infinity;
  let right = -Infinity;
  let top = Infinity;
  let bottom = -Infinity;
  for (const index of OVAL) {
    const point = points[index];
    if (!point) return null;
    left = Math.min(left, point.x * width);
    right = Math.max(right, point.x * width);
    top = Math.min(top, point.y * height);
    bottom = Math.max(bottom, point.y * height);
  }
  if (right - left < 8 || bottom - top < 8) return null;
  return { x: (left + right) / 2, y: (top + bottom) / 2, width: right - left, height: bottom - top };
}

export default function ColourTwo() {
  const pageRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const page = pageRef.current!;
    const video = videoRef.current!;
    const canvas = canvasRef.current!;
    const context = canvas.getContext("2d");
    const inference = document.createElement("canvas");
    inference.width = 480;
    const inferenceContext = inference.getContext("2d", { willReadFrequently: true });
    const probe = document.createElement("canvas");
    probe.width = probe.height = 16;
    const probeContext = probe.getContext("2d", { willReadFrequently: true });
    const lumas = new Float32Array(256);

    const sound = createYell();
    // `?debug` prints one line of sound and camera state; nothing shows without it.
    const readout = new URLSearchParams(window.location.search).has("debug") ? document.createElement("p") : null;
    if (readout) {
      readout.style.cssText = "position:absolute;z-index:1;left:12px;right:12px;top:max(12px,env(safe-area-inset-top));margin:0;font:12px/1.4 ui-monospace,monospace;color:#fff;mix-blend-mode:difference;pointer-events:none";
      page.appendChild(readout);
    }
    let lastReadout = 0;
    const held = new Set<number>();
    let touches = 0;
    let frame = 0;
    let shown = "";
    let painted = false;

    let stream: MediaStream | null = null;
    let landmarker: FaceLandmarker | null = null;
    let session = 0;
    let starting = false;
    let granted = false;

    let points: NormalizedLandmark[] | null = null;
    let target: Head | null = null;
    let head: Head | null = null;
    let level = 0.5;
    let lastVideoTime = -1;
    let lastDetect = 0;
    let lastFace = 0;
    let lastTick = 0;

    const release = () => {
      session += 1;
      starting = false;
      stream?.getTracks().forEach((track) => track.stop());
      stream = null;
      video.srcObject = null;
      landmarker?.close();
      landmarker = null;
      points = null;
      target = null;
      head = null;
      lastVideoTime = -1;
    };

    // Without a camera or a face the page is colour/1: a bare strobe.
    const start = async () => {
      if (starting || stream) return;
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) return;
      starting = true;
      const mine = ++session;
      try {
        const next = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } },
        });
        if (mine !== session) {
          next.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = next;
        video.srcObject = next;
        await video.play();
        if (mine !== session) return;
        granted = true;
        const files = await FilesetResolver.forVisionTasks("/models/gaze-tracking/wasm");
        if (mine !== session) return;
        const created = await FaceLandmarker.createFromOptions(files, {
          baseOptions: { modelAssetPath: "/models/gaze-tracking/face_landmarker.task" },
          runningMode: "VIDEO",
          numFaces: 1,
          minFaceDetectionConfidence: 0.55,
          minFacePresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });
        if (mine !== session) {
          created.close();
          return;
        }
        landmarker = created;
        starting = false;
      } catch {
        if (mine === session) release();
      }
    };

    // The median luma of the face's middle becomes the black/white threshold,
    // so the head splits into two tones in any light.
    const measureLevel = (found: Head, scale: number) => {
      if (!probeContext) return;
      const width = found.width * 0.6 * scale;
      const height = found.height * 0.6 * scale;
      probeContext.drawImage(inference, found.x * scale - width / 2, found.y * scale - height / 2, width, height, 0, 0, 16, 16);
      const { data } = probeContext.getImageData(0, 0, 16, 16);
      for (let index = 0; index < 256; index += 1) {
        const offset = index * 4;
        lumas[index] = (data[offset] * 0.2126 + data[offset + 1] * 0.7152 + data[offset + 2] * 0.0722) / 255;
      }
      lumas.sort();
      const median = (lumas[127] + lumas[128]) / 2;
      level += (Math.max(0.08, Math.min(0.92, median)) - level) * 0.2;
    };

    const detect = (now: number) => {
      if (!landmarker || !inferenceContext || !video.videoWidth) return;
      lastDetect = now;
      try {
        const scale = inference.width / video.videoWidth;
        const height = Math.max(1, Math.round(video.videoHeight * scale));
        if (inference.height !== height) inference.height = height;
        inferenceContext.drawImage(video, 0, 0, inference.width, inference.height);
        const found = landmarker.detectForVideo(inference, now).faceLandmarks[0];
        const next = found ? readHead(found, video.videoWidth, video.videoHeight) : null;
        if (found && next) {
          points = found;
          target = next;
          head ??= { ...next };
          lastFace = now;
          measureLevel(next, scale);
        } else if (now - lastFace > LOST_MS) {
          points = null;
          target = null;
          head = null;
        }
      } catch {
        release();
      }
    };

    const clear = () => {
      if (!context || !painted) return;
      context.clearRect(0, 0, canvas.width, canvas.height);
      painted = false;
    };

    // The live camera frame, cut to the head outline, mirrored and scaled so
    // the head fills the screen.
    const draw = () => {
      if (!context) return;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        painted = false;
      }
      clear();
      if (!points || !head) return;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      const scale = Math.min(width * FILL / head.width, height * FILL / head.height);
      context.save();
      context.setTransform(-scale, 0, 0, scale, width / 2 + head.x * scale, height / 2 - head.y * scale);
      context.beginPath();
      const last = points[OVAL[OVAL.length - 1]];
      const first = points[OVAL[0]];
      context.moveTo((last.x + first.x) * videoWidth / 2, (last.y + first.y) * videoHeight / 2);
      for (let index = 0; index < OVAL.length; index += 1) {
        const point = points[OVAL[index]];
        const next = points[OVAL[(index + 1) % OVAL.length]];
        context.quadraticCurveTo(
          point.x * videoWidth,
          point.y * videoHeight,
          (point.x + next.x) * videoWidth / 2,
          (point.y + next.y) * videoHeight / 2,
        );
      }
      context.closePath();
      context.clip();
      context.drawImage(video, 0, 0, videoWidth, videoHeight);
      context.restore();
      painted = true;
    };

    // Ground and head flip together: every pixel is black one step and white
    // the next, and the head is the part that flips out of phase.
    const show = (ground: string, invert: number) => {
      const gain = Math.round(Math.max(0.5, Math.min(5, 0.5 / level)) * 50) / 50;
      const key = `${ground}/${invert}/${gain}`;
      if (key === shown) return;
      shown = key;
      page.style.background = ground;
      canvas.style.filter = `grayscale(1) brightness(${gain}) contrast(${CONTRAST}) invert(${invert})`;
    };

    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      const elapsed = Math.min(50, lastTick ? now - lastTick : 16);
      lastTick = now;
      let fresh = false;
      if (landmarker && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        fresh = true;
        if (now - lastDetect >= DETECT_MS) detect(now);
      }
      if (head && target) {
        const blend = 1 - Math.exp(-elapsed / 70);
        head.x += (target.x - head.x) * blend;
        head.y += (target.y - head.y) * blend;
        head.width += (target.width - head.width) * blend;
        head.height += (target.height - head.height) * blend;
      }
      const pressed = held.size > 0 || touches > 0;
      sound.update(pressed);
      if (readout && now - lastReadout > 200) {
        lastReadout = now;
        readout.textContent = `${sound.status()} · camera ${stream ? "on" : "off"} · face ${points ? "yes" : "no"} · held ${held.size + touches}`;
      }
      if (!pressed) {
        clear();
        show("#000", 0);
        return;
      }
      if (fresh || !painted) draw();
      const white = Math.floor(now / STEP_MS) % 2;
      show(white ? "#fff" : "#000", white);
    };

    // Fingers are counted from the touch list itself, so a lift the browser
    // never reports as a pointerup (a system prompt, a gesture taking over)
    // cannot leave the strobe running. Pointer events cover mouse and pen.
    const down = (event: PointerEvent) => {
      sound.unlock();
      if (event.pointerType !== "touch") held.add(event.pointerId);
    };
    const up = (event: PointerEvent) => {
      sound.unlock();
      held.delete(event.pointerId);
    };
    const touch = (event: TouchEvent) => {
      sound.unlock();
      touches = event.touches.length;
    };
    const letGo = () => {
      held.clear();
      touches = 0;
      sound.update(false);
    };
    const onVisibility = () => {
      if (document.hidden) {
        letGo();
        release();
      } else if (granted) {
        void start();
      }
    };
    const onPageHide = () => release();

    page.addEventListener("pointerdown", down);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("touchstart", touch, { passive: true });
    window.addEventListener("touchend", touch, { passive: true });
    window.addEventListener("touchcancel", touch, { passive: true });
    window.addEventListener("blur", letGo);
    window.addEventListener("click", sound.unlock);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    frame = requestAnimationFrame(tick);
    void start();
    return () => {
      cancelAnimationFrame(frame);
      page.removeEventListener("pointerdown", down);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("touchstart", touch);
      window.removeEventListener("touchend", touch);
      window.removeEventListener("touchcancel", touch);
      window.removeEventListener("blur", letGo);
      window.removeEventListener("click", sound.unlock);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      release();
      sound.dispose();
      readout?.remove();
    };
  }, []);

  return (
    <main ref={pageRef} className={styles.page}>
      <video ref={videoRef} className={styles.source} playsInline muted aria-hidden="true" />
      <canvas ref={canvasRef} className={styles.head} aria-hidden="true" />
    </main>
  );
}
