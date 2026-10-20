import { useEffect, useRef } from "react";
import type { TechEyeRenderer } from "../rendering/tech-eyeball-atlas";

let shared: TechEyeRenderer | null = null;
let consumers = 0;
let selectedBlinkSpeed = 0.7;

export function blinkAll3DEyes() { shared?.blinkAll(); }
export function set3DEyeBlinkSpeed(speed: number) {
  selectedBlinkSpeed = speed;
  shared?.setBlinkSpeed(speed);
}

export function TechEye3D({ index, active, gradient, inspect = false, blinking = false }: {
  index: number;
  active: boolean;
  gradient?: string;
  inspect?: boolean;
  blinking?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<TechEyeRenderer | null>(null);
  const activeRef = useRef(active);
  const blinkingRef = useRef(blinking);

  useEffect(() => {
    activeRef.current = active;
    blinkingRef.current = blinking;
    if (canvas.current) renderer.current?.update(canvas.current, active, blinking);
  }, [active, blinking]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let cancelled = false;
    let attached: TechEyeRenderer | null = null;
    const observer = new ResizeObserver(() => renderer.current?.update(element, activeRef.current, blinkingRef.current));
    observer.observe(element);
    // Load Three only when this mode is selected. The blink module is independent.
    void import("../rendering/tech-eyeball-atlas").then(({ TechEyeRenderer }) => {
      if (cancelled) return;
      if (!shared) {
        shared = new TechEyeRenderer();
        shared.setBlinkSpeed(selectedBlinkSpeed);
      }
      attached = shared;
      consumers++;
      renderer.current = shared;
      shared.attach(element, index, activeRef.current, inspect, blinkingRef.current);
    }).catch((error: unknown) => {
      element.dataset.eye3dStatus = "fallback";
      console.warn("[0922/tech-eye-3d] Photograph retained:", error);
    });
    return () => {
      cancelled = true;
      observer.disconnect();
      renderer.current = null;
      if (attached) {
        attached.detach(element);
        consumers--;
        if (consumers === 0) { attached.dispose(); shared = null; }
      }
    };
  }, [index, inspect]);

  return <span style={{ position: "absolute", inset: 0, isolation: "isolate", borderRadius: "50%", overflow: "hidden", pointerEvents: inspect ? "auto" : "none" }}>
    <canvas ref={canvas} data-tech-eye-3d={index} data-eye3d-status="loading" aria-hidden={!inspect}
      aria-label={inspect ? "3D eyeball study. Drag or use arrow keys to rotate." : undefined}
      tabIndex={inspect ? 0 : undefined}
      onPointerDown={inspect ? (event) => event.currentTarget.setPointerCapture(event.pointerId) : undefined}
      onPointerMove={inspect ? (event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) renderer.current?.turn(event.currentTarget, event.movementX * 0.012, event.movementY * 0.012);
      } : undefined}
      onKeyDown={inspect ? (event) => {
        const deltas: Record<string, [number, number]> = { ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, -0.12], ArrowDown: [0, 0.12] };
        const delta = deltas[event.key];
        if (delta) { event.preventDefault(); renderer.current?.turn(event.currentTarget, ...delta); }
      } : undefined}
      style={{ width: "100%", height: "100%", display: "block", visibility: "hidden", touchAction: inspect ? "none" : undefined, cursor: inspect ? "grab" : undefined }} />
    {gradient ? <span style={{ position: "absolute", inset: 0, background: gradient, mixBlendMode: "color" }} /> : null}
  </span>;
}
