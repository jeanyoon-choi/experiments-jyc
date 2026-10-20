// clock/2 pure model: the clock's (x, y, t) cube, bent while the screen stays
// the flat present (moving-image/2's operation on clock/1's clock).
//
// Nothing is recorded: a face that does not change with t and three hands
// whose angle is a function of t. Units: lengths are the viewport's shorter
// side (= 1); the clock's radius is 0.4. The cube is the block of `span`
// seconds containing now (depth = the viewport's longer side); the present
// sweeps it once per span, like moving-image/2's present through its clip.
// The geometries live in ./geometry.mjs (copied from moving-image/2).

export {
  addAmount,
  cubeAt,
  OPERATION_SPECS,
  OPERATIONS,
  presentDepth,
  presentPlaneZ,
  sliceAt,
} from "./geometry.mjs";

export type BendOperation = "shear" | "cylinder" | "sphere" | "curvature" | "torus" | "mobius";
export type BendAmount = [number, number];

export type Vector = [number, number, number];

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

// ----------------------------------------------------------------------- cube

/** Box half sizes for a viewport (shorter side = 1); depth = the longer side. */
export function boxHalf(width: number, height: number): Vector {
  const short = Math.max(1, Math.min(width, height));
  const hx = width / short / 2;
  const hy = height / short / 2;
  return [hx, hy, Math.max(hx, hy)];
}

/**
 * The block the present sweeps: the `span` seconds containing `now`. Its
 * centre is z = 0 (clock time `origin`); the present lies at depth `present`,
 * from the back face to the front once per span.
 */
export function blockFrame(now: number, span: number, half: Vector) {
  const secondsPerUnit = span / (2 * half[2]);
  const start = Math.floor(now / span) * span;
  const origin = start + span / 2;
  return { origin, secondsPerUnit, present: (now - origin) / secondsPerUnit };
}

// ---------------------------------------------------------------------- clock

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
