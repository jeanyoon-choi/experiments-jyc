// What the layout takes from the model each step, as pure functions of it: each page's radius from its displayed
// rank, its presence from its settled rank, and the links heavy enough to pull. (The first half of Raft.arrange;
// the bodies and the view are raft.ts's.)

import { AREA_BUDGET } from "./defaults.ts";
import type { Frame, Pair } from "./layout.ts";
import type { WorldState } from "../model/world.ts";

const MIN_RADIUS = 5;
/** Links lighter than this do not pull in the layout. */
const PULLING_WEIGHT = 0.08;

/** Disc area is exactly proportional to rank: πr² = rank × budget. */
export function radiusFor(rank: number, field: Frame, area = AREA_BUDGET) {
  return Math.max(MIN_RADIUS, Math.sqrt((rank * area * field.width * field.height) / Math.PI));
}

/**
 * Radii follow the displayed rank `shown` over `delta` seconds; small pages may cluster (as in 7-glsl-3): a page's
 * presence (see layout.ts) grows with its settled rank against its fair share. Bubbles rest at their contact
 * distance, so the radii are the layout's contact radii as they are.
 */
export function followRanks(
  shown: ArrayLike<number>,
  rank: ArrayLike<number>,
  count: number,
  field: Frame,
  area: number,
  delta: number,
  radii: Float64Array,
  presence: Float64Array,
) {
  const grow = 1 - Math.exp(-8 * delta);
  for (let page = 0; page < count; page += 1) {
    radii[page] = radii[page]! + (radiusFor(shown[page]!, field, area) - radii[page]!) * grow;
    presence[page] = Math.min(1, Math.max(0.35, Math.sqrt((rank[page]! * count) / 4)));
  }
}

/** The layout pulls on links that matter: writes them into `pulling` (entries reused from `pool`), in `out` order. */
export function pullingLinks(web: Pick<WorldState, "size" | "out">, pulling: Pair[], pool: { from: number; to: number }[]) {
  let count = 0;
  for (let from = 0; from < web.size; from += 1) {
    for (const entry of web.out[from]!) {
      if (!(entry.weight > PULLING_WEIGHT)) continue;
      const link = (pool[count] ??= { from: 0, to: 0 });
      link.from = from;
      link.to = entry.target;
      pulling[count] = link;
      count += 1;
    }
  }
  pulling.length = count;
}
