// How a switch of 치환 crosses the field (user, 2026-11-25): not every mobile
// at once, but as a rumour does. A few mobiles hear it first; each one that
// has heard it tells the mobiles beside it, some sooner and some later; so the
// change runs out from where it began along an uneven front, and the whole
// field has heard within `within` seconds.

import type { Seat } from "../model/field";

/**
 * Seconds until each seat hears, by seat. The first to hear are at 0, the last at `within`.
 * Each telling between two neighbours (beside, above, below) takes its own time, drawn once;
 * a seat hears by the quickest chain that reaches it.
 */
export function rumour(seats: readonly Seat[], within: number, random: () => number = Math.random) {
  const count = seats.length;
  const heard = new Array<number>(count).fill(Infinity);
  if (count === 0) return heard;
  const at = new Map(seats.map((seat, index) => [`${seat.column},${seat.row}`, index]));
  // One mobile in about forty starts it.
  const first = Math.max(1, Math.round(count / 40));
  const waiting = new Set<number>();
  for (let index = 0; index < first; index += 1) {
    const seat = Math.floor(random() * count);
    heard[seat] = 0;
    waiting.add(seat);
  }
  const told = new Set<number>();
  while (waiting.size) {
    let next = -1;
    for (const seat of waiting) if (next < 0 || heard[seat]! < heard[next]!) next = seat;
    waiting.delete(next);
    told.add(next);
    const { column, row } = seats[next]!;
    for (const [dc, dr] of [[0, -1], [0, 1], [-1, 0], [1, 0]] as const) {
      const other = at.get(`${column + dc},${row + dr}`);
      if (other === undefined || told.has(other)) continue;
      // Some tell at once, some take four times as long.
      const time = heard[next]! + 0.4 + random() * 1.2;
      if (time < heard[other]!) {
        heard[other] = time;
        waiting.add(other);
      }
    }
  }
  const last = Math.max(...heard.filter(Number.isFinite), 0);
  return heard.map((time) => (!Number.isFinite(time) ? within * random() : last > 0 ? (time / last) * within : 0));
}
