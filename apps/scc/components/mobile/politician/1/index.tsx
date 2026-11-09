"use client";

import { useEffect, useRef, useState } from "react";
import { createPoliticianField, type FieldState } from "./field";
import { CHOO_LANDMARKS, JOO_LANDMARKS } from "./landmarks";
import { buildDisplacement } from "./morph";
import styles from "./screen.module.css";

type Mode = FieldState["mode"];

const MODES: readonly { id: Mode; label: string }[] = [
  { id: "face", label: "얼굴" },
  { id: "lattice", label: "격자" },
];

const PORTRAITS = {
  joo: "/images/politician/1/joo-ho-young.jpg",
  choo: "/images/politician/1/choo-mi-ae.jpg",
} as const;

// Before the first touch the composite breathes between the two faces.
const IDLE_SPREAD = 1;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

export default function PoliticianOne() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef<Mode>("face");
  const [mode, setMode] = useState<Mode>("face");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const gl = canvas.getContext("webgl2", { alpha: false, antialias: false, powerPreference: "high-performance" });
    if (!gl) return;

    let field: ReturnType<typeof createPoliticianField>;
    try {
      field = createPoliticianField(gl, buildDisplacement(JOO_LANDMARKS, CHOO_LANDMARKS));
    } catch (error) {
      console.error(error);
      return;
    }

    let mounted = true;
    for (const which of ["joo", "choo"] as const) {
      void loadImage(PORTRAITS[which]).then(
        (image) => mounted && field.setPortrait(which, image),
        () => undefined,
      );
    }

    // Finger: x sets who leads (left 추미애, right 주호영), y sets how far the
    // sites disagree (top: a patchwork of both, bottom: one even blend).
    const finger = { id: -1, x: 0.5, y: 0.5, touched: false };
    const eased = { bias: 0.5, spread: IDLE_SPREAD, lens: 0 };
    const toUnit = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect();
      finger.x = Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width));
      finger.y = Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height));
    };
    const down = (event: PointerEvent) => {
      if (finger.id !== -1) return;
      finger.id = event.pointerId;
      finger.touched = true;
      canvas.setPointerCapture(event.pointerId);
      toUnit(event);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerId === finger.id) toUnit(event);
    };
    const up = (event: PointerEvent) => {
      if (event.pointerId === finger.id) finger.id = -1;
    };
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", up);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let quality = 1;
    let slow = 0;
    let fast = 0;
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      field.resize(Math.max(1, bounds.width), Math.max(1, bounds.height), quality);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    let frame = 0;
    let last = performance.now();
    let clock = 0;
    const render = (now: number) => {
      const delta = Math.min(0.1, (now - last) / 1000);
      // Frame-time fallback: step resolution down after sustained slow frames,
      // back up after a long run of fast ones.
      if (delta > 0.034) slow += 1;
      else if (delta < 0.02) fast += 1;
      if (slow > 30 && quality > 0.5) {
        quality = Math.max(0.5, quality * 0.85);
        slow = 0;
        fast = 0;
        resize();
      } else if (fast > 240 && quality < 1) {
        quality = Math.min(1, quality / 0.85);
        slow = 0;
        fast = 0;
        resize();
      }
      last = now;
      if (!reducedMotion.matches) clock += delta;

      const targetBias = finger.touched ? 1 - finger.x : 0.5 + 0.38 * Math.sin(clock * 0.22);
      const targetSpread = finger.touched ? 2 * (1 - finger.y) : IDLE_SPREAD;
      const follow = 1 - Math.exp(-delta * 5);
      eased.bias += (targetBias - eased.bias) * follow;
      eased.spread += (targetSpread - eased.spread) * follow;
      eased.lens += ((finger.id !== -1 ? 1 : 0) - eased.lens) * (1 - Math.exp(-delta * (finger.id !== -1 ? 8 : 1.5)));

      field.draw({
        time: clock,
        bias: eased.bias,
        spread: eased.spread,
        mode: modeRef.current,
        lens: [finger.x, finger.y],
        lensStrength: eased.lens,
      });
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);

    return () => {
      mounted = false;
      cancelAnimationFrame(frame);
      observer.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", up);
      field.destroy();
    };
  }, []);

  const select = (next: Mode) => {
    modeRef.current = next;
    setMode(next);
  };

  return (
    <main className={styles.stage}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        role="img"
        aria-label="주호영과 추미애의 얼굴이 움직이는 보로노이 격자 안에서 합성된다. 손가락을 왼쪽으로 끌면 추미애, 오른쪽으로 끌면 주호영 쪽으로 기울고, 위로 갈수록 두 얼굴이 조각조각 섞인다."
      />
      <div className={styles.control}>
        {open && (
          <div id="politician-options" className={styles.panel} role="group" aria-label="합성">
            <p className={styles.heading}>합성</p>
            <div className={styles.chips} role="group" aria-label="합성 방식">
              {MODES.map((option) => (
                <button key={option.id} type="button" aria-pressed={mode === option.id} onClick={() => select(option.id)}>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
        <button
          type="button"
          className={styles.trigger}
          aria-label="합성 옵션"
          aria-expanded={open}
          aria-controls="politician-options"
          onClick={() => setOpen((current) => !current)}
        >
          <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
            <circle cx="7.5" cy="10" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="12.5" cy="10" r="4.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
          </svg>
        </button>
      </div>
    </main>
  );
}
