"use client";

import { useEffect, useRef } from "react";
import { techFace3DStudy } from "../model/face-3d";

type FaceRenderer = import("../rendering/face-3d-atlas").Face3DAtlasRenderer;

let shared: FaceRenderer | null = null;
let consumers = 0;

export function TechFace3D({ index, inspect = false, active = true }: { index: number; inspect?: boolean; active?: boolean }) {
  const study = techFace3DStudy(index);
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<FaceRenderer | null>(null);
  const activeRef = useRef(active);

  useEffect(() => {
    activeRef.current = active;
    if (canvas.current) renderer.current?.update(canvas.current, active);
  }, [active]);

  useEffect(() => {
    const element = canvas.current;
    if (!element || !study) return;
    let cancelled = false;
    let attached: FaceRenderer | null = null;
    let importing = false;
    let inViewport = inspect;
    const observer = new ResizeObserver(() => renderer.current?.update(element, activeRef.current));
    observer.observe(element);
    const detach = () => {
      if (!attached) return;
      attached.detach(element); consumers--; attached = null; renderer.current = null;
      if (consumers === 0) { shared?.dispose(); shared = null; }
    };
    const attach = () => {
      if (cancelled || !inViewport || attached || importing) return;
      importing = true;
      // Rendering is code-split and viewport-lazy; off-screen faces allocate
      // no texture, and the 3D option has no photographic DOM underlay.
      void import("../rendering/face-3d-atlas").then(({ Face3DAtlasRenderer }) => {
        importing = false;
        if (cancelled || !inViewport) return;
        shared ??= new Face3DAtlasRenderer();
        attached = shared; consumers++; renderer.current = shared;
        shared.attach(element, index, activeRef.current, inspect);
      }).catch(() => { importing = false; element.dataset.face3dStatus = "fallback"; });
    };
    const visibility = inspect ? null : new IntersectionObserver((records) => {
      inViewport = Boolean(records[0]?.isIntersecting);
      if (inViewport) attach(); else detach();
    }, { rootMargin: "80px" });
    if (visibility) visibility.observe(element); else attach();
    return () => {
      cancelled = true; observer.disconnect(); renderer.current = null;
      visibility?.disconnect(); detach();
    };
  }, [index, inspect, study]);

  if (!study) return null;
  const label = `${study.name}, rotating volumetric portrait study. Drag or use arrow keys to adjust the turn.`;
  return <span style={{ position: "absolute", inset: 0, display: "block", overflow: "hidden", borderRadius: "50%", isolation: "isolate" }}>
    <canvas ref={canvas} data-tech-face-3d={index} data-face3d-status="loading" aria-hidden={!inspect}
      aria-label={inspect ? label : undefined} tabIndex={inspect ? 0 : undefined}
      onPointerDown={inspect ? (event) => event.currentTarget.setPointerCapture(event.pointerId) : undefined}
      onPointerMove={inspect ? (event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) renderer.current?.turn(event.currentTarget, event.movementX * 0.012, event.movementY * 0.012);
      } : undefined}
      onKeyDown={inspect ? (event) => {
        const delta: Record<string, [number, number]> = { ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, -0.12], ArrowDown: [0, 0.12] };
        const move = delta[event.key];
        if (move) { event.preventDefault(); renderer.current?.turn(event.currentTarget, ...move); }
      } : undefined}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", visibility: "hidden", touchAction: inspect ? "none" : undefined, cursor: inspect ? "grab" : undefined, pointerEvents: inspect ? "auto" : "none" }} />
  </span>;
}
