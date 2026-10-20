"use client";

// One live view of the bent cube: a canvas, its renderer and the clip volume
// (the screen's clip streams in frame by frame; frames not yet read are
// black). It smooths the relay's amount once (display only) and derives the
// present from the playhead. `layout` turns the canvas size into passes.

import { useEffect, useRef, useState, type RefObject } from "react";
import { loadCubismClip, streamCubismVideo, type CubismLevel } from "../media";
import {
  boxHalf,
  OPERATION_SPECS,
  OPERATIONS,
  presentDepth,
  presentPlaneZ,
  type BendAmount,
  type BendOperation,
  type BendReceived,
} from "../model";
import { CubismRenderer, type CubismBendFrame, type CubismCamera, type CubismPass } from "./renderer";

/** Display smoothing of the amount, per second. */
const AMOUNT_SMOOTHING_PER_SECOND = 10;
const MAX_FRAME_SECONDS = 0.1;

type Vector = [number, number, number];

export type CubismLayout = (width: number, height: number, half: Vector) => CubismPass[];

/**
 * A fixed three-quarter view from the viewer's side (+t, slightly right and
 * above) that keeps a sphere of `radius` around the cube in frame.
 */
export function solidCamera(half: Vector, viewAspect: number, reach = 1.25): CubismCamera {
  const yaw = 0.9;
  const pitch = 0.36;
  const forward: Vector = [
    -Math.sin(yaw) * Math.cos(pitch),
    -Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch),
  ];
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

/** Half sizes of a region that holds the bent cube (searched by the solid view). */
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

export function useBendCanvas({
  canvasRef,
  receivedRef,
  clipId,
  level,
  layout,
  maxPixelRatio,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  receivedRef: RefObject<BendReceived | null>;
  clipId: string;
  level: CubismLevel;
  layout: CubismLayout;
  maxPixelRatio: number;
}) {
  const [renderer, setRenderer] = useState<CubismRenderer | null>(null);
  /** The loaded clip's shape; null until the renderer holds (part of) it. */
  const volumeRef = useRef<{ aspect: number; duration: number } | null>(null);
  const layoutRef = useRef(layout);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: CubismRenderer;
    try {
      renderer = new CubismRenderer(canvas);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[cubism/2] ${message}`);
      queueMicrotask(() => setFailure(message));
      return;
    }
    queueMicrotask(() => setRenderer(renderer));

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, maxPixelRatio);
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
    let frameId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      frameId = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, MAX_FRAME_SECONDS);
      last = now;
      const volume = volumeRef.current;
      const received = receivedRef.current;
      if (!volume || !received) {
        renderer.render(null, []);
        return;
      }
      const { snapshot, receivedAt } = received;
      const { operation } = snapshot;
      const target = snapshot.amounts[operation];
      if (operation !== shownOperation) {
        shownOperation = operation;
        shown = [...target];
      } else {
        shown = approach(operation, shown, target, 1 - Math.exp(-AMOUNT_SMOOTHING_PER_SECOND * dt));
      }
      const seconds = snapshot.playhead + (snapshot.rate * (now - receivedAt)) / 1000;
      const half = boxHalf(volume.aspect) as Vector;
      const present = presentDepth(half, seconds / volume.duration);
      const frame: CubismBendFrame = {
        half,
        operation: OPERATIONS.indexOf(operation),
        amount: shown,
        present,
        planeZ: presentPlaneZ(operation, shown, present),
        bounds: solidBounds(operation, shown, half),
      };
      const [width, height] = renderer.size;
      renderer.render(frame, layoutRef.current(width, height, half));
    };
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.dispose();
      volumeRef.current = null;
      setRenderer(null);
    };
  }, [canvasRef, receivedRef, maxPixelRatio]);

  useEffect(() => {
    if (!renderer) return;
    const controller = new AbortController();
    const { signal } = controller;
    volumeRef.current = null;
    const fail = (error: unknown) => {
      if (signal.aborted) return;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[cubism/2] ${message}`);
      setFailure(message);
    };
    loadCubismClip(clipId, level, signal)
      .then(async (clip) => {
        signal.throwIfAborted();
        if (clip.kind === "rgba") {
          renderer.setVolume(clip);
          volumeRef.current = clip;
        } else {
          renderer.beginVideo(clip);
          volumeRef.current = clip;
          setFailure(null);
          await streamCubismVideo(clip, (index, source) => renderer.writeVideoFrame(index, source), signal);
        }
        setFailure(null);
      })
      .catch(fail);
    return () => controller.abort();
  }, [renderer, clipId, level]);

  return { failure };
}

/** A drag across the view as a change of the amount (one full width = gain). */
export function dragAmount(operation: BendOperation, dx: number, dy: number, size: number): BendAmount {
  const gain = OPERATION_SPECS[operation].gain;
  const scale = 1 / Math.max(1, size);
  // Screen y grows downward; dragging up is positive. One-amount operations
  // take both directions (right or up = more).
  if (gain[1] === 0) return [(dx - dy) * scale * gain[0], 0];
  return [dx * scale * gain[0], -dy * scale * gain[1]];
}
