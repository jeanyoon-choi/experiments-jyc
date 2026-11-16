"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import { CATALOG, itemOf, SKIN_ITEM, UNIT, won, type Tool } from "./catalog";
import { buildSpecs, hitFace, measureFace, NOTHING, SKIN, type Face } from "./procedures";
import { createRenderer, type Renderer, type View } from "./renderer";
import { createSkin, pressSkin } from "./skin";
import { Instrument } from "./tools";
import { inverseWarp, resolveKernels, type Kernel, type Vec } from "./warp";
import styles from "./screen.module.css";

// Amount gained per second of pressing: about a second to see a part change,
// three to four to leave any normal face.
const RATE = 2.5;
const INSTRUMENTS = 3;

type Phase = "idle" | "loading" | "preview" | "reading" | "editing" | "error";

/** A held finger: what it operates on, and where it is, in canvas and CSS pixels. */
type Press = { target: number; x: number; y: number; left: number; top: number };

type Session = {
  photo: HTMLCanvasElement;
  face: Face;
  /** How long each procedure has been pressed, times `RATE`. */
  amounts: Float32Array;
  skin: Float32Array;
  skinAmount: number;
  kernels: Kernel[];
  /** The same procedure on the other side of the face, or -1. */
  twins: number[];
};

type Operating = { item: number; tool: Tool };

/** The bill: operations per catalogue row, and what is under the knife now. */
type Bill = { counts: number[]; operating: Operating[] };

const EMPTY_BILL: Bill = { counts: CATALOG.map(() => 0), operating: [] };

function loadLandmarker() {
  return FilesetResolver.forVisionTasks("/models/gaze-tracking/wasm").then((files) =>
    FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: "/models/gaze-tracking/face_landmarker.task" },
      runningMode: "IMAGE",
      numFaces: 1,
    }));
}

// The face fills the panel; the view stays inside the photo.
function viewOf(canvas: HTMLCanvasElement, session: Session): View {
  const aspect = canvas.width / canvas.height;
  const photoAspect = session.photo.width / session.photo.height;
  const height = Math.min(session.face.view.height, 1, photoAspect / aspect);
  const width = height * aspect;
  return {
    x: Math.min(Math.max(session.face.view.x, width / 2), photoAspect - width / 2),
    y: Math.min(Math.max(session.face.view.y, height / 2), 1 - height / 2),
    height,
  };
}

const toPhoto = (canvas: HTMLCanvasElement, view: View, x: number, y: number): Vec => ({
  x: view.x + (x - canvas.width / 2) / canvas.height * view.height,
  y: view.y + (y - canvas.height / 2) / canvas.height * view.height,
});

function operatingOf(session: Session, target: number): Operating {
  if (target === SKIN) return { item: SKIN_ITEM, tool: CATALOG[SKIN_ITEM].tool };
  const { index } = itemOf(session.face.procedures[target].id);
  return { item: index, tool: CATALOG[index].tool };
}

