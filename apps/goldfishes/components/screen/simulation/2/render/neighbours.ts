// Per bubble, the bubbles it overlaps (sweep and prune along x), its deepest overlaps kept: what the spheres'
// composite (programs/sphere.ts) reads its walls and mirrored neighbours from. Pure: no DOM, no WebGL.

import { MAX_BUBBLES, NEIGHBOURS, ROW } from "./units.ts";

export type NeighbourSweep = {
  /**
   * The lists of the first `count` of `bubbles` (x y radius seed each): NEIGHBOURS indices (from 1; 0 none) per
   * bubble, zeroed to the end of the last row of ROW. The same array every call.
   */
  (bubbles: Float32Array, count: number): Float32Array;
};

export function createNeighbourSweep(most = MAX_BUBBLES): NeighbourSweep {
  const neighbourIds = new Float32Array(most * NEIGHBOURS);
  const neighbourDepths = new Float32Array(most * NEIGHBOURS);
  // Bubbles sorted by their left edge, reused between frames.
  const order = new Int32Array(most);
  const lefts = new Float32Array(most);
  const byLeft = (a: number, b: number) => lefts[a]! - lefts[b]!;
  // Kept in place: a bubble's slots hold its deepest overlaps so far.
  const keep = (index: number, other: number, depth: number) => {
    const base = index * NEIGHBOURS;
    let slot = -1;
    let shallowest = Infinity;
    for (let at = 0; at < NEIGHBOURS; at += 1) {
      if (neighbourIds[base + at] === 0) {
        slot = at;
        break;
      }
      if (neighbourDepths[base + at]! < shallowest) {
        shallowest = neighbourDepths[base + at]!;
        slot = at;
      }
    }
    if (neighbourIds[base + slot] !== 0 && depth <= shallowest) return;
    neighbourIds[base + slot] = other + 1;
    neighbourDepths[base + slot] = depth;
  };

  return (bubbles, count) => {
    const rows = Math.max(1, Math.ceil(count / ROW));
    neighbourIds.fill(0, 0, rows * ROW * NEIGHBOURS);
    neighbourDepths.fill(0, 0, count * NEIGHBOURS);
    for (let index = 0; index < count; index += 1) {
      order[index] = index;
      lefts[index] = bubbles[index * 4]! - bubbles[index * 4 + 2]!;
    }
    const sorted = order.subarray(0, count).sort(byLeft);
    for (let at = 0; at < count; at += 1) {
      const a = sorted[at]!;
      const ax = bubbles[a * 4]!;
      const ay = bubbles[a * 4 + 1]!;
      const ar = bubbles[a * 4 + 2]!;
      for (let next = at + 1; next < count; next += 1) {
        const b = sorted[next]!;
        const br = bubbles[b * 4 + 2]!;
        if (bubbles[b * 4]! - br > ax + ar) break;
        const dx = bubbles[b * 4]! - ax;
        const dy = bubbles[b * 4 + 1]! - ay;
        const reach = ar + br;
        if (Math.abs(dy) >= reach || dx * dx + dy * dy >= reach * reach) continue;
        const depth = reach - Math.hypot(dx, dy);
        keep(a, b, depth);
        keep(b, a, depth);
      }
    }
    return neighbourIds;
  };
}
