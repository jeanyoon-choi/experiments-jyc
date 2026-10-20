"use client";

// The live view: a canvas, its renderer and the clock's time. Each frame it
// eases the shown plane toward the set angles, advances the clock and derives
// where the plane sits (pivot) and how z maps to clock seconds (span).

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  boxHalf,
  DAY,
  HANDS,
  localClockSeconds,
  planeAxes,
  planeOrientation,
  screenTimeRange,
  timeFrame,
  type Pivot,
  type Stimulus,
  type Vector,
} from "../model";
import { FRACTAL_NODES, fractalPhases } from "../model/fractal";
import { ClockRenderer, type ClockCamera, type ClockPass } from "./renderer";

/** Display easing of the plane's angles, per second. */
const ANGLE_SMOOTHING_PER_SECOND = 14;
const MAX_FRAME_SECONDS = 0.1;
const FRACTAL_PHASE_LENGTH = FRACTAL_NODES.length * 3;
/**
 * Performance management: the canvas resolution follows the measured frame
 * time. Averaged over each second, slower than SLOW_MS steps the resolution
 * down (to MIN_QUALITY of the device ratio), faster than FAST_MS steps it back
 * up, so a heavy view (the fractal, a large solid) keeps its frame rate.
 */
const ADJUST_MS = 1000;
const SLOW_MS = 19;
const FAST_MS = 15;
const MIN_QUALITY = 0.4;
const READOUT_MS = 250;
const DEGREE = Math.PI / 180;

export type ClockSettings = {
  /** Plane angles, degrees: about the cube's x axis, then its y axis. */
  pitch: number;
  yaw: number;
  pivot: Pivot;
  span: number;
  stimulus: Stimulus;
  /** L, screen units: a turned cut's time thickness is the time spanned by L along it. */
  thickness: number;
  /** Clock seconds per real second. */
  rate: number;
};

export type ClockReadout = { centre: number; min: number; max: number };

/** `block`: what the solid view draws (the box, or a window on the unbounded cube). */
export type ClockLayout = (width: number, height: number, block: Vector) => ClockPass[];

/** A fixed three-quarter view from the viewer's side (+t, right, above) fitting the box. */
export function solidCamera(half: Vector, viewAspect: number): ClockCamera {
  const yaw = 0.62;
  const pitch = 0.42;
  const forward: Vector = [-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
  const radius = Math.hypot(...half);
  const focal = 2.4;
  const fit = Math.min(1, viewAspect);
  const distance = (radius * Math.hypot(focal, fit)) / fit + 0.05;
  const eye: Vector = [-forward[0] * distance, -forward[1] * distance, -forward[2] * distance];
  const right = normalize3(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  return { eye, right, up, forward, focal };
}

function normalize3(v: Vector): Vector {
  const length = Math.hypot(...v) || 1;
  return [v[0] / length, v[1] / length, v[2] / length];
}

function cross(a: Vector, b: Vector): Vector {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function wrapDegrees(value: number) {
  return value - 360 * Math.floor((value + 180) / 360);
}

function unit(value: number) {
  return value - Math.floor(value);
}

export function useClockCanvas({
  canvasRef,
  settingsRef,
  offsetRef,
  layout,
  maxPixelRatio,
  onReadout,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  settingsRef: RefObject<ClockSettings>;
  /** Clock seconds ahead of the real local time; grows while rate ≠ 1. */
  offsetRef: RefObject<number>;
  layout: ClockLayout;
  maxPixelRatio: number;
  onReadout: (readout: ClockReadout) => void;
}) {
  const layoutRef = useRef(layout);
  const readoutRef = useRef(onReadout);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    layoutRef.current = layout;
    readoutRef.current = onReadout;
  }, [layout, onReadout]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: ClockRenderer;
    try {
      renderer = new ClockRenderer(canvas);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[clock/1] ${message}`);
      queueMicrotask(() => setFailure(message));
      return;
    }

    let quality = 1;
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, maxPixelRatio) * quality;
      renderer.resize(
        Math.max(1, Math.round(canvas.clientWidth * ratio)),
        Math.max(1, Math.round(canvas.clientHeight * ratio)),
      );
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    const initial = settingsRef.current;
    let pitch = initial.pitch;
    let yaw = initial.yaw;
    const nodePhase = new Float32Array(FRACTAL_PHASE_LENGTH);
    let frameId = 0;
    let last = performance.now();
    let lastReadout = 0;
    let lastAdjust = last;
    let intervalSum = 0;
    let intervalCount = 0;
    const tick = (now: number) => {
      frameId = requestAnimationFrame(tick);
      const interval = now - last;
      const dt = Math.min(interval / 1000, MAX_FRAME_SECONDS);
      last = now;
      if (interval < 250) {
        intervalSum += interval;
        intervalCount += 1;
      }
      if (now - lastAdjust > ADJUST_MS && intervalCount > 10) {
        const average = intervalSum / intervalCount;
        const next =
          average > SLOW_MS
            ? Math.max(MIN_QUALITY, quality * 0.8)
            : average < FAST_MS
              ? Math.min(1, quality * 1.12)
              : quality;
        if (Math.abs(next - quality) > 1e-3) {
          quality = next;
          resize();
        }
        lastAdjust = now;
        intervalSum = 0;
        intervalCount = 0;
      }
      const settings = settingsRef.current;
      const ease = 1 - Math.exp(-ANGLE_SMOOTHING_PER_SECOND * dt);
      pitch += wrapDegrees(settings.pitch - pitch) * ease;
      yaw += wrapDegrees(settings.yaw - yaw) * ease;

      offsetRef.current += (settings.rate - 1) * dt;
      const clock = localClockSeconds(new Date()) + offsetRef.current;

      const [width, height] = renderer.size;
      const half = boxHalf(width, height);
      const { u, v, w } = planeAxes(planeOrientation(pitch * DEGREE, yaw * DEGREE));
      const frame = timeFrame(settings.pivot, w, half, clock, settings.span);
      const day = ((frame.origin % DAY) + DAY) % DAY;
      const originWhole = Math.floor(day);
      renderer.render(
        {
          half,
          bounded: frame.bounded,
          u,
          v,
          w,
          centre: frame.centre,
          secondsPerUnit: frame.secondsPerUnit,
          originWhole,
          originFrac: day - originWhole,
          handPhase: [
            unit(frame.origin / HANDS[0].period),
            unit(frame.origin / HANDS[1].period),
            unit(frame.origin / HANDS[2].period),
          ],
          stimulus: settings.stimulus === "digital" ? 1 : settings.stimulus === "fractal" ? 2 : 0,
          nodePhase: fractalPhases(frame.origin, nodePhase),
          thickness: settings.thickness,
        },
        // The cube pivot's box bounds the slice; the now pivot's cube is
        // unbounded, so the solid shows a window of it around the clock.
        layoutRef.current(width, height, frame.bounded ? half : [0.5, 0.5, half[2]]),
      );

      if (now - lastReadout > READOUT_MS) {
        lastReadout = now;
        const range = screenTimeRange(frame, u, v, half);
        readoutRef.current({ centre: frame.origin + frame.centre[2] * frame.secondsPerUnit, ...range });
      }
    };
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.dispose();
    };
  }, [canvasRef, settingsRef, offsetRef, maxPixelRatio]);

  return { failure };
}
