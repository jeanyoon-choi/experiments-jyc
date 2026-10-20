"use client";

// One live view of the liquid cube (copied from moving-image/2's use-bend-canvas
// and changed): a canvas, its renderer, the clip's frames (streamed frame by
// frame) and its flow (streamed layer by layer). It smooths the amount once
// (display only), derives the present from the playhead, and snaps the
// present to a frame while the slice is flat.

import { useEffect, useRef, useState, type RefObject } from "react";
import { loadLiquidClip, streamLiquidFlow, streamLiquidVideo } from "../media";
import {
  boxHalf,
  cutWindows,
  loopOf,
  MOEBIUS_RING,
  OPERATION_SPECS,
  OPERATIONS,
  presentDepth,
  presentPlaneZ,
  shownPresent,
  timeSpan,
  TILT_SPEC,
  type Amount,
  type Loop,
  type Operation,
  type Vector,
} from "../model/geometry";
import { LiquidRenderer, type LiquidCamera, type LiquidFrame, type LiquidPass } from "./renderer";

const AMOUNT_SMOOTHING_PER_SECOND = 10;
const MAX_FRAME_SECONDS = 0.1;

/** What the screen asks for; read every animation frame. */
export type LiquidState = {
  operation: Operation;
  amount: Amount;
  /** The plane's tilt (radians about y, then x); composes with any operation. */
  tilt: Amount;
  /** Seconds into the loop at `since` (performance.now), unwrapped. */
  playhead: number;
  since: number;
  /** 1 forward, 0 still, -1 reverse. */
  rate: number;
  liquid: boolean;
};

/**
 * `view` = half sizes of what the solid view shows; `ring` = it is the Möbius
 * ring (seen from higher up, so the twist reads).
 */
export type LiquidLayout = (width: number, height: number, view: Vector, ring: boolean) => LiquidPass[];

