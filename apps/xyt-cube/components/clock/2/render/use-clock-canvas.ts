"use client";

// The live view: a canvas, its renderer and the clock's time. Each frame it
// eases the shown amount toward the set one, advances the clock, finds the
// block the present sweeps and passes the bent frame to the renderer.

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  blockFrame,
  boxHalf,
  DAY,
  HANDS,
  localClockSeconds,
  OPERATION_SPECS,
  OPERATIONS,
  presentPlaneZ,
  type BendAmount,
  type BendOperation,
  type Stimulus,
  type Vector,
} from "../model";
import { FRACTAL_NODES, fractalPhases } from "../model/fractal";
import { ClockRenderer, type ClockCamera, type ClockPass } from "./renderer";

/** Display easing of the amount, per second. */
const AMOUNT_SMOOTHING_PER_SECOND = 10;
const MAX_FRAME_SECONDS = 0.1;
const READOUT_MS = 250;
const FRACTAL_PHASE_LENGTH = FRACTAL_NODES.length * 3;
/**
 * Performance management (as clock/1): the canvas resolution follows the
 * measured frame time. Averaged over each second, slower than SLOW_MS steps
 * the resolution down (to MIN_QUALITY of the device ratio), faster than
 * FAST_MS steps it back up.
 */
const ADJUST_MS = 1000;
const SLOW_MS = 19;
const FAST_MS = 15;
const MIN_QUALITY = 0.4;

export type ClockSettings = {
  operation: BendOperation;
  /** Each operation's amount; (0, 0) = flat = the ordinary clock. */
  amounts: Record<BendOperation, BendAmount>;
  span: number;
  stimulus: Stimulus;
  /** L, screen units: a point's time thickness is the time spanned by L along the cut. */
  thickness: number;
  /** Clock seconds per real second. */
  rate: number;
};

export type ClockReadout = { present: number; start: number; end: number };

export type ClockLayout = (width: number, height: number, half: Vector) => ClockPass[];

/** A fixed three-quarter view from the side (+t, right, above) fitting `reach` × the box. */
export function solidCamera(half: Vector, viewAspect: number, reach = 1.05): ClockCamera {
  const yaw = 0.9;
  const pitch = 0.36;
  const forward: Vector = [-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)];
  const radius = Math.hypot(...half) * reach;
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

function unit(value: number) {
  return value - Math.floor(value);
}

/** Half sizes of a region that holds the bent block (searched by the solid view). */
function solidBounds(operation: BendOperation, amount: BendAmount, half: Vector): Vector {
  const [a, b] = amount;
  switch (operation) {
    case "shear":
      return [half[0] * 1.05, half[1] * 1.05, half[2] + Math.abs(a) * half[0] + Math.abs(b) * half[1] + 0.05];
    case "curvature": {
      if (Math.abs(a) < 1e-4) return [half[0] * 1.05, half[1] * 1.05, half[2] * 1.05];
      const rho = 1 / Math.sqrt(Math.abs(a));
      const reach = Math.hypot(...half);
      const chart = a > 0 ? rho * Math.tan(Math.min(reach / rho, 1.45)) : rho * Math.tanh(reach / rho);
      return [chart * 1.02, chart * 1.02, chart * 1.02];
    }
    case "torus":
      return [half[0] * 1.05, half[1] * 1.05, half[2] * 1.05];
    case "mobius": {
      // The ring: radius 0.5/a about an axis at x = −0.5/a, the frame's corners around it.
      if (a < 1e-4) return [half[0] * 1.05, half[1] * 1.05, half[2] * 1.05];
      const ring = 0.5 / a;
      const corner = Math.hypot(half[0], half[1]);
      const reach = Math.min(ring + corner, 4);
      return [reach, corner * 1.02, reach];
    }
    default:
      return [half[0] * 1.8, half[1] * 1.8, half[2] * 1.8];
  }
}

function approach(operation: BendOperation, shown: BendAmount, target: BendAmount, amount: number): BendAmount {
  const wrap = OPERATION_SPECS[operation].wrap;
  return [0, 1].map((i) => {
    let difference = target[i] - shown[i];
    if (wrap[i]) difference -= 2 * Math.PI * Math.round(difference / (2 * Math.PI));
    return Math.abs(difference) < 1e-5 ? target[i] : shown[i] + difference * amount;
  }) as BendAmount;
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
      console.error(`[clock/2] ${message}`);
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

    let shownOperation: BendOperation | null = null;
    let shown: BendAmount = [0, 0];
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
      const { operation } = settings;
      const target = settings.amounts[operation];
      if (operation !== shownOperation) {
        shownOperation = operation;
        shown = [...target];
      } else {
        shown = approach(operation, shown, target, 1 - Math.exp(-AMOUNT_SMOOTHING_PER_SECOND * dt));
      }

      offsetRef.current += (settings.rate - 1) * dt;
      const clock = localClockSeconds(new Date()) + offsetRef.current;

      const [width, height] = renderer.size;
      const half = boxHalf(width, height);
      const block = blockFrame(clock, settings.span, half);
      const day = ((block.origin % DAY) + DAY) % DAY;
      const originWhole = Math.floor(day);
      renderer.render(
        {
          half,
          operation: OPERATIONS.indexOf(operation),
          amount: shown,
          present: block.present,
          planeZ: presentPlaneZ(operation, shown, block.present),
          bounds: solidBounds(operation, shown, half),
          secondsPerUnit: block.secondsPerUnit,
          originWhole,
          originFrac: day - originWhole,
          handPhase: [
            unit(block.origin / HANDS[0].period),
            unit(block.origin / HANDS[1].period),
            unit(block.origin / HANDS[2].period),
          ],
          stimulus: settings.stimulus === "digital" ? 1 : settings.stimulus === "fractal" ? 2 : 0,
          nodePhase: fractalPhases(block.origin, nodePhase),
          thickness: settings.thickness,
        },
        layoutRef.current(width, height, half),
      );

      if (now - lastReadout > READOUT_MS) {
        lastReadout = now;
        readoutRef.current({
          present: clock,
          start: block.origin - settings.span / 2,
          end: block.origin + settings.span / 2,
        });
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

/** A drag across the view as a change of the amount (one shorter side = gain). */
export function dragAmount(operation: BendOperation, dx: number, dy: number, size: number): BendAmount {
  const gain = OPERATION_SPECS[operation].gain;
  const scale = 1 / Math.max(1, size);
  // Screen y grows downward; dragging up is positive. One-amount operations
  // take both directions (right or up = more).
  if (gain[1] === 0) return [(dx - dy) * scale * gain[0], 0];
  return [dx * scale * gain[0], -dy * scale * gain[1]];
}