export default function PlasticDreamOne() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const beforeRef = useRef<HTMLCanvasElement>(null);
  const instrumentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rendererRef = useRef<Renderer | null>(null);
  const sessionRef = useRef<Session | null>(null);
  const pressesRef = useRef(new Map<number, Press>());
  const frameRef = useRef<number | null>(null);
  const lastRef = useRef(0);
  const billedRef = useRef(0);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<Promise<FaceLandmarker> | null>(null);
  const requestRef = useRef(0);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const [bill, setBill] = useState<Bill>(EMPTY_BILL);

  const stopCamera = useCallback(() => {
    requestRef.current += 1;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const session = sessionRef.current;
    if (!canvas || !session) return;
    rendererRef.current?.draw(session.face, session.kernels, viewOf(canvas, session));
  }, []);

  const writeBill = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;
    const counts = CATALOG.map(() => 0);
    // Both sides are operated together and billed as one operation.
    session.face.procedures.forEach((procedure, index) => {
      if (!procedure.id.endsWith("-b")) counts[itemOf(procedure.id).index] += session.amounts[index] / UNIT;
    });
    counts[SKIN_ITEM] = session.skinAmount / UNIT;
    const operating: Operating[] = [];
    for (const press of pressesRef.current.values()) operating.push(operatingOf(session, press.target));
    setBill({ counts, operating });
  }, []);

  // Each held finger carries an instrument, tip on the pressed point.
  const placeInstruments = useCallback(() => {
    const presses = [...pressesRef.current.values()];
    instrumentRefs.current.forEach((node, index) => {
      if (!node) return;
      const press = presses[index];
      node.style.display = press ? "block" : "none";
      if (press) node.style.transform = `translate(${press.left}px, ${press.top}px)`;
    });
  }, []);

  const tick = useCallback(function step(now: number) {
    frameRef.current = null;
    const canvas = canvasRef.current;
    const session = sessionRef.current;
    if (!canvas || !session) return;
    const gained = RATE * Math.min(0.05, Math.max(0, (now - lastRef.current) / 1000));
    lastRef.current = now;

    const held = new Set<number>();
    let pressedSkin = false;
    const view = viewOf(canvas, session);
    for (const press of pressesRef.current.values()) {
      if (press.target >= 0) {
        // One side pressed operates on both.
        held.add(press.target);
        if (session.twins[press.target] >= 0) held.add(session.twins[press.target]);
      } else if (press.target === SKIN) {
        // The skin is pressed where the finger is now, on the photo itself.
        const point = inverseWarp(session.kernels, session.face.frame, toPhoto(canvas, view, press.x, press.y));
        pressSkin(session.skin, point, session.face.skinRadius, session.photo.width / session.photo.height, gained);
        session.skinAmount += gained;
        pressedSkin = true;
      }
    }
    if (held.size > 0) {
      for (const target of held) session.amounts[target] += gained;
      session.kernels = resolveKernels(buildSpecs(session.face, session.amounts), session.face.frame);
    }
    if (pressedSkin) rendererRef.current?.setSkin(session.skin);
    draw();
    placeInstruments();
    const holding = pressesRef.current.size > 0;
    if (!holding || now - billedRef.current > 90) {
      billedRef.current = now;
      writeBill();
    }
    if (holding) frameRef.current = requestAnimationFrame(step);
  }, [draw, placeInstruments, writeBill]);

  // The WebGL surface lives for the whole visit; a lost context is rebuilt
  // from the photo and skin kept in the session.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "high-performance" });
    if (!gl) return;
    const initialize = () => {
      try {
        const renderer = createRenderer(gl);
        rendererRef.current = renderer;
        const session = sessionRef.current;
        if (session) {
          renderer.setPhoto(session.photo);
          renderer.setSkin(session.skin);
        }
      } catch (error) {
        console.error("Plastic dream renderer could not start", error);
        rendererRef.current = null;
      }
    };
    const resize = () => {
      const area = Math.max(1, canvas.clientWidth * canvas.clientHeight);
      const ratio = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4_000_000 / area));
      const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
      const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      draw();
    };
    const onLost = (event: Event) => {
      event.preventDefault();
      rendererRef.current = null;
    };
    const onRestored = () => {
      initialize();
      draw();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    initialize();
    resize();
    return () => {
      observer.disconnect();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
  }, [draw]);

  const start = async () => {
    stopCamera();
    const request = requestRef.current;
    setPhase("loading");
    setMessage("");
    try {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("카메라를 사용하려면 HTTPS가 필요합니다.");
      }
      landmarkerRef.current ??= loadLandmarker();
      landmarkerRef.current.catch(() => { landmarkerRef.current = null; });
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
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
      setPhase("preview");
    } catch (error) {
      if (request !== requestRef.current) return;
      stopCamera();
      setMessage(error instanceof Error ? error.message : "카메라를 시작할 수 없습니다.");
      setPhase("error");
    }
  };

  const shoot = async () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const request = requestRef.current;
    setMessage("");

    // The whole mirrored frame is kept; the panel then shows the face alone.
    const photo = document.createElement("canvas");
    photo.width = video.videoWidth;
    photo.height = video.videoHeight;
    const context = photo.getContext("2d");
    if (!context) return;
    context.translate(photo.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0);

    setPhase("reading");
    try {
      landmarkerRef.current ??= loadLandmarker();
      const landmarker = await landmarkerRef.current;
      if (request !== requestRef.current) return;
      const landmarks = landmarker.detect(photo).faceLandmarks[0];
      const face = landmarks && measureFace(landmarks, photo.width / photo.height);
      if (!face) {
        setMessage("얼굴을 찾지 못했습니다.");
        setPhase("preview");
        return;
      }
      stopCamera();
      landmarker.close();
      landmarkerRef.current = null;
      const skin = createSkin();
      const session: Session = {
        photo, face, amounts: new Float32Array(face.procedures.length), skin, skinAmount: 0, kernels: [],
        twins: face.procedures.map(({ id }) => face.procedures.findIndex((other) =>
          other.id !== id && other.id.slice(0, -1) === id.slice(0, -1) && /-[ab]$/.test(id))),
      };
      sessionRef.current = session;
      rendererRef.current?.setPhoto(photo);
      rendererRef.current?.setSkin(skin);
      draw();

      // The untouched face, kept beside the operated one.
      const canvas = canvasRef.current;
      const before = beforeRef.current?.getContext("2d");
      if (canvas && before) {
        const view = viewOf(canvas, session);
        const height = view.height * photo.height;
        const width = height * before.canvas.width / before.canvas.height;
        before.drawImage(
          photo,
          view.x * photo.height - width / 2,
          view.y * photo.height - height / 2,
          width,
          height,
          0,
          0,
          before.canvas.width,
          before.canvas.height,
        );
      }
      setBill(EMPTY_BILL);
      setPhase("editing");
    } catch {
      if (request !== requestRef.current) return;
      landmarkerRef.current = null;
      setMessage("얼굴을 읽을 수 없습니다.");
      setPhase("preview");
    }
  };

  const locate = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    const left = event.clientX - bounds.left;
    const top = event.clientY - bounds.top;
    return { left, top, x: left * canvas.width / bounds.width, y: top * canvas.height / bounds.height };
  };

  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const session = sessionRef.current;
    if (!session) return;
    const canvas = event.currentTarget;
    const place = locate(event);
    // What is pressed is what is seen: the screen point is walked back
    // through the current warp to the photo before it is matched.
    const point = inverseWarp(session.kernels, session.face.frame, toPhoto(canvas, viewOf(canvas, session), place.x, place.y));
    const target = hitFace(session.face, point);
    if (target === NOTHING) return;
    canvas.setPointerCapture(event.pointerId);
    pressesRef.current.set(event.pointerId, { target, ...place });
    if (frameRef.current === null) {
      lastRef.current = performance.now();
      frameRef.current = requestAnimationFrame(tick);
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const press = pressesRef.current.get(event.pointerId);
    if (press) Object.assign(press, locate(event));
  };

  const onPointerEnd = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!pressesRef.current.delete(event.pointerId)) return;
    placeInstruments();
    writeBill();
  };

  useEffect(() => {
    const presses = pressesRef.current;
    // Leaving during the preview releases the camera; a taken photo stays.
    const onVisibility = () => {
      if (!document.hidden) return;
      presses.clear();
      if (streamRef.current) {
        stopCamera();
        setPhase("idle");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", stopCamera);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", stopCamera);
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      presses.clear();
      stopCamera();
      landmarkerRef.current?.then((landmarker) => landmarker.close()).catch(() => {});
      landmarkerRef.current = null;
    };
  }, [stopCamera]);

  const editing = phase === "editing";
  const total = bill.counts.reduce((sum, count, index) => sum + count * CATALOG[index].price, 0);
  const operations = bill.counts.reduce((sum, count) => sum + count, 0);
  const now = bill.operating[0];
  return (
    <main className={styles.stage} onContextMenu={(event) => event.preventDefault()}>
      <div className={styles.board}>
        <header className={styles.head}>
          <p className={styles.where}><span><i>3</i>신사역 성형거리</span><span>5번 출구 도보 1분 ↗</span></p>
          <h1 className={styles.clinic}>플라스틱드림<em>성형외과</em></h1>
          <p className={styles.slogan}>누르는 만큼 예뻐집니다</p>
          <p className={styles.offer}>쌍꺼풀 <b>85</b>만 · 코 <b>184</b>만 · 윤곽 <b>218</b>만~</p>
        </header>

        <section className={styles.theatre}>
          <video
            ref={videoRef}
            className={`${styles.preview} ${phase === "preview" || phase === "reading" ? "" : styles.hidden}`}
            playsInline
            muted
            aria-hidden="true"
          />
          <canvas
            ref={canvasRef}
            className={`${styles.photo} ${editing ? "" : styles.hidden}`}
            role="img"
            aria-label="확대한 얼굴 사진. 눈, 코, 입, 턱, 광대, 이마, 피부를 누르고 있으면 그 부위만 수술한 것처럼 계속 변합니다"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onLostPointerCapture={onPointerEnd}
          />
          <figure className={`${styles.before} ${editing ? "" : styles.hidden}`}>
            <canvas ref={beforeRef} width={240} height={300} role="img" aria-label="수술 전 얼굴" />
            <figcaption>BEFORE</figcaption>
          </figure>
          {editing && <p className={styles.after}>AFTER</p>}
          {Array.from({ length: INSTRUMENTS }, (_, index) => (
            <div key={index} ref={(node) => { instrumentRefs.current[index] = node; }} className={styles.hand}>
              <Instrument tool={bill.operating[index]?.tool ?? "scalpel"} />
            </div>
          ))}
          {(phase === "idle" || phase === "error") && (
            <div className={styles.prompt}>
              {message && <p role="alert">{message}</p>}
              <button type="button" onClick={() => { void start(); }}>카메라 켜기</button>
            </div>
          )}
          {phase === "preview" && (
            <div className={styles.prompt}>
              {message && <p role="alert">{message}</p>}
              <button type="button" onClick={() => { void shoot(); }}>촬영</button>
            </div>
          )}
          {(phase === "loading" || phase === "reading") && (
            <p className={styles.status} role="status">{phase === "loading" ? "카메라 준비 중" : "얼굴을 읽는 중"}</p>
          )}
        </section>

        <footer className={styles.bill}>
          <p className={`${styles.now} ${now ? styles.live : ""}`} aria-live="off">
            {now ? (
              <>
                <span>수술 중</span>
                <strong>{CATALOG[now.item].label}</strong>
                <span>{won(CATALOG[now.item].price)}원 × {bill.counts[now.item].toFixed(1)}</span>
              </>
            ) : (
              <strong>원하는 부위를 꾹 누르고 계세요</strong>
            )}
          </p>
          <ul className={styles.rows}>
            {CATALOG.map((item, index) => (
              <li key={item.key} className={bill.counts[index] > 0 ? styles.done : ""}>
                <span>{item.label}</span>
                <span>×{bill.counts[index].toFixed(1)}</span>
                <span>{won(bill.counts[index] * item.price)}</span>
              </li>
            ))}
          </ul>
          <p className={styles.total}>
            <span>총 수술비<small>수술 {operations.toFixed(1)}회</small></span>
            <strong>{won(total)}<small>원</small></strong>
          </p>
          <p className={styles.fine}>VAT 별도 · 개인에 따라 결과가 다를 수 있습니다</p>
        </footer>
      </div>
    </main>
  );
}
