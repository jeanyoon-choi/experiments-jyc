import { useEffect, useRef } from "react";
import type { Lips3DRenderer } from "../rendering/lips-3d-atlas";

let shared: Lips3DRenderer | null = null;
let consumers = 0;

/** Source index 0–79 maps to `lips3DStudies` and the original tech story. */
export function TechLips3D({ index, inspect = false, active = true }: { index: number; inspect?: boolean; active?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<Lips3DRenderer | null>(null);
  const activeRef = useRef(active);
  const visible = useRef(inspect);
  useEffect(() => { activeRef.current = active; if (canvas.current) renderer.current?.update(canvas.current, active && visible.current); }, [active]);
  useEffect(() => {
    const element = canvas.current; if (!element) return;
    let cancelled = false, attached: Lips3DRenderer | null = null;
    const observer = new ResizeObserver(() => renderer.current?.update(element, activeRef.current && visible.current)); observer.observe(element);
    const intersection = inspect ? null : new IntersectionObserver(([entry]) => { visible.current = Boolean(entry?.isIntersecting); renderer.current?.update(element, activeRef.current && visible.current); }, { rootMargin: "96px" });
    intersection?.observe(element);
    void import("../rendering/lips-3d-atlas").then(({ Lips3DRenderer }) => {
      if (cancelled) return;
      shared ??= new Lips3DRenderer(); attached = shared; consumers++; renderer.current = shared;
      shared.attach(element, index, inspect ? activeRef.current : activeRef.current && visible.current, inspect);
    }).catch((error: unknown) => { element.dataset.lips3dStatus = "fallback"; console.warn("[0922/lips-3d] V2 crop retained:", error); });
    return () => { cancelled = true; observer.disconnect(); intersection?.disconnect(); renderer.current = null; if (attached) { attached.detach(element); consumers--; if (consumers === 0) { attached.dispose(); shared = null; } } };
  }, [index, inspect]);
  return <span style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden", isolation: "isolate", pointerEvents: inspect ? "auto" : "none" }}>
    <canvas ref={canvas} data-lips-3d={index} data-lips3d-status="loading" aria-hidden={!inspect} aria-label={inspect ? "Three-dimensional lip study. Drag or use arrow keys to rotate." : undefined} tabIndex={inspect ? 0 : undefined}
      onPointerDown={inspect ? (event) => event.currentTarget.setPointerCapture(event.pointerId) : undefined}
      onPointerMove={inspect ? (event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) renderer.current?.turn(event.currentTarget, event.movementX * .012, event.movementY * .012); } : undefined}
      onKeyDown={inspect ? (event) => { const delta: Record<string, [number, number]> = { ArrowLeft: [-.12, 0], ArrowRight: [.12, 0], ArrowUp: [0, -.12], ArrowDown: [0, .12] }; const movement = delta[event.key]; if (movement) { event.preventDefault(); renderer.current?.turn(event.currentTarget, ...movement); } } : undefined}
      style={{ display: "block", width: "100%", height: "100%", visibility: "hidden", touchAction: inspect ? "none" : undefined, cursor: inspect ? "grab" : undefined }} />
  </span>;
}
