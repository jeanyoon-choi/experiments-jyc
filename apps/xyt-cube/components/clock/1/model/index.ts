// clock/1 pure model: a clock's (x, y, t) cube and the cut plane through it.
//
// Nothing is recorded. The clock is a function of (x, y, t): a face that does
// not change with t (a cylinder in the cube) and three hands whose angle is a
// function of t (helical sheets). The plane math is copied from
// moving-image/1's plane.mjs (standalone; no import across experiments).
//
// Units: lengths are the viewport's shorter side (= 1). The clock's radius is
// 0.4 (diameter 0.8 × min(width, height), as SCC fractal/clock/1's root).
// The cube's t axis is z: toward the viewer is later. `span` seconds of clock
// time fill the cube's depth, which equals the viewport's longer side
// (Fels, Lee & Mase: depth = width).

export type Quaternion = [number, number, number, number];
export type Vector = [number, number, number];

export const IDENTITY: Quaternion = [1, 0, 0, 0];

export type Pivot = "now" | "cube";
export const PIVOTS: readonly Pivot[] = ["now", "cube"];

/** analogue: one clock; digital: seven segments; fractal: SCC's tree of clocks on hand tips. */
export type Stimulus = "analogue" | "digital" | "fractal";
export const STIMULI: readonly Stimulus[] = ["analogue", "digital", "fractal"];

/** Seconds of clock time across the cube's depth. */
export const SPANS = [60, 60 * 60, 12 * 60 * 60] as const;
export type Span = (typeof SPANS)[number];
export const DEFAULT_SPAN: Span = 60 * 60;

export const CLOCK_RADIUS = 0.4;
export const TWELVE_HOURS = 12 * 60 * 60;
export const DAY = 24 * 60 * 60;

/** SCC fractal/clock/1's hands: length (× radius), width (× radius), period. The second hand is 2.5× SCC's width (0.012): on a turned cut it is met only for the instant it sweeps a point, so a thin one fades out. */
export const HANDS = [
  { id: "hour", length: 0.53, width: 0.035, period: TWELVE_HOURS },
  { id: "minute", length: 0.74, width: 0.023, period: 60 * 60 },
  { id: "second", length: 0.9, width: 0.03, period: 60 },
] as const;

const TAU = Math.PI * 2;

// ---------------------------------------------------------------- quaternions

export function normalize(q: Quaternion): Quaternion {
  const length = Math.hypot(q[0], q[1], q[2], q[3]);
  if (!(length > 1e-9)) return [...IDENTITY];
  return [q[0] / length, q[1] / length, q[2] / length, q[3] / length];
}

/** Hamilton product a·b: apply b, then a. */
export function multiply(a: Quaternion, b: Quaternion): Quaternion {
  return [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
  ];
}

export function fromAxisAngle(axis: Vector, radians: number): Quaternion {
  const length = Math.hypot(axis[0], axis[1], axis[2]);
  if (!(length > 1e-9) || !Number.isFinite(radians)) return [...IDENTITY];
  const s = Math.sin(radians / 2) / length;
  return [Math.cos(radians / 2), axis[0] * s, axis[1] * s, axis[2] * s];
}

export function rotate(q: Quaternion, v: Vector): Vector {
  const [w, x, y, z] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [
    v[0] + w * tx + (y * tz - z * ty),
    v[1] + w * ty + (z * tx - x * tz),
    v[2] + w * tz + (x * ty - y * tx),
  ];
}

/**
 * The plane's orientation from two angles (radians): first `pitch` about the
 * cube's x axis (the screen's top and bottom lean into time), then `yaw` about
 * its y axis (left and right lean into time). Positive angles send the
 * screen's top (pitch) or right (yaw) toward later, so a 90° turn reads as a
 * timeline: later is up or to the right. Roll about t would only turn the
 * picture, so it is left out.
 */
export function planeOrientation(pitch: number, yaw: number): Quaternion {
  return normalize(multiply(fromAxisAngle([0, 1, 0], -yaw), fromAxisAngle([1, 0, 0], pitch)));
}

