"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { FaceLandmarker, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { loadFaceAssets } from "./assets";
import { createExpressionReader, formatReading, READINGS, type ExpressionReader } from "./reader";
import styles from "./screen.module.css";

type Phase = "idle" | "loading" | "seeking" | "calibrating" | "tracking" | "error";

const INFERENCE_WIDTH = 640;
const INFERENCE_INTERVAL = 45;
const LOST_AFTER = 600;

// Readings run down each column in group order, a blank cell between groups.
const CELLS = READINGS.flatMap((spec, position) => (
  position > 0 && READINGS[position - 1].group !== spec.group
    ? [{ key: `gap-${spec.group}`, position: -1 }, { key: spec.id, position }]
    : [{ key: spec.id, position }]
));

function drawLandmarks(canvas: HTMLCanvasElement, points: NormalizedLandmark[] | null) {
  const context = canvas.getContext("2d");
  if (!context) return;
  context.clearRect(0, 0, canvas.width, canvas.height);
  if (!points) return;
  const size = Math.max(1.5, canvas.width / 400);
  context.fillStyle = "rgba(255, 255, 255, 0.7)";
  for (const point of points) {
    context.fillRect(point.x * canvas.width - size / 2, point.y * canvas.height - size / 2, size, size);
  }
}

export default function ExpressionOne() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const meshRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<(HTMLDivElement | null)[]>([]);
  const valueRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const readerRef = useRef<ExpressionReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const frameRef = useRef<number | null>(null);
  const requestRef = useRef(0);
  const startingRef = useRef(false);
  const grantedRef = useRef(false);
  const startRef = useRef<() => void>(() => {});
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [columns, setColumns] = useState(3);

  const paintReadings = useCallback(() => {
    const reader = readerRef.current;
    if (!reader) return;
    for (let position = 0; position < READINGS.length; position += 1) {
      const cell = cellRefs.current[position];
      const value = valueRefs.current[position];
      if (!cell || !value) continue;
      const text = formatReading(READINGS[position], reader.values[position]);
      if (value.textContent !== text) value.textContent = text;
      cell.style.setProperty("--v", reader.weights[position].toFixed(3));
      const on = reader.on[position] ? "true" : "false";
      if (cell.dataset.on !== on) cell.dataset.on = on;
    }
  }, []);

  const stop = useCallback((update = true) => {
    requestRef.current += 1;
    startingRef.current = false;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (meshRef.current) drawLandmarks(meshRef.current, null);
    if (update) setPhase("idle");
  }, []);

  const start = async () => {
    if (startingRef.current || streamRef.current) return;
    stop(false);
    startingRef.current = true;
    const request = requestRef.current;
    setPhase("loading");
    setMessage("");

    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("카메라를 사용하려면 HTTPS가 필요합니다.");
      }
      // Usually already warm from page open; the camera prompt runs alongside.
      const assets = loadFaceAssets();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30, max: 30 } },
      });
      if (request !== requestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("카메라 화면을 준비할 수 없습니다.");
      video.srcObject = stream;
      await video.play();
      if (request !== requestRef.current) return;
      grantedRef.current = true;

      const { vision, fileset, model } = await assets;
      if (request !== requestRef.current) return;
      const landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetBuffer: model.slice() },
        runningMode: "VIDEO",
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
      });
      if (request !== requestRef.current) {
        landmarker.close();
        return;
      }
      landmarkerRef.current = landmarker;
      startingRef.current = false;
      readerRef.current ??= createExpressionReader();
      const reader = readerRef.current;
      setPhase("seeking");

      const inference = document.createElement("canvas");
      inference.width = INFERENCE_WIDTH;
      const inferenceContext = inference.getContext("2d", { willReadFrequently: true });
      if (!inferenceContext) throw new Error("얼굴 추적 화면을 준비할 수 없습니다.");
      let lastVideoTime = -1;
      let lastInference = 0;
      let lastFace = 0;

      const tick = () => {
        if (request !== requestRef.current) return;
        const now = performance.now();
        if (
          video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          video.currentTime !== lastVideoTime &&
          now - lastInference >= INFERENCE_INTERVAL &&
          !document.hidden
        ) {
          lastVideoTime = video.currentTime;
          lastInference = now;
          try {
            const height = Math.max(1, Math.round(video.videoHeight * INFERENCE_WIDTH / video.videoWidth));
            if (inference.height !== height) inference.height = height;
            inferenceContext.drawImage(video, 0, 0, inference.width, inference.height);
            const result = landmarker.detectForVideo(inference, now);
            const points = result.faceLandmarks[0] ?? null;
            const mesh = meshRef.current;
            if (mesh) {
              if (mesh.width !== inference.width || mesh.height !== inference.height) {
                mesh.width = inference.width;
                mesh.height = inference.height;
              }
              drawLandmarks(mesh, points);
            }
            const found = reader.update({
              blendshapes: result.faceBlendshapes[0]?.categories,
              landmarks: points ?? undefined,
              matrix: result.facialTransformationMatrixes?.[0]?.data,
              width: inference.width,
              height: inference.height,
            }, now);
            if (found) lastFace = now;
            else if (now - lastFace > LOST_AFTER) reader.lose(now);
            paintReadings();
            const next: Phase = !lastFace || now - lastFace > LOST_AFTER
              ? "seeking"
              : reader.calibrated() ? "tracking" : "calibrating";
            setPhase((current) => current === next ? current : next);
          } catch {
            stop(false);
            setMessage("얼굴 추적을 계속할 수 없습니다.");
            setPhase("error");
            return;
          }
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

  // Fetch the model while the page waits for the tap.
  useEffect(() => {
    loadFaceAssets().catch(() => {});
  }, []);

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
    };
  }, [stop]);

  // Three columns on a portrait phone, more as the screen widens.
  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const resize = () => {
      const ratio = grid.clientWidth / Math.max(1, grid.clientHeight);
      setColumns(ratio < 0.8 ? 3 : ratio < 1.3 ? 4 : ratio < 1.9 ? 5 : 6);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(grid);
    resize();
    return () => observer.disconnect();
  }, []);

  const recalibrate = () => {
    if (phase !== "tracking" && phase !== "calibrating") return;
    readerRef.current?.recalibrate();
  };

  const rows = Math.ceil(CELLS.length / columns);

  return (
    <main className={styles.stage} onClick={recalibrate}>
      <video ref={videoRef} className={styles.video} playsInline muted aria-hidden="true" />
      <canvas ref={meshRef} className={styles.mesh} aria-hidden="true" />
      <div
        ref={gridRef}
        className={styles.grid}
        style={{ "--columns": columns, "--rows": rows } as CSSProperties}
        aria-live="off"
      >
        {CELLS.map((cell) => cell.position < 0 ? (
          <div key={cell.key} className={styles.gap} aria-hidden="true" />
        ) : (
          <div
              key={cell.key}
              ref={(element) => { cellRefs.current[cell.position] = element; }}
              className={styles.cell}
              data-group={READINGS[cell.position].group}
              data-on="false"
            >
              <span className={styles.label}>{READINGS[cell.position].label}</span>
              <span ref={(element) => { valueRefs.current[cell.position] = element; }} className={styles.value}>–</span>
          </div>
        ))}
      </div>
      {(phase === "idle" || phase === "error") && (
        <div className={styles.prompt}>
          {message && <p role="alert">{message}</p>}
          <button type="button" onClick={(event) => { event.stopPropagation(); void start(); }}>카메라 켜기</button>
        </div>
      )}
      {(phase === "loading" || phase === "seeking" || phase === "calibrating") && (
        <p className={styles.status} role="status">
          {phase === "loading" ? "카메라 준비 중" : phase === "seeking" ? "얼굴을 찾는 중" : "무표정으로 잠시"}
        </p>
      )}
    </main>
  );
}
