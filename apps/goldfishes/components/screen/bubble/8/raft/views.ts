// Browser-side views. 네트워크 follows the force layout; 순위 lines the same
// rank-sized discs up from largest to smallest, wrapping into rows, so the
// ordering and the inequality of rank can be read directly.

import type { Body, Frame } from "./layout";

export const VIEWS = [
  { id: "network", label: "네트워크" },
  { id: "ranking", label: "순위" },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

/** How visible links are in each view. */
export const LINK_VISIBILITY: Record<ViewId, number> = { network: 1, ranking: 0.15 };

const GAP = 6;

// Scratch for the ranking view, reused every frame.
const rankOrder: number[] = [];
const rowEnds: number[] = [];
const rowHeights: number[] = [];

/** Writes each page's target centre for `view` into `out` as x, y pairs. */
export function viewTargets(
  view: ViewId,
  bodies: readonly Body[],
  radii: ArrayLike<number>,
  rank: ArrayLike<number>,
  count: number,
  frame: Frame,
  out: Float64Array,
) {
  if (view === "network") {
    for (let page = 0; page < count; page += 1) {
      out[page * 2] = bodies[page]!.x;
      out[page * 2 + 1] = bodies[page]!.y;
    }
    return;
  }
  rankOrder.length = count;
  for (let page = 0; page < count; page += 1) rankOrder[page] = page;
  rankOrder.sort((a, b) => rank[b]! - rank[a]! || a - b);
  const margin = Math.max(16, frame.width * 0.05);
  // Rows as runs of rankOrder: each row's end (exclusive) and height.
  rowEnds.length = 0;
  rowHeights.length = 0;
  let rowStart = 0;
  let used = 0;
  let height = 0;
  for (let at = 0; at < count; at += 1) {
    const diameter = radii[rankOrder[at]!]! * 2;
    if (at > rowStart && used + diameter + GAP > frame.width - margin * 2) {
      rowEnds.push(at);
      rowHeights.push(height);
      rowStart = at;
      used = 0;
      height = 0;
    }
    used += diameter + GAP;
    height = Math.max(height, diameter);
  }
  if (count > rowStart) {
    rowEnds.push(count);
    rowHeights.push(height);
  }
  let total = 0;
  for (const rowHeight of rowHeights) total = total + rowHeight + GAP * 2;
  let y = Math.max(margin, (frame.height - total) / 2);
  let start = 0;
  for (let row = 0; row < rowEnds.length; row += 1) {
    const rowHeight = rowHeights[row]!;
    let x = margin;
    for (let at = start; at < rowEnds[row]!; at += 1) {
      const page = rankOrder[at]!;
      const r = radii[page]!;
      out[page * 2] = x + r;
      // Discs in a row share a baseline, so their heights compare like bars.
      out[page * 2 + 1] = y + rowHeight - r;
      x += r * 2 + GAP;
    }
    start = rowEnds[row]!;
    y += rowHeight + GAP * 2;
  }
}