export function planeAxes(q: Quaternion): { u: Vector; v: Vector; w: Vector } {
  return { u: rotate(q, [1, 0, 0]), v: rotate(q, [0, 1, 0]), w: rotate(q, [0, 0, 1]) };
}

// ----------------------------------------------------------------------- cube

/** Box half sizes for a viewport (shorter side = 1); depth = the longer side. */
export function boxHalf(width: number, height: number): Vector {
  const short = Math.max(1, Math.min(width, height));
  const hx = width / short / 2;
  const hy = height / short / 2;
  return [hx, hy, Math.max(hx, hy)];
}

/**
 * Where the cut plane sits and how the cube's z maps to clock seconds.
 *
 *   now   the plane turns about (0, 0, 0), which is always the present
 *         (`now`); the cube is unbounded: t(z) = now + z · secondsPerUnit.
 *   cube  Fels: the cube is the block of `span` seconds containing `now`
 *         ([k·span, (k+1)·span)), bounded by the box; the plane passes through
 *         the box centre offset along its normal, sweeping the box once per block.
 *
 * Either way, an unturned plane shows exactly `now` everywhere.
 */
export function timeFrame(pivot: Pivot, w: Vector, half: Vector, now: number, span: number) {
  const secondsPerUnit = span / (2 * half[2]);
  if (pivot === "now") {
    return { origin: now, secondsPerUnit, centre: [0, 0, 0] as Vector, bounded: false };
  }
  const start = Math.floor(now / span) * span;
  const phase = (now - start) / span;
  const extent = 2 * (Math.abs(w[0]) * half[0] + Math.abs(w[1]) * half[1] + Math.abs(w[2]) * half[2]);
  const d = (phase - 0.5) * extent;
  return {
    origin: start + span / 2,
    secondsPerUnit,
    centre: [d * w[0], d * w[1], d * w[2]] as Vector,
    bounded: true,
  };
}

/** Clock seconds at a point of the cube. */
export function timeAt(frame: { origin: number; secondsPerUnit: number }, p: Vector) {
  return frame.origin + p[2] * frame.secondsPerUnit;
}

/**
 * Earliest and latest clock seconds on the screen (its four corners): how
 * much time one picture holds.
 */
export function screenTimeRange(
  frame: { origin: number; secondsPerUnit: number; centre: Vector },
  u: Vector,
  v: Vector,
  half: Vector,
) {
  let min = Infinity;
  let max = -Infinity;
  for (const sx of [-half[0], half[0]]) {
    for (const sy of [-half[1], half[1]]) {
      const z = frame.centre[2] + sx * u[2] + sy * v[2];
      const t = frame.origin + z * frame.secondsPerUnit;
      min = Math.min(min, t);
      max = Math.max(max, t);
    }
  }
  return { min, max };
}

// ---------------------------------------------------------------------- clock

/**
 * A turned cut's time thickness, in clock seconds: the time spanned by L
 * (screen units) along the cut, Δt = L·|∇ₛt|. Zero when the cut is flat.
 * (The shader's `cutThickness()` is this divided by secondsPerUnit.)
 */
export function cutTimeThickness(L: number, u: Vector, v: Vector, secondsPerUnit: number) {
  return L * Math.hypot(u[2], v[2]) * secondsPerUnit;
}

/** The angle (degrees) a hand sweeps in a time thickness: 360°·Δt/period. */
export function sweptDegrees(hand: 0 | 1 | 2, seconds: number) {
  return (360 * seconds) / HANDS[hand].period;
}

/** Seconds since local midnight (SCC clock/1 starts the root here). */
export function localClockSeconds(date: Date) {
  return date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds() + date.getMilliseconds() / 1000;
}

function unit(value: number) {
  return value - Math.floor(value);
}

/** A hand's turn at `seconds`, 0..1 clockwise from 12 (continuous sweep, geared). */
export function handTurn(hand: 0 | 1 | 2, seconds: number) {
  return unit(seconds / HANDS[hand].period);
}

