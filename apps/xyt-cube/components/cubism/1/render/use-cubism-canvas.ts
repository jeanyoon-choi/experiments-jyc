"use client";

// One live view of the cube: a canvas, its renderer and the clip volume (the
// screen's clip streams in frame by frame; frames not yet read are black). It
// smooths the relay's plane once (display only) and derives where the plane
// sits from the pivot and the playhead. `layout` turns the canvas size into passes.

import { useEffect, useRef, useState, type RefObject } from "react";
import {
  boxHalf,
  IDENTITY,
  planeAxes,
  planeCentre,
  slerp,
  type CubismReceived,
  type Quaternion,
} from "../model";
import { loadCubismClip, streamCubismVideo, type CubismLevel } from "../media";
import { CubismRenderer, type CubismCamera, type CubismPass, type CubismPlaneFrame } from "./renderer";

/** Display smoothing of the plane's orientation, per second. */
const ORIENTATION_SMOOTHING_PER_SECOND = 16;
const MAX_FRAME_SECONDS = 0.1;

type Vector = [number, number, number];

export type CubismLayout = (width: number, height: number, half: Vector) => CubismPass[];

/**
 * A fixed three-quarter view from the viewer's side (+t, slightly right and
 * above) that keeps the whole box in frame.
 */
export function solidCamera(half: Vector, viewAspect: number): CubismCamera {
  const yaw = 0.62;
  const pitch = 0.42;
  const forward: Vector = [
    -Math.sin(yaw) * Math.cos(pitch),
    -Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch),
  ];
  const radius = Math.hypot(...half);
  const focal = 2.4;
  // Distance so the bounding sphere fits the narrower view axis.
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

export function useCubismCanvas({
  canvasRef,
  receivedRef,
  clipId,
  level,
  layout,
  maxPixelRatio,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  receivedRef: RefObject<CubismReceived | null>;
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
      console.error(`[cubism/1] ${message}`);
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

    let shown: Quaternion = [...IDENTITY] as Quaternion;
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
      shown = slerp(
        shown,
        snapshot.orientation,
        1 - Math.exp(-ORIENTATION_SMOOTHING_PER_SECOND * dt),
      ) as Quaternion;
      const seconds = snapshot.playhead + (snapshot.rate * (now - receivedAt)) / 1000;
      const half = boxHalf(volume.aspect) as Vector;
      const { u, v, w } = planeAxes(shown) as { u: Vector; v: Vector; w: Vector };
      const plane: CubismPlaneFrame = {
        half,
        u,
        v,
        w,
        centre: planeCentre(snapshot.pivot, w, half, seconds / volume.duration) as Vector,
        loopTime: snapshot.pivot !== "cube",
      };
      const [width, height] = renderer.size;
      renderer.render(plane, layoutRef.current(width, height, half));
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
      console.error(`[cubism/1] ${message}`);
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

/** Rotation of a drag on a view of the plane: horizontal turns about v, vertical about u. */
export function dragDelta(dx: number, dy: number, size: number): Quaternion {
  const k = Math.PI / Math.max(1, size);
  const angle = Math.hypot(dx, dy) * k;
  if (!(angle > 0)) return [...IDENTITY] as Quaternion;
  // Screen y grows downward; the plane's v points up.
  const axis: Vector = [dy, dx, 0];
  const s = Math.sin(angle / 2) / Math.hypot(dx, dy);
  return [Math.cos(angle / 2), axis[0] * s, axis[1] * s, 0];
}
