// What a fish cannot swim through: this frame's drawn discs (pages and
// travelling portions; x y radius seed each), in a grid of cells, and the
// geometry asked of them — is a point free, where is a page's free face, is a
// page buried or a point shut in, and the nearest point clear of every disc.
// Rebuilt each step from the renderer's bubbles; positions are CSS px.

import { unit } from "./math.ts";
import { EDGE_GAP, MAX_PAGES, MOUTH, SIDE, TAIL, type Fish } from "./model.ts";

const CELL = 40;
const ANGLE_STEPS = 12;
const TAU = Math.PI * 2;
/** Radians by which neighbours' arcs must overlap for buried() to call a hold circle closed. */
const ARC_MARGIN = 1e-6;
/** Distances beyond a hold point (px) that must be open water too. */
const OPEN_WATER = [36, 80, 130] as const;
/** Rays and their reach (px) for enclosed(): blocked every way means enclosed. */
const ENCLOSURE_RAYS = 12;
const ENCLOSURE_REACH = 220;

export class Obstacles {
  private width = 1;
  private height = 1;
  private gridColumns = 1;
  private gridRows = 1;
  private cellHead = new Int32Array(1);
  private entryNext = new Int32Array(4_096);
  private entryBubble = new Int32Array(4_096);
  /** This step's discs (x y radius seed), `count` of them; pages occupy [pageStart, pageStart + pageCount). */
  discs: Float32Array = new Float32Array(0);
  count = 0;
  pageStart = 0;
  pageCount = 0;
  /** Per page, the step its burial was last worked out in and the answer (buried()); scratch for its arcs. */
  private readonly buriedStep = new Int32Array(MAX_PAGES).fill(-1);
  private readonly buriedValue = new Uint8Array(MAX_PAGES);
  private stepIndex = 0;
  private readonly arcs = new Float64Array(512);
  /** Orders arc indices by their start (buried()), one comparator for every call. */
  private readonly byArcStart = (a: number, b: number) => this.arcs[a * 2]! - this.arcs[b * 2]!;
  private arcOrder = new Int32Array(256);
  private seen = new Int32Array(2_048);
  private seenStamp = 0;
  /** The deepest a page's bubble came over the fish in the last resolve (px). */
  pagePush = 0;
  /** cos and sin of the facing of the fish resolve() is moving (its facing does not change there), for exclusion(). */
  private facingCos = 1;
  private facingSin = 0;

