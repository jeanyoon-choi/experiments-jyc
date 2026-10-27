// 소리 v2 · 날것 (user, 2026-10-28): v1's soundscapes were "너무 다 멜로딕하고 ai slop
// … 너무 마리네이션이 많이됨". v2 keeps the engine's logic — a touch, a page's own voice,
// its rank, its pan, 부서짐 — and drops everything laid on top: no chord, no tempo grid
// for the notes, no room, no echo, no stacking into harmony. A touch is one phone sound,
// synthesised the way phones made them, bare waveforms with hard edges, at its own
// frequency ("brutal 하게 ui 효과음 … 합성으로"). Any chaos is the sounds overlapping.
//
//   - 삐 (beep): a pure sine at a fixed alert frequency, gated on and off;
//   - 진동 (buzz): the vibration motor on a table — a clipped ~170 Hz hum spinning up, rattling;
//   - 피처폰 (feature): a naive square wave (aliasing kept) playing a short jingle at
//     arbitrary frequencies, not on any scale;
//   - 키패드 (keypad): DTMF, the keypad's two tones at once;
//   - 딸깍 (click): a key tick, a shutter, a lock.

import { addClick, addMode, fadeOut, normalise, random, SYNTH_RATE } from "./synth.ts";

export type RawKind = "beep" | "buzz" | "feature" | "keypad" | "click";
export type RawScape = "mixed" | RawKind;

export const RAW_KINDS: readonly RawKind[] = ["beep", "buzz", "feature", "keypad", "click"];

export const RAW_SCAPES: readonly { id: RawScape; label: string }[] = [
  { id: "mixed", label: "섞임" },
  { id: "beep", label: "삐" },
  { id: "buzz", label: "진동" },
  { id: "feature", label: "피처폰" },
  { id: "keypad", label: "키패드" },
  { id: "click", label: "딸깍" },
];

/** Alert frequencies (Hz) a beep may sit on: round numbers, as devices use, not notes. */
const BEEPS = [880, 1000, 1200, 1500, 2000, 2400, 3000];
/** DTMF: the keypad's rows and columns (Hz). */
const DTMF_ROWS = [697, 770, 852, 941];
const DTMF_COLUMNS = [1209, 1336, 1477];
/** How many fixed variants each kind has: a page keeps one. */
export const RAW_VARIANTS: Record<RawKind, number> = { beep: BEEPS.length, buzz: 3, feature: 8, keypad: 12, click: 3 };

const samples = (seconds: number) => Math.floor(seconds * SYNTH_RATE);
/** A 1 ms edge, only so the gate does not click: everything else stays hard. */
const gate = (index: number, length: number) => Math.min(1, index / 32, (length - 1 - index) / 32);

/** Adds `count` gated bursts of `wave(t)`, `on` seconds each with `off` between. */
function gated(out: Float32Array, count: number, on: number, off: number, wave: (t: number, burst: number) => number, start = 0) {
  const length = samples(on);
  for (let burst = 0; burst < count; burst += 1) {
    const first = samples(start + burst * (on + off));
    for (let index = 0; index < length && first + index < out.length; index += 1) {
      out[first + index]! += wave(index / SYNTH_RATE, burst) * gate(index, length);
    }
  }
}

function beep(variant: number, count: number) {
  const frequency = BEEPS[variant % BEEPS.length]!;
  const out = new Float32Array(samples(count * 0.13));
  gated(out, count, 0.07, 0.06, (t) => Math.sin(2 * Math.PI * frequency * t));
  return out;
}

function buzz(variant: number, count: number) {
  const motor = 160 + 12 * variant;
  const next = random(variant * 977 + 13);
  const out = new Float32Array(samples(count * 0.34));
  let phase = 0;
  let last = -1;
  gated(out, count, 0.22, 0.12, (t, burst) => {
    if (burst !== last) {
      last = burst;
      phase = 0;
    }
    // Spinning up over 40 ms, clipped, and the table rattling with it.
    phase += (2 * Math.PI * motor * (0.6 + 0.4 * Math.min(1, t / 0.04))) / SYNTH_RATE;
    const hum = Math.tanh(3 * Math.sin(phase));
    const rattle = (next() * 2 - 1) * 0.35 * Math.abs(hum) * (Math.sin(2 * Math.PI * 23 * t) > 0 ? 1 : 0.4);
    return hum * 0.8 + rattle;
  });
  return out;
}

function feature(variant: number, count: number) {
  const next = random(variant * 7919 + 5);
  // A jingle of its own, anywhere from 700 to 2600 Hz.
  const tune = Array.from({ length: 4 }, () => 700 + 1900 * next());
  const notes = 1 + count;
  const out = new Float32Array(samples(notes * 0.11));
  gated(out, notes, 0.09, 0.02, (t, note) => (Math.sin(2 * Math.PI * tune[note % tune.length]! * t) >= 0 ? 0.6 : -0.6));
  return out;
}

function keypad(variant: number, count: number) {
  const out = new Float32Array(samples(count * 0.16));
  gated(out, count, 0.1, 0.06, (t, press) => {
    const key = (variant + press * 5) % 12;
    const low = DTMF_ROWS[Math.floor(key / 3)]!;
    const high = DTMF_COLUMNS[key % 3]!;
    return 0.5 * Math.sin(2 * Math.PI * low * t) + 0.5 * Math.sin(2 * Math.PI * high * t);
  });
  return out;
}

function click(variant: number, count: number) {
  const out = new Float32Array(samples(count * 0.09 + 0.06));
  for (let press = 0; press < count; press += 1) {
    const at = press * 0.09;
    if (variant === 0) {
      // A key's tick.
      addClick(out, press + 1, 3500, 2, 1, 0.0015, at);
      addMode(out, 4200, 0.3, 0.004, at);
    } else if (variant === 1) {
      // A shutter: two snaps of broad noise.
      addClick(out, press + 11, 2500, 0.7, 1, 0.006, at);
      addClick(out, press + 21, 1800, 0.7, 0.8, 0.01, at + 0.045);
    } else {
      // A lock: a low knock.
      addClick(out, press + 31, 1800, 3, 1, 0.002, at);
      addMode(out, 900, 0.6, 0.012, at);
    }
  }
  return out;
}

const RENDER: Record<RawKind, (variant: number, count: number) => Float32Array> = { beep, buzz, feature, keypad, click };

/** One phone sound: `kind`'s `variant`, sounding `count` times; level-matched, no ring after. */
export function rawVoice(kind: RawKind, variant: number, count: number) {
  const data = RENDER[kind](variant % RAW_VARIANTS[kind], Math.max(1, count)) as Float32Array<ArrayBuffer>;
  fadeOut(data, 0.002);
  return normalise(data);
}
