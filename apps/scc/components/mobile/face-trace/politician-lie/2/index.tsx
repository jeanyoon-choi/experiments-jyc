"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { createMouthMemory, createMouthShape, createView, measureMouth, openingRatio, zoomFrame, type Cover } from "./mouth";
import { LIES, REEL, REEL_END, REEL_SOUND, lieAt } from "./lies";
import { NOSE_HEIGHT, NOSE_WIDTH, createNose, fadeNose, measureNose } from "./nose";
import { createMouthRenderer, type MouthRenderer } from "./renderer";
import { createClipSound, type ClipSound } from "./sound";
import styles from "./screen.module.css";

type Phase = "idle" | "loading" | "running" | "error";

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
// The flag fades into the nostrils, and out when they are lost, over this long.
const NOSE_FADE = 200;

export default function PoliticianLieTwo() {
  const cameraRef = useRef<HTMLVideoElement>(null);
  const clipRef = useRef<HTMLVideoElement>(null);
  const ownRef = useRef<HTMLAudioElement>(null);
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
  // The intro stands before everything else; a tap anywhere on it turns the camera on.
  const [entered, setEntered] = useState(false);
  // ?sound adds a readout of the sound's state, for a device with no console.
  const [probe, setProbe] = useState(false);
  // ?nose tints the box the nostrils are looked for in.
  const noseProbeRef = useRef(false);
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    noseProbeRef.current = query.has("nose");
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the address is only known in the browser
    setProbe(query.has("sound"));
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
    ownRef.current?.pause();
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
    // and the video (which has no sound of its own) is started and held until
    // a mouth opens. The audio element, the way out when Web Audio is not
    // live, is started muted too, so nothing is heard before a mouth shows it.
    const clip = clipRef.current;
    soundRef.current ??= createClipSound(REEL_SOUND);
    const sound = soundRef.current;
    sound?.unlock();
    if (clip) {
      clip.muted = true;
      clip.play().then(() => {
        if (!speakingRef.current) clip.pause();
      }).catch(() => {});
    }
    const own = ownRef.current;
    if (own) {
      own.muted = true;
      own.play().then(() => {
        if (!speakingRef.current) own.pause();
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
      const noseCanvas = document.createElement("canvas");
      noseCanvas.width = NOSE_WIDTH;
      noseCanvas.height = NOSE_HEIGHT;
      const noseContext = noseCanvas.getContext("2d", { willReadFrequently: true });
      if (!noseContext) throw new Error("얼굴 추적 화면을 준비할 수 없습니다.");
      const nose = createNose();
      let noseOn = 0;
      let lastDraw = 0;
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
      let ownPending = false;
      let ownRefused = false;
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
            // The nostrils are looked for in the very picture the landmarks came from.
            if (points && measureNose(points, inferenceCanvas, inferenceCanvas.width, inferenceCanvas.height, noseContext, nose)) {
              renderer.setNose(nose.mask);
            } else {
              fadeNose(nose);
            }
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
        const ownSound = !sound?.live && !ownRefused;
        if (speakingRef.current && clip.paused && !playPending) {
          playPending = true;
          clip.play().catch((error: unknown) => {
            lastRefusal = error instanceof Error ? error.name : String(error);
          }).finally(() => { playPending = false; });
        } else if (!speakingRef.current && !clip.paused && !playPending) {
          // The mouth has shut: this lie is over, and the next one waits at
          // its first frame for the mouth to open again. A mouth held open
          // simply runs on through the reel.
          clip.pause();
          clip.currentTime = LIES[(lieAt(clip.currentTime) + 1) % LIES.length].start;
        }
        // Only the reel's first part belongs here: at its end, back to the start.
        if (!clip.paused && !clip.seeking && clip.currentTime >= REEL_END - 0.05) clip.currentTime = 0;
        const running = speakingRef.current && !clip.paused && !clip.seeking;
        sound?.follow(running && !ownSound, clip.currentTime, now, level);
        // The audio element stands in while Web Audio is not live, kept on the picture.
        if (own) {
          if (running && ownSound) {
            own.muted = level <= 0;
            own.volume = level;
            if (Math.abs(own.currentTime - clip.currentTime) > 0.3) own.currentTime = clip.currentTime;
            if (own.paused && !ownPending) {
              ownPending = true;
              own.play().catch((error: unknown) => {
                // Sound needs a tap; without one this way stays silent.
                lastRefusal = error instanceof Error ? error.name : String(error);
                if (error instanceof DOMException && error.name === "NotAllowedError") ownRefused = true;
              }).finally(() => { ownPending = false; });
            }
          } else if (!own.paused && !ownPending) {
            own.pause();
          }
        }
        if (probeRef.current && now - lastProbe > 250) {
          lastProbe = now;
          probeRef.current.textContent = `${sound ? sound.describe() : "no web audio"}\nvideo ${clip.paused ? "paused" : "playing"} ${clip.currentTime.toFixed(1)} · audio element ${!own || own.paused ? "off" : own.muted ? "muted" : "on"}${ownRefused ? " · refused" : ""}${lastRefusal ? ` · ${lastRefusal}` : ""} · mouth ${ratio.toFixed(2)} · level ${level.toFixed(2)}`;
        }

        if (renderer && cover) {
          if (clip.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !clip.seeking && clip.currentTime !== lastClipTime) {
            lastClipTime = clip.currentTime;
            renderer.setClip(clip);
          }
          const fade = Math.max(0, Math.min(1, (ratio - FADE_FROM) / (FADE_TO - FADE_FROM)));
          const open = lastClipTime < 0 ? 0 : fade * fade * (3 - 2 * fade);
          const clipAspect = clip.videoWidth > 0 ? clip.videoWidth / clip.videoHeight : 4 / 3;
          const step = lastDraw > 0 ? Math.min(1, (now - lastDraw) / NOSE_FADE) : 0;
          lastDraw = now;
          noseOn = Math.max(0, Math.min(1, noseOn + (nose.visible ? step : -step)));
          renderer.draw(cover, shape, open, clipAspect, LIES[lieAt(lastClipTime)].focus, pixelRatio, nose, noseOn, noseProbeRef.current);
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
      <video ref={clipRef} className={styles.source} src={REEL} playsInline muted loop preload="auto" aria-hidden="true" />
      <audio ref={ownRef} className={styles.source} src={REEL_SOUND} preload="none" aria-hidden="true" />
      <canvas ref={canvasRef} className={styles.image} aria-label="거울처럼 비친, 크게 확대된 입. 입을 벌리면 입술 사이로 정치인과 유명인의 거짓말 영상이 하나씩 보이고 들리며, 콧구멍 안에는 태극기가 보입니다" role="img" />
      {!entered && (
        // A tap anywhere on the intro enters; the arrow is the same tap for a keyboard.
        <div className={styles.intro} onClick={() => { setEntered(true); void start(); }}>
          <div className={styles.introBody}>
            <h1>입만 열면 거짓말</h1>
            <button type="button" aria-label="들어가기">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 12h15M13 5.5l6.5 6.5-6.5 6.5" />
              </svg>
            </button>
          </div>
          <a className={styles.credit} href="https://jeanyoon.ch/oi" target="_blank" rel="noopener noreferrer" onClick={(event) => event.stopPropagation()}>jeanyoon.ch/oi</a>
        </div>
      )}
      {entered && (phase === "idle" || phase === "error") && (
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
