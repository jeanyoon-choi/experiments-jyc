"use client";

// moving-image/1 phone: the phone is the cut plane. While pressed, its rotation is
// applied to the shared plane in the plane's own frame (screen = cut, top =
// up), so held parallel to the projection it turns the slice the way the hand
// turns. Released, the plane stays. Without motion, dragging turns it.
// Contract: apps/xyt-cube/docs/moving-image/1.md

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { cubismClipId } from "../media";
import {
  bodyDelta,
  fromDeviceOrientation,
  IDENTITY,
  multiply,
  normalize,
  type Quaternion,
} from "../model";
import { dragDelta, solidCamera, useCubismCanvas, type CubismLayout } from "../render/use-cubism-canvas";
import { useCubismSocket } from "../transport";
import CubismMobileView, { type MotionPermission } from "./view";

type OrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const PREVIEW_PIXEL_RATIO = 2;
const SEND_INTERVAL_MS = 33;

const layout: CubismLayout = (width, height, half) => [
  { kind: "solid", viewport: [0, 0, width, height], camera: solidCamera(half, width / height) },
];

export default function CubismMobile() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { clip, receivedRef, turn, face } = useCubismSocket({ role: "mobile" });
  const { failure } = useCubismCanvas({
    canvasRef,
    receivedRef,
    clipId: cubismClipId(clip),
    level: "preview",
    layout,
    maxPixelRatio: PREVIEW_PIXEL_RATIO,
  });
  const [permission, setPermission] = useState<MotionPermission>("idle");
  const [holding, setHolding] = useState(false);
  const holdingRef = useRef(false);
  const previousRef = useRef<Quaternion | null>(null);
  const pendingRef = useRef<Quaternion>([...IDENTITY] as Quaternion);
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);

  const handleOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (event.alpha === null && event.beta === null && event.gamma === null) return;
    const next = fromDeviceOrientation(event.alpha, event.beta, event.gamma) as Quaternion;
    const previous = previousRef.current;
    previousRef.current = next;
    if (!holdingRef.current || !previous) return;
    pendingRef.current = normalize(multiply(pendingRef.current, bodyDelta(previous, next))) as Quaternion;
  }, []);

  const flush = useCallback(() => {
    const pending = pendingRef.current;
    if (Math.abs(pending[0]) > 1 - 1e-7) return;
    pendingRef.current = [...IDENTITY] as Quaternion;
    turn(pending);
  }, [turn]);

  useEffect(() => {
    const timer = window.setInterval(flush, SEND_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [flush]);

  useEffect(() => {
    const release = () => {
      holdingRef.current = false;
      setHolding(false);
    };
    const hide = () => {
      if (document.visibilityState === "hidden") release();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", release);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", release);
      window.removeEventListener("deviceorientation", handleOrientation);
    };
  }, [handleOrientation]);

  async function enableMotion() {
    if (!("DeviceOrientationEvent" in window)) {
      setPermission("unavailable");
      return;
    }
    const OrientationEvent = DeviceOrientationEvent as OrientationEventConstructor;
    if (OrientationEvent.requestPermission) {
      try {
        if ((await OrientationEvent.requestPermission()) !== "granted") {
          setPermission("denied");
          return;
        }
      } catch {
        setPermission("denied");
        return;
      }
    }
    window.addEventListener("deviceorientation", handleOrientation);
    setPermission("listening");
  }

  const onPointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // A pointer that is already gone cannot be captured; the drag still works.
    }
    if (permission === "listening") {
      holdingRef.current = true;
      setHolding(true);
      return;
    }
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    const box = event.currentTarget.getBoundingClientRect();
    const delta = dragDelta(event.clientX - drag.x, event.clientY - drag.y, Math.min(box.width, box.height));
    pendingRef.current = normalize(multiply(pendingRef.current, delta)) as Quaternion;
    drag.x = event.clientX;
    drag.y = event.clientY;
  };
  const onPointerEnd = () => {
    dragRef.current = null;
    if (!holdingRef.current) return;
    holdingRef.current = false;
    setHolding(false);
    flush();
  };

  return (
    <CubismMobileView
      canvasRef={canvasRef}
      permission={permission}
      holding={holding}
      failure={failure}
      onEnableMotion={enableMotion}
      onFace={face}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerEnd={onPointerEnd}
    />
  );
}