  /** The field's size (at least 1 each way). */
  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.gridColumns = Math.max(1, Math.ceil(width / CELL));
    this.gridRows = Math.max(1, Math.ceil(height / CELL));
    this.cellHead = new Int32Array(this.gridColumns * this.gridRows);
  }

  /** A new step's discs: the grid is rebuilt, and what was worked out for the last step's (buried()) is forgotten. */
  build(bubbles: Float32Array, count: number, pageStart: number, pageCount: number, scale: number) {
    this.discs = bubbles;
    this.count = count;
    this.pageStart = pageStart;
    this.pageCount = pageCount;
    this.cellHead.fill(-1);
    const reach = (TAIL + SIDE) * scale + EDGE_GAP;
    let entries = 0;
    for (let index = 0; index < count; index += 1) {
      const x = bubbles[index * 4]!;
      const y = bubbles[index * 4 + 1]!;
      const r = bubbles[index * 4 + 2]! + reach;
      if (r <= reach) continue;
      const x0 = Math.max(0, Math.floor((x - r) / CELL));
      const x1 = Math.min(this.gridColumns - 1, Math.floor((x + r) / CELL));
      const y0 = Math.max(0, Math.floor((y - r) / CELL));
      const y1 = Math.min(this.gridRows - 1, Math.floor((y + r) / CELL));
      for (let row = y0; row <= y1; row += 1) {
        for (let column = x0; column <= x1; column += 1) {
          if (entries >= this.entryNext.length) {
            const grownNext = new Int32Array(this.entryNext.length * 2);
            grownNext.set(this.entryNext);
            this.entryNext = grownNext;
            const grownBubble = new Int32Array(this.entryBubble.length * 2);
            grownBubble.set(this.entryBubble);
            this.entryBubble = grownBubble;
          }
          const cell = row * this.gridColumns + column;
          this.entryBubble[entries] = index;
          this.entryNext[entries] = this.cellHead[cell]!;
          this.cellHead[cell] = entries;
          entries += 1;
        }
      }
    }
    this.stepIndex += 1;
    if (this.seen.length < count) this.seen = new Int32Array(count * 2);
  }

  private cellOf(x: number, y: number) {
    const column = Math.min(this.gridColumns - 1, Math.max(0, Math.floor(x / CELL)));
    const row = Math.min(this.gridRows - 1, Math.max(0, Math.floor(y / CELL)));
    return row * this.gridColumns + column;
  }

  /** True when a point lies clear of every page disc (other than `except`) by `clearance`. */
  free(x: number, y: number, clearance: number, except: number) {
    if (x < 0 || y < 0 || x > this.width || y > this.height) return false;
    const { discs, entryNext, entryBubble, pageStart } = this;
    const skipped = pageStart + except;
    for (let entry = this.cellHead[this.cellOf(x, y)]!; entry !== -1; entry = entryNext[entry]!) {
      const bubble = entryBubble[entry]!;
      if (bubble < pageStart || bubble === skipped) continue;
      const dx = x - discs[bubble * 4]!;
      const dy = y - discs[bubble * 4 + 1]!;
      const r = discs[bubble * 4 + 2]! + clearance;
      if (dx * dx + dy * dy < r * r) return false;
    }
    return true;
  }

  /** Index into `discs` of a page's disc (x, y, radius follow). */
  discOf(page: number) {
    return (this.pageStart + page) * 4;
  }

  /**
   * The free angle around `page` nearest to `preferred`, searched both ways in
   * ANGLE_STEPS around the whole circle; null when the page is buried. A
   * hold point counts only if water stays open along OPEN_WATER beyond it,
   * so a cavity between bubbles inside the raft is not a place to go.
   */
  exposedAngle(page: number, preferred: number, hold: number, clearance: number) {
    // A page whose whole hold circle lies under its neighbours has no free angle, whichever is preferred.
    if (this.buried(page, hold, clearance)) return null;
    const at = this.discOf(page);
    const discX = this.discs[at]!;
    const discY = this.discs[at + 1]!;
    const radius = this.discs[at + 2]! + hold;
    for (let step = 0; step <= ANGLE_STEPS / 2; step += 1) {
      // Step 0 once, then each step either way.
      for (let sign = 1; sign >= (step === 0 ? 1 : -1); sign -= 2) {
        const angle = preferred + (sign * step * Math.PI * 2) / ANGLE_STEPS;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        if (!this.free(discX + cos * radius, discY + sin * radius, clearance, page)) continue;
        let open = true;
        for (const distance of OPEN_WATER) {
          const bx = discX + cos * (radius + distance);
          const by = discY + sin * (radius + distance);
          // The field's edge counts as open water.
          if (bx < 0 || by < 0 || bx > this.width || by > this.height) break;
          if (!this.free(bx, by, clearance, page)) {
            open = false;
            break;
          }
        }
        if (open) return angle;
      }
    }
    return null;
  }

  /**
   * True when the neighbouring page discs (grown by `clearance`) cover the
   * page's whole hold circle (radius + `hold`), so no point exposedAngle()
   * could try is free. Worked out once per page per step, from the arcs each
   * neighbour covers; arcs must overlap by ARC_MARGIN, so a circle only just
   * closed counts as open and is searched as before.
   */
  buried(page: number, hold: number, clearance: number) {
    if (this.buriedStep[page] === this.stepIndex) return this.buriedValue[page] === 1;
    this.buriedStep[page] = this.stepIndex;
    this.buriedValue[page] = 0;
    const { discs, entryNext, entryBubble, pageStart, arcs, seen } = this;
    const own = pageStart + page;
    const cx = discs[own * 4]!;
    const cy = discs[own * 4 + 1]!;
    const radius = discs[own * 4 + 2]! + hold;
    // Every disc that covers a point of the circle inside the field is listed in that point's cell.
    const x0 = Math.max(0, Math.floor((cx - radius) / CELL));
    const x1 = Math.min(this.gridColumns - 1, Math.floor((cx + radius) / CELL));
    const y0 = Math.max(0, Math.floor((cy - radius) / CELL));
    const y1 = Math.min(this.gridRows - 1, Math.floor((cy + radius) / CELL));
    this.seenStamp += 1;
    let count = 0;
    for (let row = y0; row <= y1; row += 1) {
      for (let column = x0; column <= x1; column += 1) {
        for (let entry = this.cellHead[row * this.gridColumns + column]!; entry !== -1; entry = entryNext[entry]!) {
          const bubble = entryBubble[entry]!;
          if (bubble < pageStart || bubble === own || seen[bubble] === this.seenStamp) continue;
          seen[bubble] = this.seenStamp;
          const dx = discs[bubble * 4]! - cx;
          const dy = discs[bubble * 4 + 1]! - cy;
          const reach = discs[bubble * 4 + 2]! + clearance;
          const distance = Math.hypot(dx, dy);
          if (distance + radius < reach - ARC_MARGIN) {
            // The whole circle lies inside this one disc.
            this.buriedValue[page] = 1;
            return true;
          }
          if (distance < 1e-9) continue;
          const cos = (radius * radius + distance * distance - reach * reach) / (2 * radius * distance);
          if (cos >= 1) continue;
          const half = Math.acos(Math.max(-1, cos));
          let start = Math.atan2(dy, dx) - half;
          start -= Math.floor(start / TAU) * TAU;
          if (count * 2 + 2 > arcs.length) return false;
          arcs[count * 2] = start;
          arcs[count * 2 + 1] = start + 2 * half;
          count += 1;
        }
      }
    }
    if (count === 0) return false;
    // Sorted by start; swept from the first start round to it again, each arc and its copy a turn later.
    const order = this.arcOrder.subarray(0, count);
    for (let index = 0; index < count; index += 1) order[index] = index;
    order.sort(this.byArcStart);
    const first = arcs[order[0]! * 2]!;
    let end = first;
    for (let turn = 0; turn < 2; turn += 1) {
      for (let index = 0; index < count; index += 1) {
        const arc = order[index]!;
        const start = arcs[arc * 2]! + turn * TAU;
        if (start > end - ARC_MARGIN && !(turn === 0 && index === 0)) return false;
        end = Math.max(end, arcs[arc * 2 + 1]! + turn * TAU);
        if (end >= first + TAU + ARC_MARGIN) {
          this.buriedValue[page] = 1;
          return true;
        }
      }
    }
    return false;
  }

  /** True when every ray from (x, y) meets a page bubble within ENCLOSURE_REACH: a cavity inside the raft. */
  enclosed(x: number, y: number, clearance: number) {
    for (let ray = 0; ray < ENCLOSURE_RAYS; ray += 1) {
      const angle = (ray / ENCLOSURE_RAYS) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      let blocked = false;
      for (let distance = 10; distance <= ENCLOSURE_REACH; distance += 10) {
        const px = x + cos * distance;
        const py = y + sin * distance;
        if (px < 0 || py < 0 || px > this.width || py > this.height) break;
        if (!this.free(px, py, clearance, -1)) {
          blocked = true;
          break;
        }
      }
      if (!blocked) return false;
    }
    return true;
  }

  /** Mouth-first distance a fish needs from a disc, by its orientation (from Goldfishes). */
  private exclusion(fish: Fish, cx: number, cy: number, r: number, distance: number, scale: number) {
    if (distance < 0.001) return r + (TAIL + SIDE) * scale + EDGE_GAP;
    const inwardX = (cx - fish.x) / distance;
    const inwardY = (cy - fish.y) / distance;
    const alignment = Math.max(-1, Math.min(1, this.facingCos * inwardX + this.facingSin * inwardY));
    const longitudinal = alignment >= 0 ? MOUTH : TAIL;
    return r + (longitudinal * Math.abs(alignment) + SIDE * Math.sqrt(Math.max(0, 1 - alignment * alignment))) * scale + EDGE_GAP;
  }

  /** The bubble whose exclusion disc `(x, y)` lies deepest inside, other than `except`; -1 if none. */
  private deepest(fish: Fish, x: number, y: number, scale: number, except: number) {
    let found = -1;
    let depth = 0.001;
    const widest = (TAIL + SIDE) * scale;
    for (let entry = this.cellHead[this.cellOf(x, y)]!; entry !== -1; entry = this.entryNext[entry]!) {
      const bubble = this.entryBubble[entry]!;
      if (bubble === except) continue;
      const cx = this.discs[bubble * 4]!;
      const cy = this.discs[bubble * 4 + 1]!;
      const r = this.discs[bubble * 4 + 2]!;
      // exclusion() never exceeds r + widest + EDGE_GAP (its value at distance 0), so a disc that far or further
      // cannot overlap by `depth` (> 0.001 px, far above the squares' rounding): skipped before hypot and exclusion.
      const dx = x - cx;
      const dy = y - cy;
      const bound = r + widest + EDGE_GAP;
      if (dx * dx + dy * dy > bound * bound) continue;
      const distance = Math.hypot(dx, dy);
      const overlap = this.exclusion(fish, cx, cy, r, distance, scale) - distance;
      if (overlap > depth) {
        depth = overlap;
        found = bubble;
      }
    }
    return found;
  }

  private removeInward(fish: Fish, cx: number, cy: number) {
    const dx = fish.x - cx;
    const dy = fish.y - cy;
    const distance = Math.hypot(dx, dy);
    if (distance < 0.001) return;
    const inward = Math.min(0, (fish.vx * dx + fish.vy * dy) / distance);
    fish.vx -= (inward * dx) / distance;
    fish.vy -= (inward * dy) / distance;
  }

  /**
   * Moves a fish to the nearest point clear of every bubble. Out of one disc
   * the nearest point is radial; where that lands inside a second disc (the
   * notch between two pressed bubbles) it is the nearer crossing of the two
   * exclusion circles, so the fish settles in the notch instead of bouncing.
   * Leaves in `pagePush` how deep a page's bubble had come over it.
   */
  resolve(fish: Fish, scale: number, inField = true) {
    this.pagePush = 0;
    this.facingCos = Math.cos(fish.facing);
    this.facingSin = Math.sin(fish.facing);
    for (let pass = 0; pass < 16; pass += 1) {
      const a = this.deepest(fish, fish.x, fish.y, scale, -1);
      if (a < 0) break;
      const ax = this.discs[a * 4]!;
      const ay = this.discs[a * 4 + 1]!;
      const dx = fish.x - ax;
      const dy = fish.y - ay;
      const distance = Math.hypot(dx, dy);
      const ra = this.exclusion(fish, ax, ay, this.discs[a * 4 + 2]!, distance, scale) + 0.01;
      // How deep a page's bubble (not a travelling portion) had come over the fish.
      if (a >= this.pageStart) this.pagePush = Math.max(this.pagePush, ra - distance);
      const fallback = unit(fish.seed, a) * Math.PI * 2;
      const ux = distance > 0.001 ? dx / distance : Math.cos(fallback);
      const uy = distance > 0.001 ? dy / distance : Math.sin(fallback);
      const px = ax + ux * ra;
      const py = ay + uy * ra;
      const b = this.deepest(fish, px, py, scale, a);
      this.removeInward(fish, ax, ay);
      if (b < 0) {
        fish.x = px;
        fish.y = py;
        continue;
      }
      const bx = this.discs[b * 4]!;
      const by = this.discs[b * 4 + 1]!;
      const rb = this.exclusion(fish, bx, by, this.discs[b * 4 + 2]!, Math.hypot(px - bx, py - by), scale) + 0.01;
      const cx = bx - ax;
      const cy = by - ay;
      const d = Math.hypot(cx, cy);
      if (d < 0.001 || d >= ra + rb || d <= Math.abs(ra - rb)) {
        fish.x = px;
        fish.y = py;
        continue;
      }
      const along = (ra * ra - rb * rb + d * d) / (2 * d);
      const half = Math.sqrt(Math.max(0, ra * ra - along * along));
      const mx = ax + (cx * along) / d;
      const my = ay + (cy * along) / d;
      const ox = (-cy / d) * half;
      const oy = (cx / d) * half;
      const first = Math.hypot(mx + ox - fish.x, my + oy - fish.y);
      const second = Math.hypot(mx - ox - fish.x, my - oy - fish.y);
      const sign = first <= second ? 1 : -1;
      fish.x = mx + ox * sign;
      fish.y = my + oy * sign;
      this.removeInward(fish, bx, by);
    }
    if (inField) {
      fish.x = Math.max(0, Math.min(this.width - 0.01, fish.x));
      fish.y = Math.max(0, Math.min(this.height - 0.01, fish.y));
    }
    // Held against the field's edge by a bubble, or wedged between three or
    // more (a travelling portion pressing it on the raft): take the nearest
    // clear point on widening rings around it.
    if (this.deepest(fish, fish.x, fish.y, scale, -1) >= 0) {
      search: for (let ring = 1; ring <= 24; ring += 1) {
        const reach = ring * 3;
        const steps = 8 + ring * 2;
        const offset = unit(fish.seed, ring) * Math.PI * 2;
        for (let step = 0; step < steps; step += 1) {
          const angle = offset + (step * Math.PI * 2) / steps;
          const x = fish.x + Math.cos(angle) * reach;
          const y = fish.y + Math.sin(angle) * reach;
          if (inField && (x < 0 || y < 0 || x >= this.width || y >= this.height)) continue;
          if (this.deepest(fish, x, y, scale, -1) >= 0) continue;
          fish.x = x;
          fish.y = y;
          break search;
        }
      }
    }
  }
}
