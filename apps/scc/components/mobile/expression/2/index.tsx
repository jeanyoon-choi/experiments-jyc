"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import { createChatStore } from "./director/chat";
import { createDirector } from "./director/director";
import { emptyLevels, emptyMeasures, readTriggers, TRIGGERS, type Signals, type Trigger } from "./director/triggers";
import { KakaoApp } from "./kakao/app";
import { loadFaceAssets } from "./sensing/assets";
import { createExpressionReader, READINGS } from "./sensing/reader";
import styles from "./screen.module.css";

const INFERENCE_WIDTH = 640;
const INFERENCE_INTERVAL = 50;
const STEP_MS = 100;
const READING_INDEX = new Map(READINGS.map((spec, position) => [spec.id, position]));

// `?sim`: hold a key to act out a situation without a camera.
const SIM_KEYS: Record<string, Trigger> = {
  "1": "smile", "2": "fake", "3": "laugh", "4": "blank", "5": "frown", "6": "angry", "7": "sad", "8": "disgust",
  "9": "smirk", "0": "surprise", q: "tilt", w: "turn", e: "down", r: "shut", t: "nervous", y: "close", u: "cute",
  i: "talk", o: "gone",
};

type CameraState = "starting" | "on" | "off" | "error";

export default function ExpressionTwo() {
  const [store] = useState(() => createChatStore());
  const [director] = useState(() => createDirector(store));
  const signalsRef = useRef<Signals>({ present: false, levels: emptyLevels(), measures: emptyMeasures() });
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const frameRef = useRef<number | null>(null);
  const requestRef = useRef(0);
  const startingRef = useRef(false);
  const grantedRef = useRef(false);
  const startRef = useRef<() => void>(() => {});
  const [camera, setCamera] = useState<CameraState>("starting");
  const [message, setMessage] = useState("");
  const [simulated, setSimulated] = useState(false);

  const stop = useCallback(() => {
    requestRef.current += 1;
    startingRef.current = false;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    landmarkerRef.current?.close();
    landmarkerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const start = async () => {
    if (startingRef.current || streamRef.current) return;
    stop();
    startingRef.current = true;
    const request = requestRef.current;
    setCamera("starting");
    setMessage("");
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new Error("카메라를 사용하려면 HTTPS가 필요합니다.");
      const assets = loadFaceAssets();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } },
      });
      if (request !== requestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) throw new Error("카메라를 준비할 수 없습니다.");
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
      setCamera("on");

      const reader = createExpressionReader();
      const get = (id: string) => reader.values[READING_INDEX.get(id) ?? 0] ?? 0;
      const inference = document.createElement("canvas");
      inference.width = INFERENCE_WIDTH;
      const context = inference.getContext("2d", { willReadFrequently: true });
      if (!context) throw new Error("얼굴 추적을 준비할 수 없습니다.");
      let lastVideoTime = -1;
      let lastInference = 0;
      let lastFace = 0;
      const tick = () => {
        if (request !== requestRef.current) return;
        const now = performance.now();
        if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && video.currentTime !== lastVideoTime && now - lastInference >= INFERENCE_INTERVAL) {
          lastVideoTime = video.currentTime;
          lastInference = now;
          try {
            const height = Math.max(1, Math.round(video.videoHeight * INFERENCE_WIDTH / video.videoWidth));
            if (inference.height !== height) inference.height = height;
            context.drawImage(video, 0, 0, inference.width, inference.height);
            const result = landmarker.detectForVideo(inference, now);
            const found = reader.update({
              blendshapes: result.faceBlendshapes[0]?.categories,
              landmarks: result.faceLandmarks[0],
              matrix: result.facialTransformationMatrixes?.[0]?.data,
              width: inference.width,
              height: inference.height,
            }, now);
            if (found) lastFace = now;
            else if (now - lastFace > 600) reader.lose(now);
            const present = lastFace > 0 && now - lastFace < 600;
            // Until the neutral baseline is set, the face is seen but not read.
            signalsRef.current = present && !reader.calibrated()
              ? { present: true, levels: emptyLevels(), measures: emptyMeasures() }
              : readTriggers(get, present, lastFace ? now - lastFace : 0);
          } catch {
            stop();
            setMessage("얼굴 추적을 계속할 수 없습니다.");
            setCamera("error");
            return;
          }
        }
        frameRef.current = requestAnimationFrame(tick);
      };
      frameRef.current = requestAnimationFrame(tick);
    } catch (error) {
      if (request !== requestRef.current) return;
      stop();
      setMessage(error instanceof Error ? error.message : "카메라를 시작할 수 없습니다.");
      setCamera("error");
    }
  };

  useEffect(() => {
    startRef.current = () => { void start(); };
  });

  // The camera opens with the page; the director runs whether or not a face
  // has been read yet.
  useEffect(() => {
    const sim = new URLSearchParams(window.location.search).has("sim");
    const held = new Set<Trigger>();
    const levels = emptyLevels();
    let timer: number | null = null;
    const run = () => {
      if (sim) {
        for (const trigger of TRIGGERS) {
          const target = held.has(trigger) ? 1 : 0;
          levels[trigger] += (target - levels[trigger]) * (target ? 0.35 : 0.25);
        }
        signalsRef.current = {
          present: !held.has("gone"),
          levels: { ...levels },
          measures: { ...emptyMeasures(), smileHeld: levels.smile * 3.4, tiltDeg: levels.tilt * 17, turnDeg: levels.turn * 28, blinkRate: 12 + levels.nervous * 30, blinks: 40, stillness: 6, asymmetry: 0.11, faceFill: 0.3 + levels.close * 0.3 },
        };
      }
      if (!document.hidden) director.step(signalsRef.current, performance.now(), Date.now());
    };
    timer = window.setInterval(run, STEP_MS);
    const typing = (target: EventTarget | null) => target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement;
    const down = (event: KeyboardEvent) => {
      const trigger = SIM_KEYS[event.key.toLowerCase()];
      if (sim && trigger && !typing(event.target)) held.add(trigger);
    };
    const up = (event: KeyboardEvent) => {
      const trigger = SIM_KEYS[event.key.toLowerCase()];
      if (trigger) held.delete(trigger);
    };
    if (sim) {
      window.addEventListener("keydown", down);
      window.addEventListener("keyup", up);
    }
    const kickoff = window.setTimeout(() => {
      if (sim) {
        setSimulated(true);
        return;
      }
      startRef.current();
    }, 0);
    const onVisibility = () => {
      if (sim) return;
      if (document.hidden) stop();
      else if (grantedRef.current) startRef.current();
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", stop);
    return () => {
      if (timer !== null) window.clearInterval(timer);
      window.clearTimeout(kickoff);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", stop);
      stop();
    };
  }, [director, stop]);

  return (
    <main className={styles.stage}>
      <video ref={videoRef} className={styles.source} playsInline muted aria-hidden="true" />
      <KakaoApp store={store} onSend={(roomId, text) => director.reply(roomId, text, performance.now(), Date.now())} />
      {!simulated && (camera === "error" || camera === "off") && (
        <div className={styles.sheet} role="dialog" aria-label="카메라">
          {message && <p>{message}</p>}
          <button type="button" onClick={() => { void start(); }}>카메라 켜기</button>
        </div>
      )}
    </main>
  );
}
