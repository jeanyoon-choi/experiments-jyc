// Sample-level building blocks for 금속 and 알림 (user, 2026-10-26). Pure: every
// voice is a Float32Array computed from its note, so it can be checked in Node
// (synth.test.ts) and wrapped in an AudioBuffer by the engine. Modes are damped
// two-pole resonators (two multiplies a sample), so a 3 s tone costs a few
// milliseconds once and is cached.

export const SYNTH_RATE = 32_000;
const NYQUIST_GUARD = SYNTH_RATE * 0.45;

export const midiToHz = (note: number) => 440 * 2 ** ((note - 69) / 12);

/** A small seeded generator, so a note's noise is the same each render. */
export function random(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let x = Math.imul(state ^ (state >>> 15), 1 | state);
    x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Adds one struck mode: a sine at `frequency` decaying with time constant `decay`
 * (seconds), starting at zero phase from `start` (seconds). Skipped above ~0.45 of the rate.
 */
export function addMode(out: Float32Array, frequency: number, amplitude: number, decay: number, start = 0) {
  if (frequency <= 0 || frequency >= NYQUIST_GUARD || amplitude === 0) return;
  const w = (2 * Math.PI * frequency) / SYNTH_RATE;
  const r = Math.exp(-1 / (decay * SYNTH_RATE));
  const a1 = 2 * r * Math.cos(w);
  const a2 = r * r;
  let y1 = 0;
  let y2 = 0;
  const first = Math.floor(start * SYNTH_RATE);
  const end = Math.min(out.length, first + Math.ceil(decay * SYNTH_RATE * 9));
  for (let index = first; index < end; index += 1) {
    const y = (index === first ? amplitude * Math.sin(w) : 0) + a1 * y1 - a2 * y2;
    out[index]! += y;
    y2 = y1;
    y1 = y;
  }
}

/** A biquad band-pass (RBJ, constant peak gain) run over `data` in place. */
export function bandpass(data: Float32Array, frequency: number, q: number) {
  const w = (2 * Math.PI * Math.min(frequency, NYQUIST_GUARD)) / SYNTH_RATE;
  const alpha = Math.sin(w) / (2 * q);
  const a0 = 1 + alpha;
  const b0 = alpha / a0;
  const a1 = (-2 * Math.cos(w)) / a0;
  const a2 = (1 - alpha) / a0;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let index = 0; index < data.length; index += 1) {
    const x = data[index]!;
    const y = b0 * x - b0 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    data[index] = y;
  }
}

/** A burst of noise `seconds` long, decaying with `decay`, through a band-pass, added at `start`. */
export function addClick(out: Float32Array, seed: number, frequency: number, q: number, level: number, decay: number, start = 0) {
  const next = random(seed);
  const burst = new Float32Array(Math.ceil(decay * 8 * SYNTH_RATE));
  for (let index = 0; index < burst.length; index += 1) burst[index] = (next() * 2 - 1) * Math.exp(-index / (decay * SYNTH_RATE));
  bandpass(burst, frequency, q);
  const first = Math.floor(start * SYNTH_RATE);
  for (let index = 0; index < burst.length && first + index < out.length; index += 1) out[first + index]! += burst[index]! * level;
}

/** A raised-cosine fade-in over `seconds` (a soft mallet, a rounded onset). */
export function fadeIn(data: Float32Array, seconds: number) {
  const length = Math.min(data.length, Math.floor(seconds * SYNTH_RATE));
  for (let index = 0; index < length; index += 1) data[index]! *= 0.5 - 0.5 * Math.cos((Math.PI * index) / length);
}

/** A raised-cosine fade-out over the last `seconds`, so no buffer ends on a click. */
export function fadeOut(data: Float32Array, seconds: number) {
  const length = Math.min(data.length, Math.floor(seconds * SYNTH_RATE));
  for (let index = 0; index < length; index += 1) data[data.length - 1 - index]! *= 0.5 - 0.5 * Math.cos((Math.PI * index) / length);
}

/** tanh saturation, level-compensated so the peak stays where it was. */
export function saturate(data: Float32Array, drive: number) {
  const peak = Math.max(1e-9, peakOf(data));
  const scale = 1 / Math.tanh(drive);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.tanh((drive * data[index]!) / peak) * scale * peak;
}

export function peakOf(data: Float32Array) {
  let largest = 0;
  for (const value of data) largest = Math.max(largest, Math.abs(value));
  return largest;
}

/** Scales `data` so its peak sits at `peak`: every note and voice arrives at one level. */
export function normalise(data: Float32Array<ArrayBuffer>, peak = 0.9) {
  const largest = peakOf(data);
  if (!largest) return data;
  const gain = peak / largest;
  for (let index = 0; index < data.length; index += 1) data[index]! *= gain;
  return data;
}
