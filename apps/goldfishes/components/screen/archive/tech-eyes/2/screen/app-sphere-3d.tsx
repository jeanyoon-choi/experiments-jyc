"use client";

import { useEffect, useRef } from "react";
import { appServiceAt, AppServiceMark } from "./app-service-mark";

type Renderer = import("../rendering/app-spheres-3d").AppSpheres3DRenderer;
let shared: Renderer | null = null;
let consumers = 0;
let rendererModule: Promise<typeof import("../rendering/app-spheres-3d")> | null = null;

export function AppSphere3D({ index, active = true, inspect = false }: { index: number; active?: boolean; inspect?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<Renderer | null>(null);
  const activeRef = useRef(active);
  const visible = useRef(inspect);
  const service = appServiceAt(index);

  useEffect(() => {
    activeRef.current = active;
    if (canvas.current) renderer.current?.update(canvas.current, active, visible.current);
  }, [active]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let cancelled = false;
    let attached: Renderer | null = null;
    let loading = false;
    const attach = () => {
      if (cancelled || !visible.current || attached || loading) return;
      loading = true;
      rendererModule ??= import("../rendering/app-spheres-3d");
      void rendererModule.then(({ AppSpheres3DRenderer }) => {
        loading = false;
        if (cancelled || !visible.current) return;
        shared ??= new AppSpheres3DRenderer();
        attached = shared; consumers++; renderer.current = shared;
        shared.attach(element, index, activeRef.current, true, inspect);
      }).catch(() => { loading = false; element.dataset.app3dStatus = "fallback"; });
    };
    const observer = inspect ? null : new IntersectionObserver(([entry]) => {
      visible.current = Boolean(entry?.isIntersecting);
      if (visible.current) attach();
      attached?.update(element, activeRef.current, visible.current);
    }, { rootMargin: "80px" });
    if (observer) observer.observe(element); else attach();
    return () => {
      cancelled = true; observer?.disconnect(); renderer.current = null;
      if (attached) {
        attached.detach(element); consumers--;
        if (consumers === 0) { attached.dispose(); shared = null; }
      }
    };
  }, [index, inspect]);

  return <span style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "50%", isolation: "isolate" }}>
    <AppServiceMark index={index} />
    <canvas ref={canvas} data-app-sphere-3d={service.name} data-app3d-status="loading"
      aria-hidden={!inspect}
      aria-label={inspect ? `${service.name} spherical icon. Drag or use arrow keys to rotate.` : undefined}
      tabIndex={inspect ? 0 : undefined}
      onPointerDown={inspect ? (event) => event.currentTarget.setPointerCapture(event.pointerId) : undefined}
      onPointerMove={inspect ? (event) => {
        if (event.currentTarget.hasPointerCapture(event.pointerId)) renderer.current?.turn(event.currentTarget, event.movementX * 0.012, event.movementY * 0.012);
      } : undefined}
      onKeyDown={inspect ? (event) => {
        const turns: Record<string, [number, number]> = { ArrowLeft: [-0.12, 0], ArrowRight: [0.12, 0], ArrowUp: [0, -0.12], ArrowDown: [0, 0.12] };
        const turn = turns[event.key];
        if (turn) { event.preventDefault(); renderer.current?.turn(event.currentTarget, ...turn); }
      } : undefined}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block", visibility: "hidden", pointerEvents: inspect ? "auto" : "none", touchAction: inspect ? "none" : undefined, cursor: inspect ? "grab" : undefined }} />
  </span>;
}