/** A fixed three-quarter view from the viewer's side (moving-image/2's). */
export function solidCamera(half: Vector, viewAspect: number, reach = 1.25, pitch = 0.36): LiquidCamera {
  const yaw = 0.9;
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

function solidBounds(operation: Operation, amount: Amount, tilt: Amount, half: Vector, present: number): Vector {
  const [a, b] = amount;
  if (operation === "moebius" && a >= 1e-4) {
    // The ring: radius R_RING/a about an axis at x = −R_RING/a, the frame's corners around it.
    const corner = Math.hypot(half[0], half[1]);
    const reach = Math.min(MOEBIUS_RING / a + corner, 4) + Math.hypot(tilt[0], tilt[1]) * corner;
    return [reach, corner * 1.02 + Math.hypot(tilt[0], tilt[1]) * corner, reach];
  }
  if (tilt[0] !== 0 || tilt[1] !== 0) {
    const r = Math.hypot(...half) * 1.8 + Math.abs(present);
    return [r, r, r];
  }
  switch (operation) {
    case "none":
      return [half[0] * 1.05, half[1] * 1.05, half[2] * 1.05];
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
    default:
      return [half[0] * 1.8, half[1] * 1.8, half[2] * 1.8];
  }
}

function approach(operation: Operation | "tilt", shown: Amount, target: Amount, amount: number): Amount {
  const wrap = (operation === "tilt" ? TILT_SPEC : OPERATION_SPECS[operation]).wrap;
  return [0, 1].map((i) => {
    let difference = target[i] - shown[i];
    if (wrap[i]) difference -= 2 * Math.PI * Math.round(difference / (2 * Math.PI));
    return Math.abs(difference) < 1e-5 ? target[i] : shown[i] + difference * amount;
  }) as Amount;
}

export function useLiquidCanvas({
  canvasRef,
  stateRef,
  clipId,
  layout,
  maxPixelRatio,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  stateRef: RefObject<LiquidState>;
  clipId: string;
  layout: LiquidLayout;
  maxPixelRatio: number;
}) {
  const [renderer, setRenderer] = useState<LiquidRenderer | null>(null);
  /** The loaded clip's shape; null until the renderer holds (part of) it. */
  const volumeRef = useRef<{ aspect: number; fps: number; loop: Loop } | null>(null);
  const layoutRef = useRef(layout);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: LiquidRenderer;
    try {
      renderer = new LiquidRenderer(canvas);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[moving-image/3] ${message}`);
      queueMicrotask(() => setFailure(message));
      return;
    }
    queueMicrotask(() => setRenderer(renderer));

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
      renderer.resize(Math.max(1, Math.round(canvas.clientWidth * ratio)), Math.max(1, Math.round(canvas.clientHeight * ratio)));
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();

    let shownOperation: Operation | null = null;
    let shown: Amount = [0, 0];
    let shownTilt: Amount = [0, 0];
    let frameId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      frameId = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, MAX_FRAME_SECONDS);
      last = now;
      const volume = volumeRef.current;
      const state = stateRef.current;
      if (!volume) {
        renderer.render(null, []);
        return;
      }
      const { operation, amount: target } = state;
      if (operation !== shownOperation) {
        shownOperation = operation;
        shown = [...target];
      } else {
        shown = approach(operation, shown, target, 1 - Math.exp(-AMOUNT_SMOOTHING_PER_SECOND * dt));
      }
      shownTilt = approach("tilt", shownTilt, state.tilt, 1 - Math.exp(-AMOUNT_SMOOTHING_PER_SECOND * dt));
      const { loop } = volume;
      const seconds = state.playhead + (state.rate * (now - state.since)) / 1000;
      const half = boxHalf(volume.aspect);
      const [width, height] = renderer.size;
      const scale = Math.min(width / volume.aspect, height);
      const extent: [number, number] = [width / scale / 2, height / scale / 2];
      const continuous = presentDepth(half, seconds / (loop.period / volume.fps));
      const span = timeSpan(operation, shown, shownTilt, continuous, half, loop, extent);
      const present = shownPresent(continuous, half, loop, span);
      const frame: LiquidFrame = {
        half,
        operation: OPERATIONS.indexOf(operation),
        amount: shown,
        tilt: shownTilt,
        present,
        planeZ: presentPlaneZ(operation, shown, present),
        bounds: solidBounds(operation, shown, shownTilt, half, present),
        loop: [loop.period, loop.seam],
        liquid: state.liquid,
      };
      const view: Vector = operation === "moebius" ? [...frame.bounds] : half;
      renderer.render(frame, layoutRef.current(width, height, view, operation === "moebius"));
    };
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.dispose();
      volumeRef.current = null;
      setRenderer(null);
    };
  }, [canvasRef, stateRef, maxPixelRatio]);

  useEffect(() => {
    if (!renderer) return;
    const controller = new AbortController();
    const { signal } = controller;
    volumeRef.current = null;
    const fail = (error: unknown) => {
      if (signal.aborted) return;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[moving-image/3] ${message}`);
      setFailure(message);
    };
    loadLiquidClip(clipId, signal)
      .then(async (clip) => {
        signal.throwIfAborted();
        renderer.begin(clip);
        renderer.setCuts(clip.frames, cutWindows(clip.flow.cuts, clip.frames, clip.fps));
        volumeRef.current = { aspect: clip.aspect, fps: clip.fps, loop: loopOf(clip.frames, clip.fps) };
        setFailure(null);
        await Promise.all([
          streamLiquidVideo(clip, (index, source) => renderer.writeVideoFrame(index, source), signal),
          streamLiquidFlow(clip, (index, rgba) => renderer.writeFlowLayer(index, rgba), signal),
        ]);
        setFailure(null);
      })
      .catch(fail);
    return () => controller.abort();
  }, [renderer, clipId]);

  return { failure, renderer };
}

/** A drag across the view as a change of the amount (one full width = gain). */
export function dragAmount(operation: Operation | "tilt", dx: number, dy: number, size: number): Amount {
  const gain = (operation === "tilt" ? TILT_SPEC : OPERATION_SPECS[operation]).gain;
  const scale = 1 / Math.max(1, size);
  if (gain[1] === 0) return [(dx - dy) * scale * gain[0], 0];
  return [dx * scale * gain[0], -dy * scale * gain[1]];
}
