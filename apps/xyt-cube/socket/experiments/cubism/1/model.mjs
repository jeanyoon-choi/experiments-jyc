// cubism/1 relay state: one cut plane shared by every device.
//
// Phones turn the plane by sending their own rotation since the last message
// (a delta in the plane's frame); deltas from any number of holders compose in
// arrival order, so the plane stays where the last hand left it. The relay
// also owns the playhead (seconds into the clip), its rate, the clip and the
// pivot; browsers derive where the plane sits from them.

import { IDENTITY, multiply, normalize, PIVOTS, readQuaternion } from "./plane.mjs";

export const cubismModelTiming = Object.freeze({ broadcastIntervalMs: 33 });

/** Playback rates the screen may choose: forward, still, reverse. */
export const CUBISM_RATES = Object.freeze([1, 0, -1]);

export function createCubismRuntime(now = Date.now()) {
  return {
    orientation: [...IDENTITY],
    playhead: 0,
    rate: 1,
    anchoredAt: now,
    /** Clip id chosen on the screen; null = each browser's default. */
    clip: /** @type {string | null} */ (null),
    /** Where the plane turns: "now" (present frame) or "cube" (Fels's sweep). */
    pivot: "now",
  };
}

function playheadAt(runtime, now) {
  return runtime.playhead + (runtime.rate * (now - runtime.anchoredAt)) / 1000;
}

/** @returns {boolean} changed */
export function turnPlane(runtime, delta) {
  const q = readQuaternion(delta);
  if (!q) return false;
  runtime.orientation = normalize(multiply(runtime.orientation, q));
  return true;
}

/** @returns {boolean} changed */
export function facePlane(runtime) {
  runtime.orientation = [...IDENTITY];
  return true;
}

/** @returns {boolean} changed */
export function setRate(runtime, rate, now) {
  if (!CUBISM_RATES.includes(rate) || rate === runtime.rate) return false;
  runtime.playhead = playheadAt(runtime, now);
  runtime.anchoredAt = now;
  runtime.rate = rate;
  return true;
}

/** @returns {boolean} changed */
export function setClip(runtime, clip) {
  if (typeof clip !== "string" || !/^[a-z0-9-]{1,64}$/.test(clip) || clip === runtime.clip) return false;
  runtime.clip = clip;
  return true;
}

/** @returns {boolean} changed */
export function setPivot(runtime, pivot) {
  if (!PIVOTS.includes(pivot) || pivot === runtime.pivot) return false;
  runtime.pivot = pivot;
  return true;
}

export function snapshotCubism(runtime, now) {
  return {
    orientation: [...runtime.orientation],
    playhead: playheadAt(runtime, now),
    rate: runtime.rate,
    clip: runtime.clip,
    pivot: runtime.pivot,
    serverTime: now,
  };
}
