"use client";

// O1 link: drag up or down to curl space into a smaller circle (one shared
// value, last phone wins, it stays after the phone leaves).

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { SpacetimeSnapshot } from "../../model";
import { useSpacetimeSocket } from "../../transport";
import { useSpacetimePreview } from "../stage";
import CompactView from "./view";

/** Fraction of the viewport height one full drag covers. */
const DRAG_SPAN = 0.5;
const KEY_STEP = 0.05;
const SEND_INTERVAL_MS = 33;

function clamp01(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

export default function SpacetimeCompactMobile() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshotRef = useRef<SpacetimeSnapshot | null>(null);
  const { state, sendCompactness } = useSpacetimeSocket({
    role: "mobile",
    onState: (next) => {
      snapshotRef.current = next;
    },
  });
  useSpacetimePreview(canvasRef, snapshotRef);
  const [compactness, setCompactness] = useState(0);
  const valueRef = useRef(0);
  const dragRef = useRef<{ pointerId: number; startY: number; startValue: number } | null>(null);
  const lastSentRef = useRef(0);

  useEffect(() => {
    if (!state || dragRef.current) return;
    valueRef.current = state.compactness;
    setCompactness(state.compactness);
  }, [state]);

  const publish = useCallback(
    (value: number, force = false) => {
      valueRef.current = value;
      setCompactness(value);
      const now = performance.now();
      if (force || now - lastSentRef.current >= SEND_INTERVAL_MS) {
        lastSentRef.current = now;
        sendCompactness(value);
      }
    },
    [sendCompactness],
  );

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = { pointerId: event.pointerId, startY: event.clientY, startValue: valueRef.current };
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const span = Math.max(1, window.innerHeight * DRAG_SPAN);
    publish(clamp01(drag.startValue + (drag.startY - event.clientY) / span));
  };

  const onPointerEnd = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    publish(valueRef.current, true);
  };

  return (
    <CompactView
      canvasRef={canvasRef}
      compactness={compactness}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerEnd={onPointerEnd}
      onStep={(direction) => publish(clamp01(valueRef.current + direction * KEY_STEP), true)}
    />
  );
}
