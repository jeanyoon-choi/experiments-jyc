import assert from "node:assert/strict";
import test from "node:test";
import {
  LIGHT_SPEED,
  MAX_BETA,
  MIN_COMPACT_SCALE,
  boostMatrix,
  clampBeta,
  clockRate,
  compactImage,
  compactScale,
  integrateLag,
  lensSource,
  multiply3,
  observerOffsetToRest,
  observerToRestMatrix,
  potentialDepth,
  wrapTime,
} from "./physics.mjs";

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≉ ${b}`);
const ETA = [-1, 0, 0, 0, 1, 0, 0, 0, 1];
const transpose = (m) => [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];

test("a boost preserves the Minkowski interval", () => {
  const b = boostMatrix(0.6, -0.3);
  const check = multiply3(transpose(b), multiply3(ETA, b));
  check.forEach((value, i) => close(value, ETA[i]));
});

test("boost(-β) inverts boost(β)", () => {
  const product = multiply3(boostMatrix(0.5, 0.2), boostMatrix(-0.5, -0.2));
  product.forEach((value, i) => close(value, i % 4 === 0 ? 1 : 0));
});

test("one boost along x tilts the now by γβ/C per frame height", () => {
  const beta = 0.6;
  const gamma = 1 / Math.sqrt(1 - beta * beta);
  const rest = observerOffsetToRest(observerToRestMatrix([[beta, 0]]), 1, 0);
  close(rest.dt, (gamma * beta) / LIGHT_SPEED);
  close(rest.dx, gamma); // the observer sees a length-contracted scene
  close(rest.dy, 0);
});

test("two perpendicular boosts do not commute", () => {
  const ab = observerToRestMatrix([[0.6, 0], [0, 0.6]]);
  const ba = observerToRestMatrix([[0, 0.6], [0.6, 0]]);
  const differs = ab.some((value, i) => Math.abs(value - ba[i]) > 1e-6);
  assert.ok(differs);
  // Both remain Lorentz transformations.
  const check = multiply3(transpose(ab), multiply3(ETA, ab));
  check.forEach((value, i) => close(value, ETA[i]));
});

test("velocities are clamped inside the light cone", () => {
  const [x, y] = clampBeta(3, 4);
  close(Math.hypot(x, y), MAX_BETA);
  assert.deepEqual(clampBeta(Number.NaN, 0.1), [0, 0.1]);
});

test("compact space: copies repeat the scene and age with distance", () => {
  close(compactScale(0), 1);
  close(compactScale(1), MIN_COMPACT_SCALE);
  const home = compactImage(0.1, -0.05, 16 / 9, 0.5);
  assert.deepEqual([home.i, home.j, home.delay], [0, 0, 0]);
  close(home.localX, 0.2);
  const next = compactImage((16 / 9) * 0.5 + 0.1, 0, 16 / 9, 0.5);
  assert.equal(next.i, 1);
  close(next.localX, 0.2);
  close(next.delay, ((16 / 9) * 0.5) / LIGHT_SPEED);
  close(wrapTime(-1, 4), 3);
});

test("clocks run slow near a mass and the lag only grows", () => {
  const masses = [{ x: 0.5, y: 0.5, mu: 0.05 }];
  const near = clockRate(potentialDepth(masses, 0.5, 0.5));
  const far = clockRate(potentialDepth(masses, 5, 5));
  assert.ok(near < far && far < 1);
  const lag = new Float64Array(4);
  integrateLag(lag, 2, 2, 1, masses, 0.5);
  const first = [...lag];
  integrateLag(lag, 2, 2, 1, masses, 0.5);
  lag.forEach((value, i) => assert.ok(value > first[i] && first[i] > 0));
  integrateLag(lag, 2, 2, 1, [], 1);
  lag.forEach((value, i) => close(value, first[i] * 2));
});

test("lensing pulls the source toward the mass", () => {
  const masses = [{ x: 0, y: 0, mu: 0.05 }];
  const source = lensSource(masses, 0.3, 0);
  assert.ok(source.x < 0.3 && source.x > 0);
  close(source.y, 0);
});
