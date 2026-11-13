// Goldfish around the raft (added 2026-10-09). An adaptive school taken from
// Goldfishes' attention school (screen/tech-eyes/1: novelty, habituation,
// crowding, schooling, a hard no-overlap rule against the bubbles) and turned
// toward this route's network: a fish is a surfer of the web it swims around.
// When its attention lapses it either follows one of its page's links, with
// probability `follow` and in proportion to the link's weight (PageRank's
// random surfer), or looks about and picks by salience: displayed rank,
// novelty of new pages, its own boredom and the crowd already there.
//
// A fish never enters a bubble. It approaches the exposed part of its page's
// free face, then patrols back and forth along it, turning where a neighbour
// bubble closes the arc. Pages buried inside the raft are not reachable and
// are not chosen. Contact time per page is drained by the route and, scaled
// by `influence`, raises that page's quality: watched pages gain appeal, so
// the fish perform the rank they follow.
//
// Positions are CSS px of the field. Obstacles are exactly the discs the foam
// renderer draws this frame (pages and travelling portions), x y radius seed.

import type { RankedWeb } from "../web/model";

export const MAX_FISH = 400;

export type FishPaletteId = "classic" | "instagram" | "rose" | "sunset" | "poppy" | "pink" | "mix" | "mono";

export const FISH_PALETTES: Readonly<Record<FishPaletteId, { label: string; body: string; fin: string }>> = {
  classic: { label: "금붕어", body: "#cf741c", fin: "#e7b365" },
  instagram: { label: "인스타", body: "#ff5e29", fin: "#fed044" },
  rose: { label: "장미", body: "#f45b99", fin: "#ffc990" },
  sunset: { label: "노을", body: "#ef5551", fin: "#ffe179" },
  poppy: { label: "양귀비", body: "#e83c42", fin: "#f8a15d" },
  pink: { label: "분홍", body: "#e57687", fin: "#f6c0a4" },
  // Every fish its own colour, dealt from the coloured palettes (MIX_PALETTES); these are the fallback.
  mix: { label: "섞음", body: "#cf741c", fin: "#e7b365" },
  // Fully grey, to sit with the raft's near-monochrome film.
  mono: { label: "모노크롬", body: "#8a8a8a", fin: "#c4c4c4" },
};

/** The palettes 섞음 deals out, one per fish; 모노크롬 is left out (user, 2026-10-11). */
export const MIX_PALETTES: readonly FishPaletteId[] = ["classic", "instagram", "rose", "sunset", "poppy", "pink"];

export type FishParameters = {
  /** Body scale; 1 is Goldfishes' glyph (about 19 px long); 0.7 is tech-eyes/1's current size. */
  scale: number;
  /** Multiplies cruise, approach and patrol speeds. */
  speed: number;
  /** Probability of following one of the page's links when attention lapses. */
  follow: number;
  /** Pull of newly arrived pages. */
  novelty: number;
  /** How fast attention to a watched page wears off. */
  habituation: number;
  /** Mean seconds before a fish reconsiders its page. */
  span: number;
  /** Alignment and cohesion with nearby fish. */
  schooling: number;
  /** Back-and-forth movement along the bubble's edge. */
  patrol: number;
};

export const FISH_DEFAULTS: FishParameters = {
  scale: 0.7,
  speed: 1,
  follow: 0.6,
  novelty: 1,
  habituation: 1,
  span: 2.8,
  schooling: 1,
  patrol: 1,
};

export type Fish = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  /** Page being attended, or -1. */
  target: number;
  /** Angle around the target's centre at which the fish holds. */
  angle: number;
  /** ±1: which way it patrols along the edge. */
  turn: number;
  reconsiderAt: number;
  /** Seconds spent far from its goal without getting closer. */
  stuck: number;
  /** Consecutive checks (one a second) that found the fish shut in a cavity of the raft. */
  trapped: number;
  enclosureCheckAt: number;
  seed: number;
};

