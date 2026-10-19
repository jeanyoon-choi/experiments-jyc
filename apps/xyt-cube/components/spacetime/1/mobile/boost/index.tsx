"use client";

// O2 link: the phone is an observer. Its tilt from the pose it held when
// motion was enabled is its velocity; the screen shows that observer's "now".
// Without motion (desktop, denied), dragging inside the circle sets it.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { MAX_BETA, tiltToBeta, type SpacetimeSnapshot } from "../../model";
import { useSpacetimeSocket } from "../../transport";
import { useSpacetimePreview } from "../stage";
import BoostView from "./view";

export type MotionPermission = "idle" | "listening" | "denied" | "unavailable";
type OrientationEventConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};
export type Velocity = { bx: number; by: number };

/** Relay heartbeat: a held tilt keeps its frame alive (relay drops after 1.5 s). */
const SEND_INTERVAL_MS = 50;
const rest: Velocity = { bx: 0, by: 0 };

export default function SpacetimeBoostMobile() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const snapshotRef = useRef<SpacetimeSnapshot | null>(null);
  const { sendBoost, leaveBoost } = useSpacetimeSocket({
    role: "mobile",
    retainState: false,
    onState: (next) => {
      snapshotRef.current = next;
    },
  });
  useSpacetimePreview(canvasRef, snapshotRef);
  const [permission, setPermission] = useState<MotionPermission>("idle");
  const [velocity, setVelocity] = useState<Velocity>(rest);
  const velocityRef = useRef<Velocity>(rest);
  const engagedRef = useRef(false);
  const baselineRef = useRef<{ beta: number; gamma: number } | null>(null);
  const dragRef = useRef<number | null>(null);

  const apply = useCallback((next: Velocity) => {
    velocityRef.current = next;
    engagedRef.current = true;
    setVelocity(next);
  }, []);

  const handleOrientation = useCallback(
    (event: DeviceOrientationEvent) => {
      if (dragRef.current !== null) return;
      const reading = { beta: Number(event.beta) || 0, gamma: Number(event.gamma) || 0 };
      baselineRef.current ??= reading;
      apply(tiltToBeta(reading, baselineRef.current));
    },
    [apply],
  );

  const disengage = useCallback(() => {
    if (!engagedRef.current) return;
    engagedRef.current = false;
    velocityRef.current = rest;
    setVelocity(rest);
    leaveBoost();
  }, [leaveBoost]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!engagedRef.current) return;
      sendBoost(velocityRef.current.bx, velocityRef.current.by);
    }, SEND_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [sendBoost]);

  useEffect(() => {
    const hide = () => {
      if (document.visibilityState === "hidden") disengage();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", disengage);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", disengage);
      window.removeEventListener("deviceorientation", handleOrientation);
      disengage();
    };
  }, [disengage, handleOrientation]);

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
    baselineRef.current = null;
    window.addEventListener("deviceorientation", handleOrientation);
    setPermission("listening");
  }

  const dragTo = (event: ReactPointerEvent<SVGSVGElement>) => {
    // Mirrors the view: a 100 × 100 viewBox (meet), cone centre (50, 46), radius 36.
    const box = event.currentTarget.getBoundingClientRect();
    const unit = Math.min(box.width, box.height) / 100;
    if (!(unit > 0)) return;
    const centreX = box.left + (box.width - 100 * unit) / 2 + 50 * unit;
    const centreY = box.top + (box.height - 100 * unit) / 2 + 46 * unit;
    let bx = (event.clientX - centreX) / (36 * unit);
    let by = (event.clientY - centreY) / (36 * unit);
    const speed = Math.hypot(bx, by);
    if (speed > MAX_BETA) {
      bx = (bx / speed) * MAX_BETA;
      by = (by / speed) * MAX_BETA;
    }
    apply({ bx, by });
  };

  return (
    <BoostView
      canvasRef={canvasRef}
      permission={permission}
      velocity={velocity}
      onEnableMotion={enableMotion}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId);
        dragRef.current = event.pointerId;
        dragTo(event);
      }}
      onPointerMove={(event) => {
        if (dragRef.current === event.pointerId) dragTo(event);
      }}
      onPointerEnd={(event) => {
        if (dragRef.current !== event.pointerId) return;
        dragRef.current = null;
        // With motion on, the tilt takes the frame back; the pose baseline stays.
      }}
    />
  );
}
