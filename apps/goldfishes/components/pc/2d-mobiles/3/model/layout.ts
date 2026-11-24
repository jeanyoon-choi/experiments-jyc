// Where the mobiles sit: a grid of bare glass, every measure of it an option
// (model/tuning.ts, the 배치 menu, the address). Method from pc/2d-mobiles/2.

import { GLASS } from "../phone/geometry";
import type { Tuning } from "./tuning";

export type Arrangement = Pick<Tuning, "columns" | "gapX" | "gapY" | "marginX" | "marginY" | "cropTop" | "cropBottom">;

/** The part of a glass that is shown, in pt: the whole glass less what is cut off its top and bottom. */
export function cell(arrangement: Pick<Tuning, "cropTop" | "cropBottom">) {
  return { w: GLASS.w, h: Math.max(100, GLASS.h - arrangement.cropTop - arrangement.cropBottom) };
}

/**
 * Largest uniform mobile whose grid fits the viewport, in CSS px.
 * - `columns` 0: the column count that gives the largest mobile (ties to fewer empty seats); else that many.
 * - `gapX`, `gapY`: between mobiles, % of a mobile's width.
 * - `marginX`, `marginY`: around the grid, % of the viewport's width and height.
 */
export function fitGrid(width: number, height: number, count: number, arrangement: Arrangement) {
  const shown = cell(arrangement);
  const aspect = shown.w / shown.h;
  const gapX = arrangement.gapX / 100;
  const gapY = arrangement.gapY / 100;
  const availableWidth = Math.max(0, width * (1 - (arrangement.marginX / 100) * 2));
  const availableHeight = Math.max(0, height * (1 - (arrangement.marginY / 100) * 2));
  const total = Math.max(1, count);
  const fixed = Math.min(total, Math.max(0, Math.round(arrangement.columns)));
  let best = { columns: 1, rows: 1, width: 0, height: 0, gapX: 0, gapY: 0 };
  for (let columns = fixed || 1; columns <= (fixed || total); columns++) {
    const rows = Math.max(1, Math.ceil(total / columns));
    const mobileWidth = Math.min(availableWidth / (columns + (columns - 1) * gapX), availableHeight / (rows / aspect + (rows - 1) * gapY));
    const empty = columns * rows - total;
    const bestEmpty = best.columns * best.rows - total;
    if (mobileWidth > best.width + 1e-6 || (Math.abs(mobileWidth - best.width) <= 1e-6 && empty < bestEmpty)) {
      best = { columns, rows, width: mobileWidth, height: mobileWidth / aspect, gapX: mobileWidth * gapX, gapY: mobileWidth * gapY };
    }
  }
  return best;
}
