"use client";

// O3 link: press on the live picture to place a mass there. It grows while
// held and stays after release; clocks near it run slow and the lag never decays.

import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { SpacetimeSnapshot } from "../../model";
import { clipPointAt } from "../../render/use-spacetime-canvas";
import { useSpacetimeSocket } from "../../transport";
import { useSpacetimePreview } from "../stage";
import MassView from "./view";

const SEND_INTERVAL_MS = 33;

export default function SpacetimeMassMobile() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshotRef = useRef<SpacetimeSnapshot | null>(null);
  const { state, pressMass, moveMass, releaseMass } = useSpacetimeSocket({
    role: "mobile",
    onState: (next) => {
      snapshotRef.current = next;
    },
  });
  const { viewRef } = useSpacetimePreview(canvasRef, snapshotRef);
  const pointerRef = useRef<number | null>(null);
  const lastSentRef = useRef(0);

  const release = useCallback(() => {
    if (pointerRef.current === null) return;
    pointerRef.current = null;
    releaseMass();
  }, [releaseMass]);

  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === "hidden") release();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", release);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", release);
      release();
    };
  }, [release]);

  const pointOf = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const view = viewRef.current;
    if (!view) return null;
    const box = event.currentTarget.getBoundingClientRect();
    return clipPointAt(view, box.width, box.height, event.clientX - box.left, event.clientY - box.top);
  };

  const holding = state?.masses.some((mass) => mass.holding) ?? false;

  return (
    <MassView
      canvasRef={canvasRef}
      massCount={state?.masses.length ?? 0}
      holding={holding}
      onPointerDown={(event) => {
        const point = pointOf(event);
        if (!point) return;
        event.currentTarget.setPointerCapture?.(event.pointerId);
        pointerRef.current = event.pointerId;
        pressMass(point.u, point.v);
      }}
      onPointerMove={(event) => {
        if (pointerRef.current !== event.pointerId) return;
        const now = performance.now();
        if (now - lastSentRef.current < SEND_INTERVAL_MS) return;
        const point = pointOf(event);
        if (!point) return;
        lastSentRef.current = now;
        moveMass(point.u, point.v);
      }}
      onPointerEnd={(event) => {
        if (pointerRef.current === event.pointerId) release();
      }}
    />
  );
}
