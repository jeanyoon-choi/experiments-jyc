// Where painted tiles live on the GPU: the layers of one texture array, cut
// into columns as wide as the widest tile (a glass's width), each column a
// strip of free intervals. A tile takes the first interval tall enough; a
// freed tile gives its interval back, merged with its neighbours. Tiles are
// freed one by one (least recently used first, never one on a glass), so the
// atlas never jams the way whole-layer eviction did (2026-10-28: every layer
// held a tile on some glass and nothing could be cleared). Pure, so it is tested.

export type Slot = { layer: number; x: number; y: number; w: number; h: number; column: number };

type Interval = { y: number; h: number };

export class ColumnAtlas {
  readonly size: number;
  readonly count: number;
  readonly columnWidth: number;
  readonly columnsPerLayer: number;
  /** Clear pixels around every tile, so filtering never bleeds a neighbour in. */
  readonly pad: number;
  private readonly free: Interval[][];
  private used = 0;

  constructor(size: number, count: number, maxTileWidth: number, pad = 2) {
    this.size = size;
    this.count = count;
    this.pad = pad;
    this.columnWidth = Math.min(size, Math.ceil(maxTileWidth) + pad * 2);
    this.columnsPerLayer = Math.max(1, Math.floor(size / this.columnWidth));
    this.free = Array.from({ length: count * this.columnsPerLayer }, () => [{ y: 0, h: size }]);
  }

  /** A place for a w × h tile, or null when no column has room. */
  alloc(w: number, h: number): Slot | null {
    if (w + this.pad * 2 > this.columnWidth) return null;
    const need = h + this.pad * 2;
    for (let column = 0; column < this.free.length; column += 1) {
      const intervals = this.free[column]!;
      for (let index = 0; index < intervals.length; index += 1) {
        const interval = intervals[index]!;
        if (interval.h < need) continue;
        const y = interval.y;
        interval.y += need;
        interval.h -= need;
        if (interval.h === 0) intervals.splice(index, 1);
        this.used += need;
        const layer = Math.floor(column / this.columnsPerLayer);
        const x = (column % this.columnsPerLayer) * this.columnWidth;
        return { layer, x: x + this.pad, y: y + this.pad, w, h, column };
      }
    }
    return null;
  }

  release(slot: Slot) {
    const intervals = this.free[slot.column]!;
    const y = slot.y - this.pad;
    const h = slot.h + this.pad * 2;
    this.used -= h;
    let at = 0;
    while (at < intervals.length && intervals[at]!.y < y) at += 1;
    intervals.splice(at, 0, { y, h });
    // Merge with the neighbours it now touches.
    const next = intervals[at + 1];
    if (next && y + h === next.y) {
      intervals[at]!.h += next.h;
      intervals.splice(at + 1, 1);
    }
    const before = intervals[at - 1];
    if (before && before.y + before.h === y) {
      before.h += intervals[at]!.h;
      intervals.splice(at, 1);
    }
  }

  /** Share of the atlas in use, 0–1. */
  get fill() {
    return this.used / (this.free.length * this.size);
  }
}