// Goldfishes' measured glyph reach at scale 1 (mouth, tail, side), CSS px.
const MOUTH = 6.15;
const TAIL = 13.08;
const SIDE = 6.15;
const EDGE_GAP = 1.5;
const CRUISE = 24;
const MAX_SPEED = 64;
const APPROACH = 44;
const PATROL = 16;
/** Contact: the mouth within this many px of the target's edge. */
const CONTACT_BAND = 14;
/** Hold distance from the edge, beyond the mouth, px. */
const HOLD = 3;
const CELL = 40;
const FISH_BUCKET = 64;
const ANGLE_STEPS = 12;
const FAMILIARITY_DECAY = 12;
const FAMILIARITY_CAP = 4;
/** Distances beyond a hold point (px) that must be open water too. */
const OPEN_WATER = [36, 80, 130] as const;
/** A fish found shut in a cavity this many checks running swims in again from the edge. */
const TRAPPED_CHECKS = 2;
/** Rays and their reach (px) for that check: blocked every way means enclosed. */
const ENCLOSURE_RAYS = 12;
const ENCLOSURE_REACH = 220;

function unit(id: number, salt: number) {
  const value = Math.sin(id * 12.9898 + salt * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

function angleDifference(target: number, current: number) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

export class GoldfishSchool {
  readonly fish: Fish[] = [];
  private width = 1;
  private height = 1;
  private random = 0x51f15e;
  // Obstacle grid, rebuilt each step from the renderer's bubbles.
  private gridColumns = 1;
  private gridRows = 1;
  private cellHead = new Int32Array(1);
  private entryNext = new Int32Array(4_096);
  private entryBubble = new Int32Array(4_096);
  private obstacles: Float32Array = new Float32Array(0);
  private obstacleCount = 0;
  private pageStart = 0;
  private pageCount = 0;
  // Fish neighbour buckets.
  private bucketColumns = 1;
  private heads = new Int32Array(1);
  private next = new Int32Array(MAX_FISH);
  private readonly nextVelocity = new Float64Array(MAX_FISH * 2);
  // Per page: when it appeared (s) and how many fish attend it.
  private readonly born = new Float64Array(1_000);
  private readonly crowd = new Uint16Array(1_000);
  private readonly contact = new Float64Array(1_000);
  private readonly familiarity = new Map<number, { value: number; time: number }>();
  private lastCleanup = 0;
  private time = 0;

  constructor(width: number, height: number) {
    this.resize(width, height);
    this.born.fill(-1_000);
  }

  private nextRandom() {
    let state = this.random;
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    this.random = state >>> 0 || 1;
    return this.random / 4_294_967_296;
  }

  resize(width: number, height: number) {
    const previousWidth = this.width;
    const previousHeight = this.height;
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    for (const fish of this.fish) {
      fish.x *= this.width / previousWidth;
      fish.y *= this.height / previousHeight;
    }
    this.gridColumns = Math.max(1, Math.ceil(this.width / CELL));
    this.gridRows = Math.max(1, Math.ceil(this.height / CELL));
    this.cellHead = new Int32Array(this.gridColumns * this.gridRows);
    this.bucketColumns = Math.max(1, Math.ceil(this.width / FISH_BUCKET));
    this.heads = new Int32Array(this.bucketColumns * Math.max(1, Math.ceil(this.height / FISH_BUCKET)));
  }

  /** Adds or removes fish; existing fish keep their state. New fish enter from the field's edges. */
  setCount(count: number) {
    const target = Math.max(0, Math.min(MAX_FISH, Math.round(count)));
    while (this.fish.length > target) this.fish.pop();
    while (this.fish.length < target) {
      const fish: Fish = {
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        facing: 0,
        target: -1,
        angle: 0,
        turn: this.nextRandom() < 0.5 ? -1 : 1,
        reconsiderAt: 0,
        stuck: 0,
        trapped: 0,
        enclosureCheckAt: 0,
        seed: this.fish.length + this.nextRandom(),
      };
      this.enter(fish);
      this.fish.push(fish);
    }
  }

  /** Puts a fish at a random point of the field's edge, heading inward. */
  private enter(fish: Fish) {
    const side = Math.floor(this.nextRandom() * 4);
    const along = this.nextRandom();
    fish.x = side === 0 ? 4 : side === 1 ? this.width - 4 : along * this.width;
    fish.y = side === 2 ? 4 : side === 3 ? this.height - 4 : along * this.height;
    const heading = Math.atan2(this.height / 2 - fish.y, this.width / 2 - fish.x) + (this.nextRandom() - 0.5);
    fish.vx = Math.cos(heading) * CRUISE;
    fish.vy = Math.sin(heading) * CRUISE;
    fish.facing = heading;
    fish.target = -1;
    fish.stuck = 0;
    fish.trapped = 0;
    fish.reconsiderAt = this.time + this.nextRandom() * 1.5;
  }

  /** Marks pages from `from` up to `to` as just arrived. */
  notePages(from: number, to: number) {
    for (let page = Math.max(0, from); page < Math.min(to, this.born.length); page += 1) this.born[page] = this.time;
  }

  /**
   * The web started over: every page is new to the fish and nobody attends
   * anything. The new raft is seeded where fish may be swimming, so the
   * school swims back in from the edges rather than being shut inside it.
   */
  forgetPages() {
    this.born.fill(-1_000);
    this.familiarity.clear();
    for (const fish of this.fish) this.enter(fish);
  }

  /** Fish-seconds of contact per page since the last drain; the array is reused. */
  drainContact(pageCount: number, out: Float64Array) {
    for (let page = 0; page < pageCount; page += 1) {
      out[page] = this.contact[page]!;
      this.contact[page] = 0;
    }
  }

  private buildGrid(bubbles: Float32Array, count: number, pageStart: number, pageCount: number, scale: number) {
    this.obstacles = bubbles;
    this.obstacleCount = count;
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
  }

  private cellOf(x: number, y: number) {
    const column = Math.min(this.gridColumns - 1, Math.max(0, Math.floor(x / CELL)));
    const row = Math.min(this.gridRows - 1, Math.max(0, Math.floor(y / CELL)));
    return row * this.gridColumns + column;
  }

  /** True when a point lies clear of every page disc (other than `except`) by `clearance`. */
  private free(x: number, y: number, clearance: number, except: number) {
    if (x < 0 || y < 0 || x > this.width || y > this.height) return false;
    const { obstacles, entryNext, entryBubble, pageStart } = this;
    const skipped = pageStart + except;
    for (let entry = this.cellHead[this.cellOf(x, y)]!; entry !== -1; entry = entryNext[entry]!) {
      const bubble = entryBubble[entry]!;
      if (bubble < pageStart || bubble === skipped) continue;
      const dx = x - obstacles[bubble * 4]!;
      const dy = y - obstacles[bubble * 4 + 1]!;
      const r = obstacles[bubble * 4 + 2]! + clearance;
      if (dx * dx + dy * dy < r * r) return false;
    }
    return true;
  }

  /** Index into `obstacles` of a page's disc (x, y, radius follow). */
  private discOf(page: number) {
    return (this.pageStart + page) * 4;
  }

  /**
   * The free angle around `page` nearest to `preferred`, searched both ways in
   * ANGLE_STEPS around the whole circle; null when the page is buried. A
   * hold point counts only if water stays open along OPEN_WATER beyond it,
   * so a cavity between bubbles inside the raft is not a place to go.
   */
  private exposedAngle(page: number, preferred: number, hold: number, clearance: number) {
    const at = this.discOf(page);
    const discX = this.obstacles[at]!;
    const discY = this.obstacles[at + 1]!;
    const radius = this.obstacles[at + 2]! + hold;
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

  /** True when every ray from (x, y) meets a page bubble within ENCLOSURE_REACH: a cavity inside the raft. */
  private enclosed(x: number, y: number, clearance: number) {
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

  private remembered(fish: Fish, page: number) {
    const entry = this.familiarity.get(Math.floor(fish.seed) * 1_000 + page);
    return entry ? entry.value * Math.exp(-(this.time - entry.time) / FAMILIARITY_DECAY) : 0;
  }

  /** Attention lapses: follow a link of the current page, or choose by salience. */
  private reconsider(fish: Fish, web: RankedWeb, shown: ArrayLike<number>, parameters: FishParameters, hold: number, clearance: number) {
    const id = Math.floor(fish.seed);
    const previous = fish.target;
    if (previous >= 0 && previous < this.pageCount) this.crowd[previous] = Math.max(0, this.crowd[previous]! - 1);
    let chosen = -1;
    let angle = 0;

    if (previous >= 0 && previous < this.pageCount && this.nextRandom() < parameters.follow) {
      const links = web.out[previous] ?? [];
      let total = 0;
      for (const link of links) if (link.target < this.pageCount) total += link.weight;
      // Up to three draws, so one buried target does not end the surf.
      for (let draw = 0; draw < 3 && total > 1e-9 && chosen < 0; draw += 1) {
        let cursor = this.nextRandom() * total;
        for (const link of links) {
          if (link.target >= this.pageCount) continue;
          cursor -= link.weight;
          if (cursor > 0) continue;
          const at = this.discOf(link.target);
          const found = this.exposedAngle(link.target, Math.atan2(fish.y - this.obstacles[at + 1]!, fish.x - this.obstacles[at]!), hold, clearance);
          if (found !== null) {
            chosen = link.target;
            angle = found;
          }
          break;
        }
      }
    }

    if (chosen < 0) {
      const mean = 1 / Math.max(1, this.pageCount);
      let best = 0;
      for (let page = 0; page < this.pageCount; page += 1) {
        const at = this.discOf(page);
        const discX = this.obstacles[at]!;
        const discY = this.obstacles[at + 1]!;
        const gap = Math.max(0, Math.hypot(discX - fish.x, discY - fish.y) - this.obstacles[at + 2]!);
        const salience = Math.sqrt(Math.max(shown[page]!, 0) / mean);
        const novelty = 1 + parameters.novelty * 4 * Math.exp(-(this.time - this.born[page]!) / 4);
        const loyalty = page === previous ? 1.2 : 1;
        const affinity = 0.8 + 0.4 * unit(id, page + 5);
        const boredom = 1 + this.remembered(fish, page) * parameters.habituation * 3;
        const score = (salience * novelty * loyalty * affinity) / ((80 + gap) * boredom * (1 + this.crowd[page]! * 0.3));
        if (score <= best) continue;
        const found = this.exposedAngle(page, Math.atan2(fish.y - discY, fish.x - discX), hold, clearance);
        if (found === null) continue;
        best = score;
        chosen = page;
        angle = found;
      }
    }

    fish.target = chosen;
    fish.angle = angle;
    fish.stuck = 0;
    if (chosen >= 0) this.crowd[chosen] = this.crowd[chosen]! + 1;
    if (chosen !== previous && this.nextRandom() < 0.5) fish.turn = -fish.turn;
    fish.reconsiderAt = this.time + parameters.span * (0.65 + 0.7 * unit(id, 9 + this.nextRandom()));
  }

  /** Mouth-first distance a fish needs from a disc, by its orientation (from Goldfishes). */
  private exclusion(fish: Fish, cx: number, cy: number, r: number, distance: number, scale: number) {
    if (distance < 0.001) return r + (TAIL + SIDE) * scale + EDGE_GAP;
    const inwardX = (cx - fish.x) / distance;
    const inwardY = (cy - fish.y) / distance;
    const alignment = Math.max(-1, Math.min(1, Math.cos(fish.facing) * inwardX + Math.sin(fish.facing) * inwardY));
    const longitudinal = alignment >= 0 ? MOUTH : TAIL;
    return r + (longitudinal * Math.abs(alignment) + SIDE * Math.sqrt(Math.max(0, 1 - alignment * alignment))) * scale + EDGE_GAP;
  }

  /** The bubble whose exclusion disc `(x, y)` lies deepest inside, other than `except`; -1 if none. */
  private deepest(fish: Fish, x: number, y: number, scale: number, except: number) {
    let found = -1;
    let depth = 0.001;
    for (let entry = this.cellHead[this.cellOf(x, y)]!; entry !== -1; entry = this.entryNext[entry]!) {
      const bubble = this.entryBubble[entry]!;
      if (bubble === except) continue;
      const cx = this.obstacles[bubble * 4]!;
      const cy = this.obstacles[bubble * 4 + 1]!;
      const distance = Math.hypot(x - cx, y - cy);
      const overlap = this.exclusion(fish, cx, cy, this.obstacles[bubble * 4 + 2]!, distance, scale) - distance;
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
   */
  private resolve(fish: Fish, scale: number) {
    for (let pass = 0; pass < 16; pass += 1) {
      const a = this.deepest(fish, fish.x, fish.y, scale, -1);
      if (a < 0) break;
      const ax = this.obstacles[a * 4]!;
      const ay = this.obstacles[a * 4 + 1]!;
      const dx = fish.x - ax;
      const dy = fish.y - ay;
      const distance = Math.hypot(dx, dy);
      const ra = this.exclusion(fish, ax, ay, this.obstacles[a * 4 + 2]!, distance, scale) + 0.01;
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
      const bx = this.obstacles[b * 4]!;
      const by = this.obstacles[b * 4 + 1]!;
      const rb = this.exclusion(fish, bx, by, this.obstacles[b * 4 + 2]!, Math.hypot(px - bx, py - by), scale) + 0.01;
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
    fish.x = Math.max(0, Math.min(this.width - 0.01, fish.x));
    fish.y = Math.max(0, Math.min(this.height - 0.01, fish.y));
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
          if (x < 0 || y < 0 || x >= this.width || y >= this.height) continue;
          if (this.deepest(fish, x, y, scale, -1) >= 0) continue;
          fish.x = x;
          fish.y = y;
          break search;
        }
      }
    }
  }

  /**
   * One step. `bubbles` holds this frame's drawn discs (x y radius seed);
   * pages occupy [pageStart, pageStart + pageCount). `shown` is the displayed rank.
   */
  step(
    seconds: number,
    web: RankedWeb,
    shown: ArrayLike<number>,
    bubbles: Float32Array,
    bubbleCount: number,
    pageStart: number,
    pageCount: number,
    parameters: FishParameters,
  ) {
    const dt = Math.min(1 / 24, Math.max(0, seconds));
    this.time += dt;
    const scale = parameters.scale;
    if (this.fish.length === 0 || dt === 0) return;
    this.buildGrid(bubbles, bubbleCount, pageStart, pageCount, scale);
    const hold = (MOUTH + HOLD) * scale + EDGE_GAP;
    const clearance = SIDE * scale + EDGE_GAP;
    const speed = parameters.speed;

    if (this.time - this.lastCleanup > 2) {
      this.lastCleanup = this.time;
      for (const [key, entry] of this.familiarity) if (this.time - entry.time > 60) this.familiarity.delete(key);
    }
    this.crowd.fill(0, 0, pageCount);
    for (const fish of this.fish) {
      if (fish.target >= pageCount) fish.target = -1;
      if (fish.target >= 0) this.crowd[fish.target] = this.crowd[fish.target]! + 1;
    }

    this.heads.fill(-1);
    for (let i = 0; i < this.fish.length; i += 1) {
      const fish = this.fish[i]!;
      const bucket = Math.min(
        this.heads.length - 1,
        Math.floor(fish.y / FISH_BUCKET) * this.bucketColumns + Math.min(this.bucketColumns - 1, Math.floor(fish.x / FISH_BUCKET)),
      );
      this.next[i] = this.heads[bucket]!;
      this.heads[bucket] = i;
    }

    for (let i = 0; i < this.fish.length; i += 1) {
      const fish = this.fish[i]!;
      const id = Math.floor(fish.seed);
      if (this.time >= fish.enclosureCheckAt) {
        fish.enclosureCheckAt = this.time + 0.8 + 0.4 * unit(id, 21);
        fish.trapped = this.enclosed(fish.x, fish.y, clearance) ? fish.trapped + 1 : 0;
        if (fish.trapped >= TRAPPED_CHECKS) this.enter(fish);
      }
      if (fish.target < 0 || this.time >= fish.reconsiderAt || fish.stuck > 2.5) {
        this.reconsider(fish, web, shown, parameters, hold, clearance);
      }
      const heading = Math.atan2(fish.vy, fish.vx);
      const speedNow = Math.hypot(fish.vx, fish.vy);
      let desiredFacing = speedNow > 0.01 ? heading : fish.facing;
      let ax = 0;
      let ay = 0;
      let near = 0;

      if (fish.target >= 0) {
        const page = fish.target;
        const at = this.discOf(page);
        const discX = this.obstacles[at]!;
        const discY = this.obstacles[at + 1]!;
        const discR = this.obstacles[at + 2]!;
        const radius = discR + hold;
        const toFish = Math.hypot(fish.x - discX, fish.y - discY);
        // While far off, hold the angle the fish comes from, so it arrives on its own side.
        if (toFish > radius + 60) {
          const found = this.exposedAngle(page, Math.atan2(fish.y - discY, fish.x - discX), hold, clearance);
          if (found === null) fish.stuck = 3;
          else fish.angle = found;
        }
        const goalX = discX + Math.cos(fish.angle) * radius;
        const goalY = discY + Math.sin(fish.angle) * radius;
        const gx = goalX - fish.x;
        const gy = goalY - fish.y;
        const goalDistance = Math.hypot(gx, gy);
        near = Math.max(0, Math.min(1, 1 - (goalDistance - 6) / 40));

        if (near > 0.4 && parameters.patrol > 0) {
          // Patrol: move the goal along the free face; a neighbour wall turns the fish back.
          const angular = (PATROL * speed * parameters.patrol * (0.7 + 0.6 * unit(id, 4))) / Math.max(8, radius);
          const nextAngle = fish.angle + fish.turn * angular * dt;
          const nx = discX + Math.cos(nextAngle) * radius;
          const ny = discY + Math.sin(nextAngle) * radius;
          if (this.free(nx, ny, clearance, page)) fish.angle = nextAngle;
          else fish.turn = -fish.turn;
          if (this.nextRandom() < dt * 0.25 * parameters.patrol) fish.turn = -fish.turn;
        } else if (!this.free(goalX, goalY, clearance, page)) {
          // The bubble's neighbours moved over the goal: find the nearest open part of the face.
          const found = this.exposedAngle(page, fish.angle, hold, clearance);
          if (found === null) fish.stuck = 3;
          else fish.angle = found;
        }

        const pull = Math.min(APPROACH * speed, goalDistance * 1.6);
        const desiredX = goalDistance > 0.01 ? (gx / goalDistance) * pull : 0;
        const desiredY = goalDistance > 0.01 ? (gy / goalDistance) * pull : 0;
        const strength = 2.4 + near * 4;
        ax += (desiredX - fish.vx) * strength;
        ay += (desiredY - fish.vy) * strength;

        // Facing the bubble when beside it, but leaning into the way it patrols.
        const inwardAngle = Math.atan2(discY - fish.y, discX - fish.x);
        const patrolLean = parameters.patrol > 0 ? fish.turn * 0.55 * Math.min(1, parameters.patrol) : 0;
        desiredFacing = near > 0.5 ? inwardAngle + patrolLean : desiredFacing;

        const edgeGap = toFish - discR - MOUTH * scale;
        if (edgeGap < CONTACT_BAND) {
          this.contact[page] = this.contact[page]! + dt;
          const key = id * 1_000 + page;
          const memory = this.remembered(fish, page);
          const value = Math.min(FAMILIARITY_CAP, memory + dt * 0.5 * parameters.habituation);
          const entry = this.familiarity.get(key);
          if (entry) {
            entry.value = value;
            entry.time = this.time;
          } else this.familiarity.set(key, { value, time: this.time });
          // Bored before its span is up: look elsewhere.
          if (parameters.habituation > 0 && memory > 2.4) fish.reconsiderAt = Math.min(fish.reconsiderAt, this.time);
        }
        // Stalled: far from the goal and not closing on it (sliding along a wall counts).
        const closing = goalDistance > 0.01 ? (fish.vx * gx + fish.vy * gy) / goalDistance : 0;
        fish.stuck = goalDistance > 40 && closing < 6 * speed ? fish.stuck + dt : Math.max(0, fish.stuck - dt);
      } else {
        // No reachable page: cruise.
        ax += Math.cos(heading) * (CRUISE * speed - speedNow) * 0.8;
        ay += Math.sin(heading) * (CRUISE * speed - speedNow) * 0.8;
      }

      fish.facing += angleDifference(desiredFacing, fish.facing) * Math.min(1, dt * 9);

      // Schooling, weaker beside a bubble so patrols stay individual.
      let vx = 0;
      let vy = 0;
      let cx = 0;
      let cy = 0;
      let neighbours = 0;
      const bx = Math.floor(fish.x / FISH_BUCKET);
      const by = Math.floor(fish.y / FISH_BUCKET);
      for (let y = Math.max(0, by - 1); y <= by + 1; y += 1) {
        for (let x = Math.max(0, bx - 1); x <= Math.min(this.bucketColumns - 1, bx + 1); x += 1) {
          const bucket = y * this.bucketColumns + x;
          if (bucket >= this.heads.length) continue;
          for (let j = this.heads[bucket]!; j !== -1; j = this.next[j]!) {
            if (i === j) continue;
            const other = this.fish[j]!;
            const dx = fish.x - other.x;
            const dy = fish.y - other.y;
            const d2 = dx * dx + dy * dy;
            if (d2 > 56 * 56) continue;
            vx += other.vx;
            vy += other.vy;
            cx += other.x;
            cy += other.y;
            neighbours += 1;
            const personal = 16 * scale + 6;
            if (d2 < personal * personal) {
              const force = (260 * scale) / Math.max(4, d2);
              ax += dx * force;
              ay += dy * force;
            }
          }
        }
      }
      if (neighbours > 0) {
        const together = parameters.schooling * (1 - near * 0.8);
        ax += ((vx / neighbours - fish.vx) * 0.45 + (cx / neighbours - fish.x) * 0.1) * together;
        ay += ((vy / neighbours - fish.vy) * 0.45 + (cy / neighbours - fish.y) * 0.1) * together;
      }

      const margin = Math.min(24, this.width / 4, this.height / 4);
      ax += Math.max(0, margin - fish.x) * 6 - Math.max(0, fish.x - this.width + margin) * 6;
      ay += Math.max(0, margin - fish.y) * 6 - Math.max(0, fish.y - this.height + margin) * 6;
      let nx = fish.vx + ax * dt;
      let ny = fish.vy + ay * dt;
      const limit = MAX_SPEED * speed;
      const next = Math.hypot(nx, ny);
      if (next > limit) {
        nx *= limit / next;
        ny *= limit / next;
      }
      this.nextVelocity[i * 2] = nx;
      this.nextVelocity[i * 2 + 1] = ny;
    }

    for (let i = 0; i < this.fish.length; i += 1) {
      const fish = this.fish[i]!;
      fish.vx = this.nextVelocity[i * 2]!;
      fish.vy = this.nextVelocity[i * 2 + 1]!;
      fish.x += fish.vx * dt;
      fish.y += fish.vy * dt;
      this.resolve(fish, scale);
    }
  }

  /** Smallest clearance between any fish centre and any drawn disc, minus that disc's radius (test aid). */
  deepestOverlap() {
    let worst = Infinity;
    for (const fish of this.fish) {
      for (let bubble = 0; bubble < this.obstacleCount; bubble += 1) {
        const r = this.obstacles[bubble * 4 + 2]!;
        if (r <= 0) continue;
        const gap = Math.hypot(fish.x - this.obstacles[bubble * 4]!, fish.y - this.obstacles[bubble * 4 + 1]!) - r;
        worst = Math.min(worst, gap);
      }
    }
    return worst;
  }
}
