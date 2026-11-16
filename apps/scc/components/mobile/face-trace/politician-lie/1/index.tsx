"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { createMouthMemory, createMouthShape, createView, measureMouth, openingRatio, zoomFrame, type Cover } from "./mouth";
import { createMouthRenderer, type MouthRenderer } from "./renderer";
import { createClipSound, type ClipSound } from "./sound";
import styles from "./screen.module.css";

type Phase = "idle" | "loading" | "running" | "error";

// Bill Clinton, 26 January 1998: "I did not have sexual relations with that
// woman, Miss Lewinsky … These allegations are false." See docs/experiments/mobile/politician-lie.md.
const CLIP = "/video/face-trace/politician-lie/clinton-1998-01-26.mp4";
// The same recording's sound alone, for Web Audio.
const CLIP_SOUND = "/video/face-trace/politician-lie/clinton-1998-01-26.m4a";
// Clip row held at the mouth centre: between his nose and mouth, so a barely
// open mouth shows his lips and a wide one his whole face.
const CLIP_FOCUS = 0.6;

// Opening ratio (inner-lip gap over mouth width): the clip fades in over
// FADE, starts above OPEN and stops once the lips have stayed under CLOSED.
const FADE_FROM = 0.03;
const FADE_TO = 0.065;
const OPEN = 0.06;
const CLOSED = 0.035;
const CLOSED_HOLD = 180;
// Loudness follows the opening: silent until the clip begins to show, full at
// a mouth opened this wide.
const LOUD = 0.4;
const FACE_HOLD = 400;