/**
 * The same as an angle in the cube's xy plane (y up): the hand points along
 * (sin a, cos a), clockwise from 12.
 */
export function handDirection(hand: 0 | 1 | 2, seconds: number): [number, number] {
  const a = TAU * handTurn(hand, seconds);
  return [Math.sin(a), Math.cos(a)];
}

/** HH:MM:SS (24 h) digits shown by the digital clock at `seconds`. */
export function clockDigits(seconds: number): [number, number, number, number, number, number] {
  const whole = ((Math.floor(seconds) % DAY) + DAY) % DAY;
  const h = Math.floor(whole / 3600);
  const m = Math.floor(whole / 60) % 60;
  const s = whole % 60;
  return [Math.floor(h / 10), h % 10, Math.floor(m / 10), m % 10, Math.floor(s / 10), s % 10];
}

/**
 * Seven-segment masks, bit i = segment i: 0 top, 1 upper right, 2 lower
 * right, 3 bottom, 4 lower left, 5 upper left, 6 middle.
 */
export const SEGMENTS = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f] as const;

/**
 * The six digits as functions of time. Digit i holds one value for
 * DIGIT_UNITS[i] seconds (the hours' tens digit is counted per hour because it
 * wraps at 24); m = floor(seconds / unit) and the digit is digitAtUnit(i, m),
 * periodic in m with DIGIT_CYCLES[i]. The shader uses the same scheme.
 */
export const DIGIT_UNITS = [3600, 3600, 600, 60, 10, 1] as const;
export const DIGIT_CYCLES = [24, 24, 6, 10, 6, 10] as const;

export function digitAtUnit(index: number, m: number) {
  const cycle = DIGIT_CYCLES[index]!;
  const value = ((m % cycle) + cycle) % cycle;
  if (index === 0) return Math.floor(value / 10);
  if (index === 1) return value % 10;
  return value;
}

function lit(index: number, m: number, segment: number) {
  return (SEGMENTS[digitAtUnit(index, m)]! >> segment) & 1;
}

/** Longest window (in units) averaged exactly; longer windows use the cycle mean. */
export const EXACT_UNITS = 16;

/**
 * Fraction of the time window [a, b] (seconds) during which a segment of
 * digit `index` is lit: the digital clock's long exposure. The shader
 * computes the same per pixel.
 */
export function segmentLitFraction(index: number, segment: number, a: number, b: number) {
  const unitSeconds = DIGIT_UNITS[index]!;
  const lo = Math.min(a, b) / unitSeconds;
  const hi = Math.max(a, b) / unitSeconds;
  if (hi - lo < 1e-9) return lit(index, Math.floor(lo), segment);
  if (hi - lo > EXACT_UNITS) {
    const cycle = DIGIT_CYCLES[index]!;
    let sum = 0;
    for (let m = 0; m < cycle; m += 1) sum += lit(index, m, segment);
    return sum / cycle;
  }
  let total = 0;
  for (let m = Math.floor(lo); m < hi; m += 1) {
    const overlap = Math.min(hi, m + 1) - Math.max(lo, m);
    if (overlap > 0) total += overlap * lit(index, m, segment);
  }
  return total / (hi - lo);
}

/** "14:07:03" for clock seconds (author panel). */
export function formatClock(seconds: number) {
  return clockDigits(seconds)
    .map((digit, index) => (index === 2 || index === 4 ? `:${digit}` : `${digit}`))
    .join("");
}

/** "20분", "1시간 5분", "12초" for a duration in seconds (author panel). */
export function formatDuration(seconds: number) {
  const s = Math.round(Math.abs(seconds));
  if (s < 60) return `${s}초`;
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const rest = s % 60;
  if (h > 0) return m > 0 ? `${h}시간 ${m}분` : `${h}시간`;
  return rest > 0 && m < 10 ? `${m}분 ${rest}초` : `${m}분`;
}
