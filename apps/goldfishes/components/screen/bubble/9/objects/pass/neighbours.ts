// Each bubble's nearest neighbours, for the coat's mirror (raft 이웃 반사): an object mirrors up to four of the
// spheres round it, found here on the CPU by a sweep and prune along x. The buffers are reused between frames.

/** A bubble's floats: x, y, radius, seed (render/foam.ts BUBBLE_FLOATS; object-pass.ts holds the two to each other). */
export const BUBBLE_FLOATS = 4;
/** Neighbours each object mirrors, nearest first. */
export const NEIGHBOURS = 4;

export type Neighbours = {
  /** Per bubble, its NEIGHBOURS nearest as found last (−1: none), in the order they were kept. */
  readonly ids: Int32Array;
  /** Finds them for the first `count` of `bubbles` (x y radius seed each), the objects drawn `size` times their discs. */
  find(bubbles: Float32Array, count: number, size: number): void;
};

export function createNeighbours(max: number): Neighbours {
  const order = new Int32Array(max);
  const lefts = new Float32Array(max);
  const ids = new Int32Array(max * NEIGHBOURS);
  const gaps = new Float32Array(max * NEIGHBOURS);
  // By left edge; made once, not per frame (the sort is stable: equal lefts stay in the bubbles' order).
  const byLeft = (a: number, b: number) => lefts[a]! - lefts[b]!;
  /** `order`'s first `sortedCount`, kept while the count stays. */
  let sorted = order.subarray(0, 0);
  let sortedCount = 0;
  const keep = (index: number, other: number, gap: number) => {
    const base = index * NEIGHBOURS;
    let slot = -1;
    let widest = -Infinity;
    for (let at = 0; at < NEIGHBOURS; at += 1) {
      if (ids[base + at]! < 0) {
        slot = at;
        break;
      }
      if (gaps[base + at]! > widest) {
        widest = gaps[base + at]!;
        slot = at;
      }
    }
    if (ids[base + slot]! >= 0 && gap >= widest) return;
    ids[base + slot] = other;
    gaps[base + slot] = gap;
  };
  const find = (bubbles: Float32Array, count: number, size: number) => {
    const grown = Math.max(1, size);
    ids.fill(-1, 0, count * NEIGHBOURS);
    for (let index = 0; index < count; index += 1) {
      order[index] = index;
      lefts[index] = bubbles[index * BUBBLE_FLOATS]! - bubbles[index * BUBBLE_FLOATS + 2]! * grown * 1.4;
    }
    if (sortedCount !== count) {
      sorted = order.subarray(0, count);
      sortedCount = count;
    }
    sorted.sort(byLeft);
    for (let at = 0; at < count; at += 1) {
      const a = sorted[at]!;
      const ax = bubbles[a * BUBBLE_FLOATS]!;
      const ay = bubbles[a * BUBBLE_FLOATS + 1]!;
      const ar = bubbles[a * BUBBLE_FLOATS + 2]! * grown * 1.4;
      for (let next = at + 1; next < count; next += 1) {
        const b = sorted[next]!;
        if (lefts[b]! > ax + ar) break;
        const br = bubbles[b * BUBBLE_FLOATS + 2]! * grown * 1.4;
        const dx = bubbles[b * BUBBLE_FLOATS]! - ax;
        const dy = bubbles[b * BUBBLE_FLOATS + 1]! - ay;
        const reach = ar + br;
        if (Math.abs(dy) >= reach || dx * dx + dy * dy >= reach * reach) continue;
        const gap = Math.hypot(dx, dy) - bubbles[a * BUBBLE_FLOATS + 2]! - bubbles[b * BUBBLE_FLOATS + 2]!;
        keep(a, b, gap);
        keep(b, a, gap);
      }
    }
  };
  return { ids, find };
}
