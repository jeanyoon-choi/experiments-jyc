"use client";

// cubism/2 phone: the phone bends the cube. While pressed, its tilt since the
// last reading (left–right, front–back) is added to the current operation's
// amount; released, the cube stays bent. Without motion, dragging bends it.
// The view shows the bent cube and the flat present plane through it.
// Contract: apps/xyt-cube/docs/cubism/2.md

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { cubismClipId } from "../media";
import { OPERATION_SPECS, type BendAmount, type BendOperation } from "../model";
import { dragAmount, solidCamera, useBendCanvas, type CubismLayout } from "../render/use-bend-canvas";
import { useBendSocket } from "../transport";
import CubismBendMobileView, { type MotionPermission } from "./view";

type OrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/** The phone draws a raymarched solid; native resolution would cost too much. */
const PREVIEW_PIXEL_RATIO = 1;
const SEND_INTERVAL_MS = 33;
/** Tilt per reading larger than this is a sensor jump (e.g. γ wrapping at ±90°), not a hand. */
const MAX_TILT_STEP_DEGREES = 12;

const layout: CubismLayout = (width, height, half) => [
  { kind: "solid", viewport: [0, 0, width, height], camera: solidCamera(half, width / height) },
];

function tiltAmount(operation: BendOperation, roll: number, pitch: number): BendAmount {
  const gain = OPERATION_SPECS[operation].gain;
  if (gain[1] === 0) return [((roll + pitch) / 90) * gain[0], 0];
  return [(roll / 90) * gain[0], (pitch / 90) * gain[1]];
}

export default function CubismBendMobile() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { clip, operation, receivedRef, bend, flatten } = useBendSocket({ role: "mobile" });
  const { failure } = useBendCanvas({
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
  const operationRef = useRef(operation);
  const previousRef = useRef<{ roll: number; pitch: number } | null>(null);
  const pendingRef = useRef<BendAmount>([0, 0]);
  const dragRef = useRef<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    operationRef.current = operation;
  }, [operation]);

  const add = useCallback((delta: BendAmount) => {
    pendingRef.current = [pendingRef.current[0] + delta[0], pendingRef.current[1] + delta[1]];
  }, []);

  const handleOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
      if (event.beta === null || event.gamma === null) return;
      const next = { roll: event.gamma, pitch: event.beta };
      const previous = previousRef.current;
      previousRef.current = next;
      if (!holdingRef.current || !previous) return;
      const roll = next.roll - previous.roll;
      const pitch = next.pitch - previous.pitch;
      if (Math.abs(roll) > MAX_TILT_STEP_DEGREES || Math.abs(pitch) > MAX_TILT_STEP_DEGREES) return;
      // Tilting the top away (β falls) bends forward, like pushing the top of the block.
      add(tiltAmount(operationRef.current, roll, -pitch));
    },
    [add],
  );

  const flush = useCallback(() => {
    const [a, b] = pendingRef.current;
    if (Math.abs(a) < 1e-5 && Math.abs(b) < 1e-5) return;
    pendingRef.current = [0, 0];
    bend([a, b]);
  }, [bend]);

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
    add(dragAmount(operationRef.current, event.clientX - drag.x, event.clientY - drag.y, Math.min(box.width, box.height)));
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
    <CubismBendMobileView
      canvasRef={canvasRef}
      permission={permission}
      holding={holding}
      failure={failure}
      onEnableMotion={enableMotion}
      onFace={flatten}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerEnd={onPointerEnd}
    />
  );
}
