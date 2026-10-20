import assert from "node:assert/strict";
import test from "node:test";
import {
  blockFrame,
  boxHalf,
  clockDigits,
  digitAtUnit,
  DIGIT_UNITS,
  formatClock,
  handDirection,
  handTurn,
  segmentLitFraction,
  SEGMENTS,
} from "./index.ts";

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);

test("hands turn clockwise at conventional periods from 12", () => {
  // 3:00:00 — hour at 3, minute and second at 12.
  const three = 3 * 3600;
  close(handTurn(0, three), 0.25);
  close(handTurn(1, three), 0);
  close(handTurn(2, three), 0);
  const [x, y] = handDirection(0, three);
  close(x, 1); // y up: 3 o'clock points right
  close(y, 0);
  // Geared: 2:30 puts the hour hand halfway between 2 and 3.
  close(handTurn(0, 2.5 * 3600), 2.5 / 12);
  close(handTurn(1, 2.5 * 3600), 0.5);
  // Continuous sweep: 7.5 s is an eighth of a second-hand turn.
  close(handTurn(2, 7.5), 0.125);
});

test("digital digits read HH:MM:SS and agree with step digits", () => {
  const t = 14 * 3600 + 7 * 60 + 3.9;
  assert.deepEqual(clockDigits(t), [1, 4, 0, 7, 0, 3]);
  assert.equal(formatClock(t), "14:07:03");
  for (const time of [t, 23 * 3600 + 59 * 60 + 59, 9 * 3600 + 50 * 60 + 40, 20 * 3600, 86400 * 3 + 12]) {
    clockDigits(time).forEach((digit, i) => assert.equal(digitAtUnit(i, Math.floor(time / DIGIT_UNITS[i]!)), digit));
  }
  assert.deepEqual(clockDigits(24 * 3600 + 5), [0, 0, 0, 0, 0, 5]);
});

test("segment lit fraction is the time average of the seven segments", () => {
  // Inside one second: exactly the lit state.
  const t = 10 * 3600 + 8; // seconds ones digit = 8, all segments lit
  for (let s = 0; s < 7; s += 1) assert.equal(segmentLitFraction(5, s, t + 0.1, t + 0.2), 1);
  // Over a whole ten seconds: each segment's share of the ten digits.
  for (let s = 0; s < 7; s += 1) {
    const share = SEGMENTS.filter((mask) => (mask >> s) & 1).length / 10;
    close(segmentLitFraction(5, s, 100, 110), share);
  }
});

test("the present sweeps the block of its span once, from back to front", () => {
  const half = boxHalf(1600, 900);
  const span = 3600;
  const start = 14 * 3600;
  const begin = blockFrame(start, span, half);
  assert.ok(Math.abs(begin.present + half[2]) < 1e-9, "starts at the back face");
  const middle = blockFrame(start + span / 2, span, half);
  assert.ok(Math.abs(middle.present) < 1e-9, "the centre at the half-span");
  assert.equal(middle.origin, start + span / 2);
  const end = blockFrame(start + span - 1e-6, span, half);
  assert.ok(end.present < half[2] && end.present > half[2] - 1e-6, "ends at the front face");
});
