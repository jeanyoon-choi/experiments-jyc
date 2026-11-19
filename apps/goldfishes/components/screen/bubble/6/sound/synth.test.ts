import assert from "node:assert/strict";
import test from "node:test";
import { beam, clang, pipe, tink } from "./sound-metal.ts";
import { chime, droop, hymn, pop, swoosh, tap } from "./sound-notify.ts";
import { midiToHz, SYNTH_RATE } from "./synth.ts";

/** Share of the power within 25 Hz of the note's harmonics, over 4096 samples from `start` (s). */
function harmonicShare(data: Float32Array, note: number, start: number) {
  const f0 = midiToHz(note);
  const first = Math.floor(start * SYNTH_RATE);
  const size = 4096;
  let total = 0;
  let harmonic = 0;
  for (let bin = 1; bin < size / 2; bin += 1) {
    let re = 0;
    let im = 0;
    for (let index = 0; index < size; index += 1) {
      const x = data[first + index]! * (0.5 - 0.5 * Math.cos((2 * Math.PI * index) / size));
      const angle = (2 * Math.PI * bin * index) / size;
      re += x * Math.cos(angle);
      im -= x * Math.sin(angle);
    }
    const power = re * re + im * im;
    const ratio = (bin * SYNTH_RATE) / size / f0;
    total += power;
    if (Math.round(ratio) >= 1 && Math.abs(ratio - Math.round(ratio)) * f0 < 25) harmonic += power;
  }
  return harmonic / total;
}

const voices = {
  aluminium: clang(62, true, 1.4),
  steel: clang(50, false, 2),
  beam: beam(38, 3.6),
  pipe: pipe(62, 2.4),
  tink: tink(86),
  hymn: hymn(62),
  yelledChime: droop("chime", 50, 1.4),
  yelledPop: droop("pop", 62, 1.1),
  chime: chime(62),
  flipped: chime(38, 2.2),
  pop: pop(74),
  tap: tap(86),
  swoosh: swoosh(69),
};

test("every 금속 and 알림 voice is finite, at one peak, and ends in silence", () => {
  for (const [name, data] of Object.entries(voices)) {
    let peak = 0;
    for (const value of data) {
      assert.ok(Number.isFinite(value), name);
      peak = Math.max(peak, Math.abs(value));
    }
    assert.ok(Math.abs(peak - 0.9) < 1e-6, `${name} peaks at ${peak}`);
    assert.ok(Math.abs(data[data.length - 1]!) < 1e-4, `${name} ends on a click`);
  }
});

test("the voices sit on their notes, so the harmony holds; 금속 stays off them", () => {
  // A random spectrum would give 2·25 Hz / f0 of its power to the harmonics: 9–17% here.
  // 금속 must not resolve to a tuned tone as 유리 does (0–2% off its harmonics 0.3 s in).
  assert.ok(harmonicShare(voices.aluminium, 62, 0.3) < 0.7);
  assert.ok(harmonicShare(voices.steel, 50, 0.3) < 0.7);
  assert.ok(harmonicShare(voices.hymn, 62, 0.6) > 0.8);
  assert.ok(harmonicShare(voices.chime, 62, 0.05) > 0.6);
  assert.ok(harmonicShare(voices.pop, 74, 0.01) > 0.6);
  assert.ok(harmonicShare(voices.swoosh, 69, 0.12) > 0.3);
});
