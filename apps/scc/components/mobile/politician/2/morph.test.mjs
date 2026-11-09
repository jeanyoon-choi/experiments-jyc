import assert from "node:assert/strict";
import test from "node:test";
import { LEE_LANDMARKS, MOON_LANDMARKS, PARK_LANDMARKS, YOON_LANDMARKS } from "./landmarks.ts";
import { buildDisplacements, cornerWeights } from "./morph.ts";

const faces = [MOON_LANDMARKS, PARK_LANDMARKS, LEE_LANDMARKS, YOON_LANDMARKS];
const grid = buildDisplacements(faces);
const sample = (x, y) => {
  const column = Math.min(grid.width - 1, Math.max(0, Math.round(x * grid.width - 0.5)));
  const row = Math.min(grid.height - 1, Math.max(0, Math.round(y * grid.height - 0.5)));
  const offset = (row * grid.width + column) * 4;
  return [...grid.first.slice(offset, offset + 4), ...grid.second.slice(offset, offset + 4)];
};

test("all four landmark sets have the same points", () => {
  for (const face of faces) assert.equal(face.length, MOON_LANDMARKS.length);
});

test("each field carries the mean landmark close to that face's landmark", () => {
  let worst = 0;
  for (let index = 0; index < MOON_LANDMARKS.length; index += 2) {
    const mean = [0, 1].map((axis) => faces.reduce((sum, face) => sum + face[index + axis], 0) / 4);
    const got = sample(mean[0], mean[1]);
    faces.forEach((face, k) => {
      worst = Math.max(worst, Math.hypot(got[k * 2] - (face[index] - mean[0]), got[k * 2 + 1] - (face[index + 1] - mean[1])));
    });
  }
  assert.ok(worst < 0.012, `worst landmark miss ${worst}`);
});

test("the frame edge stays put", () => {
  for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1], [0.5, 0], [0.5, 1]]) {
    for (const value of sample(x, y)) assert.ok(Math.abs(value) < 0.01, `edge (${x}, ${y}) moves ${value}`);
  }
});

test("corners hold one face whole; the middle holds all four", () => {
  assert.deepEqual(cornerWeights(0.05, 0.05), [1, 0, 0, 0]);
  assert.deepEqual(cornerWeights(0.95, 0.05), [0, 1, 0, 0]);
  assert.deepEqual(cornerWeights(0.05, 0.95), [0, 0, 1, 0]);
  assert.deepEqual(cornerWeights(0.95, 0.95), [0, 0, 0, 1]);
  for (const weight of cornerWeights(0.5, 0.5)) assert.ok(Math.abs(weight - 0.25) < 1e-9);
  const sum = cornerWeights(0.3, 0.7).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9);
});
