// The membrane's solver against the sweep it stands for (fields.ts solveMembrane): row by row, one cell after
// another. Every bit must be the same: the fields, and so the picture, are made from it.

import assert from "node:assert/strict";
import test from "node:test";
import { FIELD_EXTENT, solveMembrane } from "./fields.ts";

/** The sweep as it was written until 2026-11-24. */
function rowByRow(inside: Uint8Array, size: number) {
  const step = (FIELD_EXTENT * 2) / size;
  const u = new Float64Array(size * size);
  const relax = 2 / (1 + Math.sin(Math.PI / size));
  for (let sweep = 0; sweep < size * 3; sweep += 1) {
    for (let y = 1; y < size - 1; y += 1) {
      for (let x = 1; x < size - 1; x += 1) {
        const at = y * size + x;
        if (!inside[at]) continue;
        const next = (u[at - 1]! + u[at + 1]! + u[at - size]! + u[at + size]! + step * step) / 4;
        u[at] = u[at]! + relax * (next - u[at]!);
      }
    }
  }
  return u;
}

function lehmer(seed: number) {
  let state = seed;
  return () => {
    state = (state * 48_271) % 2_147_483_647;
    return state / 2_147_483_647;
  };
}

/** Masks of every sort: discs, bars, rings, holes, noise, single cells in the corners, everything, nothing. */
function masks(size: number) {
  const random = lehmer(20_261_124 + size);
  const made: Uint8Array[] = [];
  for (let index = 0; index < 10; index += 1) {
    const mask = new Uint8Array(size * size);
    const cx = size * (0.3 + random() * 0.4);
    const cy = size * (0.3 + random() * 0.4);
    const radius = size * (0.06 + random() * 0.3);
    for (let y = 0; y < size; y += 1) {
      for (let x = 0; x < size; x += 1) {
        const dx = x - cx;
        const dy = y - cy;
        const sort = index % 5;
        mask[y * size + x] =
          sort === 0 ? Number(dx * dx + dy * dy < radius * radius)
          : sort === 1 ? Number(Math.abs(dx) < radius && Math.abs(dy) < radius * 0.3)
          : sort === 2 ? Number(dx * dx + dy * dy < radius * radius && Math.sin(x * 0.4) * Math.cos(y * 0.3) > -0.3)
          : sort === 3 ? Number(random() < 0.6)
          : Number(Math.abs(Math.hypot(dx, dy) - radius) < 3);
      }
    }
    made.push(mask);
  }
  const corners = new Uint8Array(size * size);
  for (const at of [size + 1, size * 2 - 2, (size - 2) * size + 1, (size - 1) * size - 2, 5 * size + 5, 0, size * size - 1]) corners[at] = 1;
  made.push(corners, new Uint8Array(size * size).fill(1), new Uint8Array(size * size));
  return made;
}

test("the membrane is, bit for bit, the row-by-row sweep's", () => {
  // 128 and 256 are the grids in use (MEMBRANE_SIZE, MARK_MEMBRANE); the small ones have fewer rows than are swept abreast.
  for (const size of [3, 4, 5, 6, 7, 9, 32, 128, 256]) {
    for (const [index, mask] of masks(size).entries()) {
      const found = new Uint8Array(solveMembrane(mask, size).buffer);
      const wanted = new Uint8Array(rowByRow(mask, size).buffer);
      assert.ok(found.every((byte, at) => byte === wanted[at]), `size ${size}, mask ${index}`);
    }
  }
});
