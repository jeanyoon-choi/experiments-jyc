/**
 * Deterministic, timer-free lid motion for the volumetric eye studies.
 * The owner advances this state from its own render loop; no wall-clock work is
 * retained while an eye is paused or unmounted.
 */
export type EyeBlink3DState = {
  readonly seed: number;
  random: number;
  phase: "open" | "closing" | "closed" | "opening";
  elapsed: number;
  duration: number;
  delay: number;
  speed: number;
  /** The next blink is the second half of an already-authorized double blink. */
  followup: boolean;
  /** Only an ordinary blink may authorize one follow-up. */
  blinkMayDouble: boolean;
};

const MIN_INTERVAL = 2.5;
const MAX_INTERVAL = 7;
const MAX_DELTA = 0.25;

function seedFor(index: number) {
  let value = (Math.trunc(index) + 1) >>> 0;
  value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
  return value >>> 0 || 0x6d2b79f5;
}

function random(state: EyeBlink3DState) {
  let value = state.random >>> 0;
  value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
  state.random = value >>> 0 || 0x6d2b79f5;
  return state.random / 0x1_0000_0000;
}

function between(state: EyeBlink3DState, min: number, max: number) {
  return min + (max - min) * random(state);
}

function pace(state: EyeBlink3DState) { return 0.94 + (state.seed % 101) / 100 * 0.12; }

function reset(state: EyeBlink3DState) {
  state.random = state.seed;
  state.phase = "open";
  state.elapsed = 0;
  state.duration = 0;
  state.delay = between(state, MIN_INTERVAL, MAX_INTERVAL);
  state.followup = false;
  state.blinkMayDouble = false;
}

/** Creates a stable cadence for one story identity. */
export function createEyeBlink3D(index: number): EyeBlink3DState {
  const state: EyeBlink3DState = {
    seed: seedFor(index), random: seedFor(index), phase: "open", elapsed: 0,
    duration: 0, delay: 0, speed: 1, followup: false, blinkMayDouble: false,
  };
  reset(state);
  return state;
}

function beginBlink(state: EyeBlink3DState) {
  const isFollowup = state.followup;
  state.followup = false;
  state.blinkMayDouble = !isFollowup && random(state) < 0.11;
  state.phase = "closing";
  state.elapsed = 0;
  // Fast close, brief full closure, and a distinctly slower reopening.
  state.duration = between(state, 0.11, 0.145) * pace(state) / state.speed;
}

/** Change motion speed without jumping the lid mid-blink. Cadence is unchanged. */
export function setEyeBlink3DSpeed(state: EyeBlink3DState, speed: number) {
  const next = Math.min(1.4, Math.max(0.4, Number.isFinite(speed) ? speed : 1));
  const ratio = state.speed / next;
  if (state.phase !== "open") {
    state.elapsed *= ratio;
    state.duration *= ratio;
  }
  state.speed = next;
}

/** Replace any pending/active blink with exactly one explicit blink. */
export function triggerEyeBlink3D(state: EyeBlink3DState) {
  state.followup = false;
  beginBlink(state);
  state.blinkMayDouble = false;
}

function finishPhase(state: EyeBlink3DState) {
  state.elapsed = 0;
  if (state.phase === "closing") {
    state.phase = "closed";
    state.duration = between(state, 0.045, 0.075) * pace(state) / state.speed;
  } else if (state.phase === "closed") {
    state.phase = "opening";
    state.duration = between(state, 0.17, 0.22) * pace(state) / state.speed;
  } else {
    state.phase = "open";
    state.delay = state.blinkMayDouble ? between(state, 0.12, 0.26) : between(state, MIN_INTERVAL, MAX_INTERVAL);
    state.followup = state.blinkMayDouble;
    state.blinkMayDouble = false;
    state.duration = 0;
  }
}

function openness(state: EyeBlink3DState) {
  if (state.phase === "open") return 1;
  if (state.phase === "closed") return 0;
  const progress = Math.min(1, state.elapsed / state.duration);
  return state.phase === "closing" ? 1 - progress : progress;
}

/**
 * Advances at most 250 ms, preventing a restored tab from replaying a long
 * sequence of missed blinks. Disabled eyes reset to an open, paused cadence.
 */
export function advanceEyeBlink3D(state: EyeBlink3DState, deltaSeconds: number, enabled: boolean): number {
  if (!enabled) {
    reset(state);
    return 1;
  }
  let remaining = Math.min(MAX_DELTA, Math.max(0, Number.isFinite(deltaSeconds) ? deltaSeconds : 0));
  while (remaining > 0) {
    const limit = state.phase === "open" ? state.delay : state.duration - state.elapsed;
    const step = Math.min(remaining, Math.max(0, limit));
    if (state.phase === "open") state.delay -= step;
    else state.elapsed += step;
    remaining -= step;
    if (step < limit) break;
    if (state.phase === "open") beginBlink(state);
    else finishPhase(state);
  }
  return openness(state);
}
