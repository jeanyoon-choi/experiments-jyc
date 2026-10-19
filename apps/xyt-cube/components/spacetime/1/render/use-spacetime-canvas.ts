"use client";

// One live view of the cube: a canvas, its renderer, the presenter and the
// clip. The screen uses it full-bleed; every phone uses it as a preview so the
// participant sees what their gesture does.

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { SpacetimeSnapshot } from "../model";
import { loadSpacetimeClip, type LoadedSpacetimeClip } from "../media";
import { advanceSpacetimePresenter, createSpacetimePresenter } from "../screen/presenter";
import type { SpacetimeOperations } from "../screen/settings";
import { SpacetimeRenderer, type SpacetimeRenderFrame } from "./renderer";

/** A frame longer than this (tab hidden, stall) is not integrated as time. */
const MAX_FRAME_SECONDS = 0.1;

const BLANK_FRAME: SpacetimeRenderFrame = {
  timeNow: 0,
  period: 1,
  compactScale: 1,
  restX: [0, 1, 0],
  restY: [0, 0, 1],
  lightSpeed: 1,
  masses: [],
  lensGain: 0,
  softening: 1,
  lagOn: false,
};

export type SpacetimeView = {
  frame: SpacetimeRenderFrame;
  aspect: number;
};

export function useSpacetimeCanvas({
  canvasRef,
  snapshotRef,
  operations,
  clipId,
  maxPixelRatio,
}: {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  snapshotRef: RefObject<SpacetimeSnapshot | null>;
  operations: SpacetimeOperations;
  clipId: string;
  maxPixelRatio: number;
}) {
  const rendererRef = useRef<SpacetimeRenderer | null>(null);
  const clipRef = useRef<LoadedSpacetimeClip | null>(null);
  const operationsRef = useRef(operations);
  const presenterRef = useRef(createSpacetimePresenter());
  const viewRef = useRef<SpacetimeView | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  useEffect(() => {
    operationsRef.current = operations;
  }, [operations]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: SpacetimeRenderer;
    try {
      renderer = new SpacetimeRenderer(canvas);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[spacetime/1] ${message}`);
      queueMicrotask(() => setFailure(message));
      return;
    }
    rendererRef.current = renderer;
    if (clipRef.current) renderer.setClip(clipRef.current);

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

    let frameId = 0;
    let last = performance.now();
    const tick = (now: number) => {
      frameId = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, MAX_FRAME_SECONDS);
      last = now;
      const clip = clipRef.current;
      if (!clip) {
        renderer.render(BLANK_FRAME);
        return;
      }
      const presenter = presenterRef.current;
      const { frame, lagChanged } = advanceSpacetimePresenter(
        presenter,
        snapshotRef.current,
        dt,
        clip,
        operationsRef.current,
      );
      if (lagChanged) {
        renderer.setLagField(presenter.lag, presenter.lagWidth, presenter.lagHeight);
      }
      renderer.render(frame);
      viewRef.current = { frame, aspect: clip.aspect };
    };
    frameId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      renderer.dispose();
      rendererRef.current = null;
    };
  }, [canvasRef, snapshotRef, maxPixelRatio]);

  useEffect(() => {
    const controller = new AbortController();
    loadSpacetimeClip(clipId, controller.signal)
      .then((clip) => {
        clipRef.current = clip;
        try {
          rendererRef.current?.setClip(clip);
          setFailure(null);
        } catch (error) {
          setFailure(error instanceof Error ? error.message : String(error));
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setFailure(error instanceof Error ? error.message : String(error));
      });
    return () => controller.abort();
  }, [clipId]);

  const clearLag = useCallback(() => {
    const presenter = presenterRef.current;
    presenter.lag.fill(0);
    rendererRef.current?.setLagField(presenter.lag, presenter.lagWidth, presenter.lagHeight);
  }, []);

  return { failure, clearLag, viewRef };
}

/**
 * The clip position (u, v ∈ [0, 1]) shown at a canvas point, following the
 * shader's O2 and O1 steps (lensing ignored). null = outside the scene.
 */
export function clipPointAt(
  view: SpacetimeView,
  canvasWidth: number,
  canvasHeight: number,
  x: number,
  y: number,
) {
  const { frame, aspect } = view;
  const scale = Math.min(canvasWidth / aspect, canvasHeight);
  const ox = (x - canvasWidth / 2) / scale;
  const oy = (y - canvasHeight / 2) / scale;
  let rx = frame.restX[1] * ox + frame.restY[1] * oy;
  let ry = frame.restX[2] * ox + frame.restY[2] * oy;
  if (frame.compactScale < 0.999) {
    const cx = aspect * frame.compactScale;
    const cy = frame.compactScale;
    rx = (rx - Math.floor(rx / cx + 0.5) * cx) / frame.compactScale;
    ry = (ry - Math.floor(ry / cy + 0.5) * cy) / frame.compactScale;
  }
  const u = (aspect / 2 + rx) / aspect;
  const v = 0.5 + ry;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  return { u, v };
}