export default function PoliticianLieOne() {
  const cameraRef = useRef<HTMLVideoElement>(null);
  const clipRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<MouthRenderer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const frameRef = useRef<number | null>(null);
  const requestRef = useRef(0);
  const startRef = useRef<() => void>(() => {});
  const grantedRef = useRef(false);
  const startingRef = useRef(false);
  const speakingRef = useRef(false);
  const soundRef = useRef<ClipSound | null>(null);
  const probeRef = useRef<HTMLPreElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  // ?sound adds a readout of the sound's state, for a device with no console.
  const [probe, setProbe] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the address is only known in the browser
    setProbe(new URLSearchParams(window.location.search).has("sound"));
  }, []);

  const stop = useCallback((update = true) => {
    requestRef.current += 1;
    startingRef.current = false;
    speakingRef.current = false;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    if (cameraRef.current) cameraRef.current.srcObject = null;
    clipRef.current?.pause();
    soundRef.current?.stop();
    if (update) setPhase("idle");
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "high-performance" });
    if (!gl) return;
    const initialize = () => {
      try {
        rendererRef.current = createMouthRenderer(gl);
      } catch (error) {
        console.error("Politician lie renderer could not start", error);
        rendererRef.current = null;
      }
    };
    const onContextLost = (event: Event) => {
      event.preventDefault();
      rendererRef.current = null;
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    canvas.addEventListener("webglcontextrestored", initialize);
    initialize();
    return () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", initialize);
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, []);

  const start = async () => {
    if (startingRef.current || streamRef.current) return;
    stop(false);
    startingRef.current = true;
    const request = requestRef.current;
    setPhase("loading");
    setMessage("");

    // Inside the tap, so the clip may sound later: Web Audio is let out here,
    // and the video is started and held until a mouth opens. It starts muted,
    // so nothing of the clip is heard before a mouth shows it.
    const clip = clipRef.current;
    soundRef.current ??= createClipSound(CLIP_SOUND);
    const sound = soundRef.current;
    sound?.unlock();
    if (clip) {
      clip.muted = true;
      clip.play().then(() => {
        if (!speakingRef.current) clip.pause();
      }).catch(() => {});
    }

    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("카메라를 사용하려면 HTTPS가 필요합니다.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30, max: 30 } },
      });
      if (request !== requestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const camera = cameraRef.current;
      const canvas = canvasRef.current;
      if (!camera || !canvas || !clip) throw new Error("카메라 화면을 준비할 수 없습니다.");
      camera.srcObject = stream;
      await camera.play();
      if (request !== requestRef.current) return;
      grantedRef.current = true;

      const files = await FilesetResolver.forVisionTasks("/models/gaze-tracking/wasm");
      if (request !== requestRef.current) return;
      const landmarker = await FaceLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: "/models/gaze-tracking/face_landmarker.task" },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: 0.55,
        minFacePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
      });
      if (request !== requestRef.current) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;
      startingRef.current = false;
      setPhase("running");

      // Landmarks come from a 640-wide copy of the very frame that is drawn,
      // so the outline and the lips it was measured on appear together.
      const inferenceCanvas = document.createElement("canvas");
      inferenceCanvas.width = 640;
      inferenceCanvas.height = 480;
      const inferenceContext = inferenceCanvas.getContext("2d", { willReadFrequently: true });
      if (!inferenceContext) throw new Error("얼굴 추적 화면을 준비할 수 없습니다.");
      const shape = createMouthShape();
      const memory = createMouthMemory();
      const view = createView();
      let cover: Cover | null = null;
      let ratio = 0;
      let lastCameraTime = -1;
      let lastClipTime = -1;
      let lastInference = 0;
      let inferenceCost = 12;
      let lastFace = 0;
      let lastOpen = 0;
      let playPending = false;
      let elementRefused = false;
      let lastRefusal = "";
      let lastProbe = 0;

      const tick = () => {
        if (request !== requestRef.current) return;
        const now = performance.now();
        const renderer = rendererRef.current;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.max(1, Math.round(canvas.clientWidth * pixelRatio));
        const height = Math.max(1, Math.round(canvas.clientHeight * pixelRatio));
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
          memory.primed = false;
        }

        // A slow device tracks fewer frames rather than letting the outline lag.
        const ready = camera.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && camera.videoWidth > 0;
        if (renderer && ready && camera.currentTime !== lastCameraTime && now - lastInference >= Math.min(66, inferenceCost * 1.25)) {
          lastCameraTime = camera.currentTime;
          const elapsed = lastInference > 0 ? Math.min(200, now - lastInference) : 0;
          lastInference = now;
          try {
            const inferenceHeight = Math.max(1, Math.round(camera.videoHeight * inferenceCanvas.width / camera.videoWidth));
            if (inferenceCanvas.height !== inferenceHeight) inferenceCanvas.height = inferenceHeight;
            inferenceContext.drawImage(camera, 0, 0, inferenceCanvas.width, inferenceCanvas.height);
            renderer.setCamera(camera);
            const points = landmarker.detectForVideo(inferenceCanvas, now).faceLandmarks[0] ?? null;
            inferenceCost += (performance.now() - now - inferenceCost) * 0.1;
            // The view follows the mouth; the outline is measured in that same view.
            cover = zoomFrame(view, points, width, height, camera.videoWidth, camera.videoHeight, elapsed);
            if (points && measureMouth(points, cover, memory, shape)) {
              ratio = openingRatio(points, camera.videoWidth / camera.videoHeight);
              lastFace = now;
            } else if (now - lastFace > FACE_HOLD) {
              ratio = 0;
              memory.primed = false;
            }
          } catch {
            stop(false);
            setMessage("얼굴 추적을 계속할 수 없습니다.");
            setPhase("error");
            return;
          }
        }

        // Speech closes the lips many times a second; the clip keeps running
        // through those and stops only when the mouth stays shut.
        if (ratio > OPEN) lastOpen = now;
        if (ratio > OPEN) speakingRef.current = true;
        else if (ratio < CLOSED && now - lastOpen > CLOSED_HOLD) speakingRef.current = false;
        // The video carries its own sound whenever Web Audio is not live.
        // Either way it is only as loud as the mouth is open, and silent while
        // the clip does not show.
        const level = lastClipTime < 0 ? 0 : Math.max(0, Math.min(1, (ratio - FADE_FROM) / (LOUD - FADE_FROM)));
        const ownSound = !sound?.live && !elementRefused;
        const ownAudible = ownSound && level > 0;
        if (clip.muted === ownAudible) clip.muted = !ownAudible;
        if (ownAudible) clip.volume = level;
        if (speakingRef.current && clip.paused && !playPending) {
          playPending = true;
          clip.play().catch((error: unknown) => {
            // Its own sound needs a tap; a restart without one plays silently.
            lastRefusal = error instanceof Error ? error.name : String(error);
            if (error instanceof DOMException && error.name === "NotAllowedError") elementRefused = true;
          }).finally(() => { playPending = false; });
        } else if (!speakingRef.current && !clip.paused && !playPending) {
          clip.pause();
        }
        sound?.follow(speakingRef.current && !clip.paused && !clip.seeking && !ownSound, clip.currentTime, now, level);
        if (probeRef.current && now - lastProbe > 250) {
          lastProbe = now;
          probeRef.current.textContent = `${sound ? sound.describe() : "no web audio"}\nvideo ${clip.paused ? "paused" : "playing"} ${clip.currentTime.toFixed(1)} · ${clip.muted ? "muted" : "own sound"}${elementRefused ? " · refused" : ""}${lastRefusal ? ` · ${lastRefusal}` : ""} · mouth ${ratio.toFixed(2)} · level ${level.toFixed(2)}`;
        }

        if (renderer && cover) {
          if (clip.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && clip.currentTime !== lastClipTime) {
            lastClipTime = clip.currentTime;
            renderer.setClip(clip);
          }
          const fade = Math.max(0, Math.min(1, (ratio - FADE_FROM) / (FADE_TO - FADE_FROM)));
          const open = lastClipTime < 0 ? 0 : fade * fade * (3 - 2 * fade);
          const clipAspect = clip.videoWidth > 0 ? clip.videoWidth / clip.videoHeight : 4 / 3;
          renderer.draw(cover, shape, open, clipAspect, CLIP_FOCUS, pixelRatio);
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    } catch (error) {
      if (request !== requestRef.current) return;
      stop(false);
      setMessage(error instanceof Error ? error.message : "카메라를 시작할 수 없습니다.");
      setPhase("error");
    }
  };

  useEffect(() => {
    startRef.current = () => { void start(); };
  });

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) stop();
      else if (grantedRef.current) startRef.current();
    };
    const onPageHide = () => stop(false);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      stop(false);
      soundRef.current?.close();
      soundRef.current = null;
    };
  }, [stop]);

  return (
    <main className={styles.stage} onClick={() => soundRef.current?.unlock()}>
      <video ref={cameraRef} className={styles.source} playsInline muted aria-hidden="true" />
      <video ref={clipRef} className={styles.source} src={CLIP} playsInline loop preload="auto" aria-hidden="true" />
      <canvas ref={canvasRef} className={styles.image} aria-label="거울처럼 비친, 크게 확대된 입. 입을 벌리면 입술 사이로 1998년 빌 클린턴의 부인 발언 영상이 보이고 들립니다" role="img" />
      {(phase === "idle" || phase === "error") && (
        <div className={styles.prompt}>
          {message && <p role="alert">{message}</p>}
          <button type="button" onClick={() => { void start(); }}>카메라 켜기</button>
        </div>
      )}
      {probe && <pre ref={probeRef} className={styles.probe} />}
      {phase === "loading" && <p className={styles.status} role="status">카메라 준비 중</p>}
    </main>
  );
}
