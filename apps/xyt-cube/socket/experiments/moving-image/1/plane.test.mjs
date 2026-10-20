import assert from "node:assert/strict";
import test from "node:test";
import {
  bodyDelta,
  boxHalf,
  fromAxisAngle,
  fromDeviceOrientation,
  IDENTITY,
  multiply,
  planeAxes,
  planeCentre,
  readQuaternion,
  rotate,
  slerp,
} from "./plane.mjs";

const close = (a, b, eps = 1e-9) =>
  a.forEach((value, i) => assert.ok(Math.abs(value - b[i]) < eps, `${a} ≉ ${b}`));

test("identity is ordinary playback: the xy plane advancing along t", () => {
  const { u, v, w } = planeAxes(IDENTITY);
  close(u, [1, 0, 0]);
  close(v, [0, 1, 0]);
  close(w, [0, 0, 1]);
  const half = boxHalf(16 / 9);
  // Phase 0 is the back face (frame 0); phase 0.5 the middle. Both pivots agree here.
  for (const pivot of ["now", "cube"]) {
    close(planeCentre(pivot, w, half, 0), [0, 0, -half[2]]);
    close(planeCentre(pivot, w, half, 2.5), [0, 0, 0]);
  }
  // A portrait clip keeps a full frame height of time depth.
  assert.equal(boxHalf(0.5)[2], 0.5);
});

test("a quarter turn about y turns the screen's x axis into time (x–t slice)", () => {
  const q = fromAxisAngle([0, 1, 0], -Math.PI / 2);
  const { u, w } = planeAxes(q);
  close(u, [0, 0, 1]);
  close(w, [-1, 0, 0]);
  // The cube sweep then crosses the box's width; the now pivot stays on the t axis.
  const half = boxHalf(2);
  close(planeCentre("cube", w, half, 0), [1, 0, 0]);
  close(planeCentre("now", w, half, 0.25), [0, 0, -0.5]);
});

test("the phone's body delta turns the plane in its own frame", () => {
  const start = fromDeviceOrientation(30, 70, -10);
  const tiltTopAway = fromAxisAngle([1, 0, 0], -0.4);
  const after = multiply(start, tiltTopAway);
  close(bodyDelta(start, after), tiltTopAway);
  // Independent of where the phone points on earth.
  const elsewhere = fromDeviceOrientation(200, 10, 40);
  close(bodyDelta(elsewhere, multiply(elsewhere, tiltTopAway)), tiltTopAway);
});

test("rotate, slerp and untrusted input", () => {
  close(rotate(fromAxisAngle([0, 0, 1], Math.PI / 2), [1, 0, 0]), [0, 1, 0]);
  const half = slerp(IDENTITY, fromAxisAngle([1, 0, 0], 1), 0.5);
  close(half, fromAxisAngle([1, 0, 0], 0.5));
  assert.equal(readQuaternion([0, 0, 0, 0]), null);
  assert.equal(readQuaternion("q"), null);
  close(readQuaternion([2, 0, 0, 0]), [1, 0, 0, 0]);
});
