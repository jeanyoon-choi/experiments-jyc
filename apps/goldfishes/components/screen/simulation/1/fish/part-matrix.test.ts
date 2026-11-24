import assert from "node:assert/strict";
import test from "node:test";
import { Euler, Matrix4, Quaternion, Vector3 } from "three";
import { localMatrix, place } from "./part-matrix.ts";

function close(actual: ArrayLike<number>, expected: ArrayLike<number>, tolerance: number) {
  for (let index = 0; index < 16; index += 1) {
    assert.ok(Math.abs(actual[index]! - expected[index]!) <= tolerance, `element ${index}: ${actual[index]} for ${expected[index]}`);
  }
}

// The scene's own moving parts (tail, a side fin) and one of everything at once.
const PARTS: readonly (readonly number[])[] = [
  [0.15, 0, 0, 0, 0, 0, 5.65, 3.38, 2.72],
  [-6.05, 0, 0, -0.58, 0.31, 0, 1, 1, 1],
  [1.25, -0.1, 2.28, 0.83, -0.12, -0.3, 0.88, 0.68, 0.84],
  [3, -2, 7, 1.1, -2.3, 0.7, 0.5, 2, 1.5],
];

test("a part's matrix is three's compose of its position, XYZ Euler rotation and scale", () => {
  for (const [x, y, z, rx, ry, rz, sx, sy, sz] of PARTS as readonly [number, number, number, number, number, number, number, number, number][]) {
    const expected = new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromEuler(new Euler(rx, ry, rz, "XYZ")), new Vector3(sx, sy, sz));
    close(localMatrix(new Float64Array(16), x, y, z, rx, ry, rz, sx, sy, sz), expected.elements, 1e-12);
  }
});

test("placing a part is the fish's matrix times the part's, at the part's slot only", () => {
  const root = new Matrix4().compose(new Vector3(120, 10.4, -45), new Quaternion().setFromEuler(new Euler(0.6, -1.9, 0, "YXZ")), new Vector3(0.65, 0.65, 0.65));
  const local = localMatrix(new Float64Array(16), 1.25, -0.1, 2.28, 0.83, -0.12, -0.3, 0.88, 0.68, 0.84);
  const out = new Float32Array(48).fill(7);
  place(out, 16, Float64Array.from(root.elements), local);
  const expected = root.clone().multiply(new Matrix4().fromArray(Array.from(local)));
  close(out.subarray(16, 32), Float32Array.from(expected.elements), 1e-5);
  assert.ok(out.subarray(0, 16).every((value) => value === 7) && out.subarray(32).every((value) => value === 7));
});
