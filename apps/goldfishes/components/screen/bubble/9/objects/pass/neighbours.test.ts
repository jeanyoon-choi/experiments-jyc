import assert from "node:assert/strict";
import test from "node:test";
import { BUBBLE_FLOATS, createNeighbours, NEIGHBOURS } from "./neighbours.ts";

// A fixed raft: a seeded scatter, a tight block (more than four near each), and a column of equal left edges (ties).
function fixture(count: number) {
  const bubbles = new Float32Array(count * BUBBLE_FLOATS);
  let state = 12345;
  const roll = () => (state = (state * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let index = 0; index < count; index += 1) {
    const at = index * BUBBLE_FLOATS;
    if (index < 12) {
      bubbles[at] = roll() * 300;
      bubbles[at + 1] = roll() * 200;
      bubbles[at + 2] = 8 + roll() * 22;
    } else if (index < 20) {
      bubbles[at] = 150 + (index % 4) * 14;
      bubbles[at + 1] = 100 + Math.floor((index - 12) / 4) * 14;
      bubbles[at + 2] = 9;
    } else {
      bubbles[at] = 60;
      bubbles[at + 1] = 20 + (index - 20) * 21;
      bubbles[at + 2] = 10;
    }
    bubbles[at + 3] = roll();
  }
  return bubbles;
}

// What object-pass.ts's own findNeighbours answered for this raft before it was moved here (2026-11-18): the same
// ids in the same slots, so every object mirrors the same spheres in the same order.
const PINNED: [count: number, size: number, ids: number[]][] = [
  [28, 1.05, [14, 15, 3, -1, 2, 19, -1, -1, 11, 1, -1, -1, 0, -1, -1, -1, 27, 24, 25, 26, 23, 8, 6, 24, 7, 8, 23, 22, 6, 12, 16, 13, 5, 6, 23, 22, -1, -1, -1, -1, 4, 11, -1, -1, 10, 2, -1, -1, 7, 16, 13, 17, 14, 12, 18, 17, 13, 19, 15, 18, 0, 14, 18, 19, 7, 12, 13, 17, 18, 12, 16, 13, 19, 17, 14, 15, 14, 18, 15, 1, 21, -1, -1, -1, 8, 6, 20, 22, 23, 8, 6, 21, 5, 8, 6, 22, 5, 25, 6, 23, 5, 4, 24, 26, 4, 25, 27, -1, 4, 26, -1, -1]],
  [28, 0.5, [14, 15, 3, -1, 2, 19, -1, -1, 11, 1, -1, -1, 0, -1, -1, -1, 10, 25, 26, 27, 23, 8, 6, 24, 7, 8, 23, 22, 6, 12, 16, 13, 5, 6, 23, 22, -1, -1, -1, -1, 4, 11, -1, -1, 10, 2, -1, -1, 7, 16, 13, 17, 14, 12, 18, 17, 13, 19, 18, 15, 14, 18, 0, 19, 7, 12, 13, 17, 18, 12, 16, 13, 19, 17, 14, 15, 14, 18, 15, 1, 21, -1, -1, -1, 8, 6, 20, 22, 23, 8, 6, 21, 5, 8, 6, 22, 5, 6, 23, 25, 5, 4, 24, 26, 4, 25, 27, -1, 4, 26, -1, -1]],
  [17, 1.5, [3, 15, 13, 14, 11, 14, 2, 15, 10, 11, 15, 1, 0, 9, -1, -1, 5, 6, 7, 10, 4, 8, 6, 7, 5, 4, 8, 7, 13, 12, 16, 6, 5, 6, 7, -1, 3, -1, -1, -1, 4, 16, 2, 11, 2, 1, 10, 16, 14, 7, 16, 13, 7, 12, 16, 14, 0, 12, 15, 13, 1, 13, 0, 14, 12, 7, 13, 14]],
];

test("each bubble's neighbours are those the object pass found before, in the same slots; frames do not leak into each other", () => {
  const bubbles = fixture(28);
  // One finder for every case, as one pass over many frames: a frame of fewer bubbles, then more again.
  const neighbours = createNeighbours(64);
  for (const [count, size, ids] of [...PINNED, PINNED[0]!]) {
    neighbours.find(bubbles, count, size);
    assert.deepEqual([...neighbours.ids.subarray(0, count * NEIGHBOURS)], ids, `${count} bubbles at size ${size}`);
  }
});
