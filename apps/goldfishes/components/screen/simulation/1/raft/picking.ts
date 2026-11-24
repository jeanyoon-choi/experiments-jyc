// What is drawn under a point: hit-testing on the drawn centres and radii, pure.

import type { WorldState } from "../model/world.ts";

const HIT_SLOP = 6;
/** Links lighter than this cannot be tapped. */
const TAPPABLE_WEIGHT = 0.05;

export function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / length));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

/** The page drawn under (x, y), with a little slop; the nearest if several. `points` are x, y pairs. */
export function pageAt(points: ArrayLike<number>, radii: ArrayLike<number>, count: number, x: number, y: number) {
  let best: number | null = null;
  let bestDistance = Infinity;
  for (let page = 0; page < count; page += 1) {
    const distance = Math.hypot(points[page * 2]! - x, points[page * 2 + 1]! - y);
    if (distance <= radii[page]! + HIT_SLOP && distance < bestDistance) {
      best = page;
      bestDistance = distance;
    }
  }
  return best;
}

/** A live link drawn under (x, y), or null: the first in `out` order. */
export function linkAt(web: Pick<WorldState, "size" | "out">, points: ArrayLike<number>, x: number, y: number) {
  for (let from = 0; from < web.size; from += 1) {
    for (const entry of web.out[from]!) {
      if (entry.fading || entry.weight < TAPPABLE_WEIGHT) continue;
      const to = entry.target;
      const d = distanceToSegment(x, y, points[from * 2]!, points[from * 2 + 1]!, points[to * 2]!, points[to * 2 + 1]!);
      if (d <= HIT_SLOP) return { from, to };
    }
  }
  return null;
}
