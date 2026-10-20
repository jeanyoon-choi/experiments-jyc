import assert from "node:assert/strict";
import test from "node:test";
import {
  boxHalf,
  clockDigits,
  cutTimeThickness,
  digitAtUnit,
  DIGIT_UNITS,
  formatClock,
  handDirection,
  handTurn,
  planeAxes,
  planeOrientation,
  screenTimeRange,
  segmentLitFraction,
  SEGMENTS,
  sweptDegrees,
  timeAt,
  timeFrame,
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

test("an unturned plane shows exactly now, in both pivots", () => {
  const half = boxHalf(1600, 1000);
  const now = 15 * 3600 + 22 * 60 + 9.25;
  for (const pivot of ["now", "cube"] as const) {
    for (const span of [60, 3600, 43200]) {
      const { u, v, w } = planeAxes(planeOrientation(0, 0));
      const frame = timeFrame(pivot, w, half, now, span);
      for (const s of [[0, 0], [0.7, -0.4], [-0.8, 0.5]]) {
        const p = [frame.centre[0] + s[0]! * u[0] + s[1]! * v[0], frame.centre[1] + s[0]! * u[1] + s[1]! * v[1], frame.centre[2] + s[0]! * u[2] + s[1]! * v[2]] as [number, number, number];
        close(timeAt(frame, p), now, 1e-6);
      }
    }
  }
});

test("a 90° turn about y lays the span across the screen's width", () => {
  const half = boxHalf(1600, 1000); // depth = width = 1.6
  const { u, v, w } = planeAxes(planeOrientation(0, Math.PI / 2));
  const frame = timeFrame("now", w, half, 1000, 3600);
  const range = screenTimeRange(frame, u, v, half);
  close(range.max - range.min, 3600, 1e-6);
  // Pitch 90°: the screen's height holds height/depth of the span.
  const pitched = planeAxes(planeOrientation(Math.PI / 2, 0));
  const pf = timeFrame("now", pitched.w, half, 1000, 3600);
  const pr = screenTimeRange(pf, pitched.u, pitched.v, half);
  close(pr.max - pr.min, 3600 / 1.6, 1e-6);
});

test("the cube pivot sweeps its block once per span", () => {
  const half = boxHalf(1000, 1000);
  const { w } = planeAxes(planeOrientation(0.3, 0.5));
  const span = 60;
  const start = timeFrame("cube", w, half, 120, span);
  const end = timeFrame("cube", w, half, 179.999999, span);
  // Start of the block: the plane touches the box's far corner along -w.
  const extent = Math.abs(w[0]) * half[0] + Math.abs(w[1]) * half[1] + Math.abs(w[2]) * half[2];
  close(start.centre[0] * w[0] + start.centre[1] * w[1] + start.centre[2] * w[2], -extent);
  close(end.centre[0] * w[0] + end.centre[1] * w[1] + end.centre[2] * w[2], extent, 1e-5);
  close(start.origin, 150);
});

test("positive turns send the screen's right and top toward later", () => {
  const yawed = planeAxes(planeOrientation(0, Math.PI / 6));
  assert.ok(yawed.u[2] > 0);
  close(yawed.v[2], 0);
  const pitched = planeAxes(planeOrientation(Math.PI / 6, 0));
  assert.ok(pitched.v[2] > 0);
  close(pitched.u[2], 0);
});

test("time thickness: zero flat; turned, slow hands stay sharp and fast ones fill their turns", () => {
  const half = boxHalf(1406, 703);
  const span = 3600;
  const flat = planeAxes(planeOrientation(0, 0));
  const flatFrame = timeFrame("now", flat.w, half, 0, span);
  assert.equal(cutTimeThickness(0.06, flat.u, flat.v, flatFrame.secondsPerUnit), 0);
  const turned = planeAxes(planeOrientation(0, Math.PI / 6));
  const frame = timeFrame("now", turned.w, half, 0, span);
  const dt = cutTimeThickness(0.06, turned.u, turned.v, frame.secondsPerUnit);
  assert.ok(dt > 50 && dt < 70, `about a minute at 30° in a 1 h cube, got ${dt}`);
  assert.ok(sweptDegrees(0, dt) < 1, "the hour hand barely moves");
  assert.ok(sweptDegrees(2, dt) >= 300, "the second hand sweeps (about) a full turn");
});
