import assert from "node:assert/strict";
import test from "node:test";
import { CHOO_LANDMARKS, JOO_LANDMARKS } from "./landmarks.ts";
import { buildDisplacement } from "./morph.ts";

const grid = buildDisplacement(JOO_LANDMARKS, CHOO_LANDMARKS);
const sample = (x, y) => {
  const column = Math.min(grid.width - 1, Math.max(0, Math.round(x * grid.width - 0.5)));
  const row = Math.min(grid.height - 1, Math.max(0, Math.round(y * grid.height - 0.5)));
  const offset = (row * grid.width + column) * 2;
  return [grid.data[offset], grid.data[offset + 1]];
};

test("both landmark sets have the same points", () => {
  assert.equal(JOO_LANDMARKS.length, CHOO_LANDMARKS.length);
  assert.equal(JOO_LANDMARKS.length % 2, 0);
});

test("the field carries each landmark close to its partner", () => {
  let worst = 0;
  for (let index = 0; index < JOO_LANDMARKS.length; index += 2) {
    const mid = [(JOO_LANDMARKS[index] + CHOO_LANDMARKS[index]) / 2, (JOO_LANDMARKS[index + 1] + CHOO_LANDMARKS[index + 1]) / 2];
    const want = [CHOO_LANDMARKS[index] - JOO_LANDMARKS[index], CHOO_LANDMARKS[index + 1] - JOO_LANDMARKS[index + 1]];
    const got = sample(mid[0], mid[1]);
    worst = Math.max(worst, Math.hypot(got[0] - want[0], got[1] - want[1]));
  }
  // Within about 10 px of the 900 px frame, grid and smoothing included.
  assert.ok(worst < 0.012, `worst landmark miss ${worst}`);
});

test("the frame edge stays put and the field stays smooth", () => {
  let largest = 0;
  for (let index = 0; index < grid.data.length; index += 2) {
    largest = Math.max(largest, Math.hypot(grid.data[index], grid.data[index + 1]));
  }
  assert.ok(largest < 0.12, `largest displacement ${largest}`);
  for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0], [0.5, 1]]) {
    const [dx, dy] = sample(x, y);
    assert.ok(Math.hypot(dx, dy) < 0.01, `edge (${x}, ${y}) moves ${Math.hypot(dx, dy)}`);
  }
});
