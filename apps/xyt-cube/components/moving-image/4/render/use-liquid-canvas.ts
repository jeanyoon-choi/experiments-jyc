"use client";

// One live view of the liquid cube (copied from moving-image/2's use-bend-canvas
// and changed): a canvas, its renderer, the clip's frames (streamed frame by
// frame) and its flow (streamed layer by layer). It smooths the amount once
// (display only) and derives the present from the playhead, continuous even
// while the slice is flat (moving-image/3 snapped it to a frame).

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
  TILT_SPEC,
  type Amount,
  type Loop,
  type Operation,
  type Vector,
} from "../model/geometry";
import { LiquidRenderer, NEAR_SLOTS, type LiquidCamera, type LiquidFrame, type LiquidPass } from "./renderer";

const AMOUNT_SMOOTHING_PER_SECOND = 10;
const ADJUST_MS = 1000;
const SLOW_MS = 19;
/** At (or near) the display's own rate: 60 Hz frames are ~16.7 ms apart. */
const FAST_MS = 17.6;
/** Seconds of keeping up before stepping the resolution back up. */
const RECOVER_SECONDS = 2;
const MIN_QUALITY = 0.4;
const MAX_FRAME_SECONDS = 0.1;
/** The live video runs this far ahead of the present, so the window spans it. */
const LIVE_LEAD_SECONDS = 0.6;
/**
 * Keeping the live video in step: small drift is absorbed by nudging its
 * playback rate (a seek empties the window and shows as a blend); only a
 * drift beyond LIVE_SEEK_SECONDS (a jump of the present) seeks.
 */
const LIVE_SEEK_SECONDS = 2;
const LIVE_NUDGE = 0.05;
/**
 * Fastest rate the live window follows (the browser decodes the 1080p
 * original at up to 4× smoothly); faster, the cube and its flow alone play.
 */
const LIVE_MAX_RATE = 4;

/**
 * The live window's source: a hidden, muted video of the original that plays
 * in step with the present; each frame it presents is converted into the next
 * ring slot with its clip time.
 */
type Live = { video: HTMLVideoElement; slot: number; lastTime: number; playing: boolean };

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
  const liveRef = useRef<Live | null>(null);
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
      console.error(`[moving-image/4] ${message}`);
      queueMicrotask(() => setFailure(message));
      return;
    }
    queueMicrotask(() => setRenderer(renderer));

    // Performance management: the canvas resolution follows the measured frame
    // time (averaged each second: slower than SLOW_MS steps it down to at most
    // MIN_QUALITY of the device ratio, faster than FAST_MS steps it back up).
    let quality = 1;
    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, maxPixelRatio) * quality;
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
    let lastAdjust = last;
    let intervalSum = 0;
    let intervalCount = 0;
    let keptUp = 0;
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
        keptUp = average < FAST_MS ? keptUp + 1 : 0;
        const next =
          average > SLOW_MS
            ? Math.max(MIN_QUALITY, quality * 0.8)
            : keptUp >= RECOVER_SECONDS
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
      const continuous = presentDepth(half, seconds / (loop.period / volume.fps));
      // Time-lapses keep 4–24 frames a second, so snapping a flat slice to a
      // cube frame (moving-image/3) stepped visibly at 1×: the present always
      // runs continuously, between frames along the flow.
      const live = liveRef.current;
      const present = continuous;
      if (live) {
        const duration = loop.period / volume.fps;
        const presentSeconds = (((continuous / (2 * half[2]) + 0.5) * duration) % duration + duration) % duration;
        const rate = state.rate;
        const target = Math.min(presentSeconds + LIVE_LEAD_SECONDS * Math.max(rate, 1), live.video.duration || duration);
        if (rate >= 1 && rate <= LIVE_MAX_RATE) {
          const drift = live.video.currentTime - target;
          if (Math.abs(drift) > LIVE_SEEK_SECONDS * rate) {
            renderer.clearNear();
            live.video.currentTime = target;
            live.video.playbackRate = rate;
          } else {
            live.video.playbackRate = rate * (1 - Math.max(-LIVE_NUDGE, Math.min(LIVE_NUDGE, drift / rate)));
          }
          if (!live.playing) {
            live.playing = true;
            void live.video.play().catch(() => {
              live.playing = false;
            });
          }
        } else if (live.playing) {
          live.playing = false;
          live.video.pause();
          renderer.clearNear();
        }
      }
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
      console.error(`[moving-image/4] ${message}`);
      setFailure(message);
    };
    const startLive = (src: string, width: number, height: number, abort: AbortSignal) => {
      renderer.beginNear(width, height);
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      video.src = src;
      const live: Live = { video, slot: 0, lastTime: -1, playing: false };
      const onFrame = (_now: number, metadata: VideoFrameCallbackMetadata) => {
        if (abort.aborted) return;
        if (metadata.mediaTime !== live.lastTime) {
          live.lastTime = metadata.mediaTime;
          renderer.writeNearFrame(live.slot, metadata.mediaTime, video);
          live.slot = (live.slot + 1) % NEAR_SLOTS;
        }
        video.requestVideoFrameCallback(onFrame);
      };
      video.requestVideoFrameCallback(onFrame);
      liveRef.current = live;
      abort.addEventListener("abort", () => {
        video.pause();
        video.removeAttribute("src");
        video.load();
        if (liveRef.current === live) liveRef.current = null;
      });
    };
    liveRef.current = null;
    loadLiquidClip(clipId, signal)
      .then(async (clip) => {
        signal.throwIfAborted();
        renderer.begin(clip);
        renderer.setCuts(clip.frames, cutWindows(clip.flow.cuts, clip.frames, clip.fps));
        volumeRef.current = { aspect: clip.aspect, fps: clip.fps, loop: loopOf(clip.frames, clip.fps) };
        setFailure(null);
        if (clip.live) startLive(clip.live, clip.width, clip.height, signal);
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
