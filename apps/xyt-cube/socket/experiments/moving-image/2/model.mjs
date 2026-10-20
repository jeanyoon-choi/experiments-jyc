// moving-image/2 relay state: which operation bends the cube, and how much.
//
// Every operation keeps its own amount (a, b), so switching operations on the
// screen returns to where each was left. Phones and the screen's drag send
// small changes; changes from any number of devices add up (the amount is
// their integral), within each operation's range. The relay also owns the
// playhead, its rate and the clip; browsers derive the present and the
// deformed cube from them.

import { addAmount, OPERATIONS } from "./geometry.mjs";

export const bendModelTiming = Object.freeze({ broadcastIntervalMs: 33 });

/** Playback rates the screen may choose: forward, still, reverse. */
export const BEND_RATES = Object.freeze([1, 0, -1]);

/** A change larger than this per message is not a hand; it is dropped. */
const MAX_DELTA = 2;

function flatAmounts() {
  return Object.fromEntries(OPERATIONS.map((operation) => [operation, [0, 0]]));
}

export function createBendRuntime(now = Date.now()) {
  return {
    operation: OPERATIONS[0],
    amounts: flatAmounts(),
    playhead: 0,
    rate: 1,
    anchoredAt: now,
    /** Clip id chosen on the screen; null = each browser's default. */
    clip: /** @type {string | null} */ (null),
  };
}

function playheadAt(runtime, now) {
  return runtime.playhead + (runtime.rate * (now - runtime.anchoredAt)) / 1000;
}

function readDelta(delta) {
  if (!Array.isArray(delta) || delta.length !== 2) return null;
  const values = delta.map(Number);
  if (!values.every((value) => Number.isFinite(value) && Math.abs(value) <= MAX_DELTA)) return null;
  if (values[0] === 0 && values[1] === 0) return null;
  return values;
}

/** Adds a change to the current operation's amount. @returns {boolean} changed */
export function bend(runtime, delta) {
  const change = readDelta(delta);
  if (!change) return false;
  const { operation } = runtime;
  const before = runtime.amounts[operation];
  const after = addAmount(operation, before, change);
  if (after[0] === before[0] && after[1] === before[1]) return false;
  runtime.amounts[operation] = after;
  return true;
}

/** The current operation back to flat. @returns {boolean} changed */
export function flatten(runtime) {
  const amount = runtime.amounts[runtime.operation];
  if (amount[0] === 0 && amount[1] === 0) return false;
  runtime.amounts[runtime.operation] = [0, 0];
  return true;
}

/** @returns {boolean} changed */
export function setOperation(runtime, operation) {
  if (!OPERATIONS.includes(operation) || operation === runtime.operation) return false;
  runtime.operation = operation;
  return true;
}

/** @returns {boolean} changed */
export function setRate(runtime, rate, now) {
  if (!BEND_RATES.includes(rate) || rate === runtime.rate) return false;
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

export function snapshotBend(runtime, now) {
  return {
    operation: runtime.operation,
    amounts: Object.fromEntries(OPERATIONS.map((operation) => [operation, [...runtime.amounts[operation]]])),
    playhead: playheadAt(runtime, now),
    rate: runtime.rate,
    clip: runtime.clip,
    serverTime: now,
  };
}
