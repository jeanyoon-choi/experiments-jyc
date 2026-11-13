// One step of PageRank's power iteration, shown rather than solved. The
// displayed distribution x is not the model's rank: it starts uniform and
// moves one step per beat,
//
//   x'(i) = d Σ_j x(j) w_ji / W_j + d Σ_{dangling j} x(j) / N + (1 − d) Σ_j x(j) / N,
//
// so it converges to the stationary PageRank the model computes, and after
// any change to the web it converges again. With Σx = 1 the step conserves
// mass; a page added between beats starts at 0 and the teleport share fills
// it in. The share each link carries during a beat, d x(j) w_ji / W_j, is
// what the portion of mass travelling from pool to pool shows.

import { outWeight, type RankedWeb } from "./model.ts";

/** Writes every page's total outgoing weight W into `out` (at least web.size long). */
export function outWeights(web: RankedWeb, out: Float64Array) {
  for (let page = 0; page < web.size; page += 1) out[page] = outWeight(web, page);
  return out;
}

/**
 * Writes x' = one power-iteration step of `x` on `web` into `out` (both at
 * least web.size long). `weights`, when given, holds outWeights(web).
 */
export function iterate(web: RankedWeb, x: ArrayLike<number>, out: Float64Array, weights?: ArrayLike<number>) {
  const n = web.size;
  if (n === 0) return;
  const d = web.damping;
  let total = 0;
  let dangling = 0;
  for (let page = 0; page < n; page += 1) {
    total += x[page]!;
    out[page] = 0;
  }
  for (let page = 0; page < n; page += 1) {
    const weight = weights ? weights[page]! : outWeight(web, page);
    if (weight <= 1e-12) {
      dangling += x[page]!;
      continue;
    }
    const scale = (d * x[page]!) / weight;
    for (const entry of web.out[page]!) out[entry.target] = out[entry.target]! + scale * entry.weight;
  }
  const spread = (d * dangling + (1 - d) * total) / n;
  for (let page = 0; page < n; page += 1) out[page] = out[page]! + spread;
}

/** The rank a link carries during a beat that starts from `x`: d · x(from) · w / W (`total` is W). */
export function transit(web: RankedWeb, x: ArrayLike<number>, from: number, weight: number, total = outWeight(web, from)) {
  return total > 1e-12 ? (web.damping * x[from]! * weight) / total : 0;
}

/** L1 distance between two distributions over the first `count` pages. */
export function distanceL1(a: ArrayLike<number>, b: ArrayLike<number>, count: number) {
  let sum = 0;
  for (let page = 0; page < count; page += 1) sum += Math.abs(a[page]! - b[page]!);
  return sum;
}
