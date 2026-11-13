"use client";

import { useEffect, useRef } from "react";
import { snsActionAt, type SnsActionColour } from "../model/sns-actions";
import { SnsActionIcon } from "./sns-action-icon";

type Renderer = import("../rendering/sns-icons-3d").SnsIcons3DRenderer;
let shared: Renderer | null = null;
let consumers = 0;
let rendererModule: Promise<typeof import("../rendering/sns-icons-3d")> | null = null;

export function SnsIcon3D({ index, colour, active, inspect = false }: {
  index: number;
  colour: SnsActionColour;
  active: boolean;
  inspect?: boolean;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const renderer = useRef<Renderer | null>(null);
  const activeRef = useRef(active);
  const colourRef = useRef(colour);
  const visibleRef = useRef(inspect);
  const action = snsActionAt(index);

  useEffect(() => {
    activeRef.current = active;
    colourRef.current = colour;
    if (canvas.current) renderer.current?.update(canvas.current, colour, active && visibleRef.current, visibleRef.current);
  }, [active, colour]);

  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    let cancelled = false;
    let attached: Renderer | null = null;
    let loading = false;
    const attach = () => {
      if (cancelled || !visibleRef.current || attached || loading) return;
      loading = true;
      rendererModule ??= import("../rendering/sns-icons-3d");
      void rendererModule.then(({ SnsIcons3DRenderer }) => {
        loading = false;
        if (cancelled || !visibleRef.current) return;
        shared ??= new SnsIcons3DRenderer();
        attached = shared; consumers++; renderer.current = shared;
        shared.attach(element, index, colourRef.current, activeRef.current, true, inspect);
      }).catch(() => { loading = false; element.dataset.icons3dStatus = "fallback"; });
    };
    const intersection = inspect ? null : new IntersectionObserver(([entry]) => {
      visibleRef.current = Boolean(entry?.isIntersecting);
      if (visibleRef.current) attach();
      if (attached) attached.update(element, colourRef.current, activeRef.current && visibleRef.current, visibleRef.current);
    }, { rootMargin: "80px" });
    if (intersection) intersection.observe(element); else attach();
    return () => {
      cancelled = true; intersection?.disconnect(); renderer.current = null;
      if (attached) {
        attached.detach(element); consumers--;
        if (consumers === 0) { attached.dispose(); shared = null; }
      }
    };
  }, [index, inspect]);

  return (
    <span style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", overflow: "hidden", borderRadius: "50%", isolation: "isolate" }}>
      <SnsActionIcon index={index} />
      <canvas
        ref={canvas}
        data-sns-icon-3d={action.id}
        data-icons3d-status="loading"
        aria-hidden={!inspect}
        aria-label={inspect ? `${action.label}, three-dimensional icon. Drag or use arrow keys to rotate.` : undefined}
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
        style={{ position: "absolute", inset: 0, display: "block", width: "100%", height: "100%", visibility: "hidden", pointerEvents: inspect ? "auto" : "none", touchAction: inspect ? "none" : undefined, cursor: inspect ? "grab" : undefined }}
      />
    </span>
  );
}
