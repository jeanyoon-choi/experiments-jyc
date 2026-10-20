// The fractal clock (SCC fractal/clock/1's tree), as a function of (x, y, t).
//
// A root clock at the centre; every hand carries a child clock at its tip,
// radius × 0.6, down to depth 3 (40 clocks; SCC's default is 4 — one level
// less here, for the per-pixel cost). A child runs at its parent's
// rate × 0.86 / 1.00 / 1.14 (hour / minute / second hand) and is offset by a
// fixed share of 12 h (0.191 / 0.463 / 0.787), so the tree never collapses
// into copies. SCC runs it 12× faster than real time; here it runs at the
// cube's clock time (the root is the ordinary clock), so every clock's hands
// — and every child's position — are exact functions of t.
//
// The tree is laid out in pre-order with each node's subtree size, so the
// shader can skip a whole subtree that cannot reach a pixel.

import { HANDS, TWELVE_HOURS } from "./index.ts";

export const FRACTAL_DEPTH = 3;
export const FRACTAL_RATIO = 0.6;
const RATE_MULTIPLIER = [0.86, 1, 1.14] as const;
const PHASE_INCREMENT = [0.191, 0.463, 0.787] as const;

export type FractalNode = {
  parent: number;
  /** Which hand of the parent carries it (−1 for the root). */
  hand: number;
  depth: number;
  /** Nodes in its subtree, itself included (pre-order skip). */
  size: number;
  rate: number;
  /** Share of 12 h added to its clock time. */
  phase: number;
};

function unit(value: number) {
  return value - Math.floor(value);
}

function build(depthLimit: number) {
  const nodes: FractalNode[] = [];
  const append = (parent: number, hand: number, depth: number, rate: number, phase: number) => {
    const index = nodes.length;
    const node: FractalNode = { parent, hand, depth, size: 1, rate, phase };
    nodes.push(node);
    if (depth < depthLimit) {
      for (let h = 0; h < 3; h += 1) {
        append(index, h, depth + 1, rate * RATE_MULTIPLIER[h], unit(phase + PHASE_INCREMENT[h]));
      }
    }
    node.size = nodes.length - index;
  };
  append(-1, -1, 0, 1, 0);
  return nodes;
}

export const FRACTAL_NODES: readonly FractalNode[] = build(FRACTAL_DEPTH);

/**
 * How far a clock's subtree reaches from its centre, in units of its own
 * radius, for each depth (SCC's clockTreeOuterExtent for the remaining depth).
 */
export const FRACTAL_EXTENT: readonly number[] = Array.from({ length: FRACTAL_DEPTH + 1 }, (_, depth) => {
  let extent = 0;
  let radius = 1;
  for (let level = depth; level < FRACTAL_DEPTH; level += 1) {
    extent += HANDS[2].length * radius;
    radius *= FRACTAL_RATIO;
  }
  return extent + radius;
});

/** A node's clock time at the root's clock time t: t·rate + phase·12 h. */
export function nodeClockSeconds(node: FractalNode, seconds: number) {
  return seconds * node.rate + node.phase * TWELVE_HOURS;
}

/**
 * Each node's three hand turns (0..1, clockwise from 12) at the root's clock
 * time `origin`, flattened [node0 hour, minute, second, node1 …]. Computed in
 * double precision; the shader adds turns per unit of z.
 */
export function fractalPhases(origin: number, out = new Float32Array(FRACTAL_NODES.length * 3)) {
  FRACTAL_NODES.forEach((node, index) => {
    const seconds = nodeClockSeconds(node, origin);
    for (let h = 0; h < 3; h += 1) out[index * 3 + h] = unit(seconds / HANDS[h].period);
  });
  return out;
}

/**
 * Centres of every clock at the root's clock time `seconds` (root at the
 * origin, radius `rootRadius`), in pre-order: the same placement the shader
 * computes per pixel. Hand direction (sin a, cos a), clockwise from 12, y up.
 */
export function fractalCentres(seconds: number, rootRadius: number) {
  const centres: [number, number][] = [];
  FRACTAL_NODES.forEach((node, index) => {
    if (node.parent < 0) {
      centres.push([0, 0]);
      return;
    }
    const parent = FRACTAL_NODES[node.parent]!;
    const parentRadius = rootRadius * FRACTAL_RATIO ** parent.depth;
    const turn = unit(nodeClockSeconds(parent, seconds) / HANDS[node.hand].period);
    const length = HANDS[node.hand].length * parentRadius;
    const [px, py] = centres[node.parent]!;
    centres[index] = [px + length * Math.sin(2 * Math.PI * turn), py + length * Math.cos(2 * Math.PI * turn)];
  });
  return centres;
}
