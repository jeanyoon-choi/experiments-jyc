// The spheres' neighbour lists, pinned on what foam.ts's sweep gave before it moved here (2026-11-18).

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { createNeighbourSweep } from "./neighbours.ts";
import { NEIGHBOURS, ROW } from "./units.ts";

// x y radius seed: overlaps, a tie of left edges (0 and 6), an empty radius (5), a pair apart (3 and 7).
const SMALL = new Float32Array([
  100, 100, 40, 0.1,   150, 100, 30, 0.2,   100, 150, 20, 0.3,   300, 300, 25, 0.4,
  130, 130, 10, 0.5,   60, 100, 0, 0.6,     100, 60, 40, 0.7,    320, 300, 25, 0.8,
]);

// A crowd: an LCG's bubbles, a dense knot among them so some press more than sixteen others.
function crowd(count: number) {
  let state = 12345;
  const random = () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296;
  const out = new Float32Array(count * 4);
  for (let i = 0; i < count; i += 1) {
    const knot = i % 5 === 0;
    out[i * 4] = knot ? 400 + random() * 120 : random() * 1600;
    out[i * 4 + 1] = knot ? 300 + random() * 120 : random() * 900;
    out[i * 4 + 2] = Math.round(4 + random() * (knot ? 40 : 22));
    out[i * 4 + 3] = random();
  }
  return out;
}

test("each bubble lists the bubbles it overlaps, in the order the sweep meets them", () => {
  const ids = createNeighbourSweep()(SMALL, 8);
  const lists = Array.from({ length: 8 }, (_, index) => Array.from(ids.subarray(index * NEIGHBOURS, (index + 1) * NEIGHBOURS)).filter((id) => id !== 0));
  assert.deepEqual(lists, [[7, 3, 2, 5], [1, 7, 5], [1], [8], [1, 2], [], [1, 2], [4]]);
});

test("a crowd's lists are those of the sweep as it was, the deepest sixteen kept", () => {
  const count = 3000;
  const sweep = createNeighbourSweep();
  const ids = sweep(crowd(count), count);
  const written = Math.ceil(count / ROW) * ROW * NEIGHBOURS;
  let full = 0;
  for (let index = 0; index < count; index += 1) if (ids[index * NEIGHBOURS + NEIGHBOURS - 1] !== 0) full += 1;
  assert.equal(full, 666);
  const digest = createHash("sha256").update(new Uint8Array(ids.buffer, ids.byteOffset, written * 4)).digest("hex");
  assert.equal(digest, "f3d1f7c56a7517ef75f80eee327a48f65ada9c26426d4fd163918f082648f495");
  // The scratch is reused: fewer bubbles next leave nothing of the last crowd in the rows written.
  const next = sweep(SMALL, 8);
  assert.equal(next, ids);
  assert.ok(next.subarray(8 * NEIGHBOURS, ROW * NEIGHBOURS).every((id) => id === 0));
});
