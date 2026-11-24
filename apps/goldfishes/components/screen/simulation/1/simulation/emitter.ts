// The frame's bubbles, from the displayed weights: the portions under way along the relations, then one bubble per
// page. A pure function of the world, the layout and the time into typed arrays (emitter.test.ts pins it): nothing
// here draws, and what is written is read by the school, the foam and the object pass alike.

import { unit as hashOf } from "../fish/math.ts";
import { MAX_ENTITIES, type World } from "../model/index.ts";
import { radiusFor } from "../raft/display.ts";
import type { Frame } from "../raft/layout.ts";
import { BUBBLE_FLOATS, MAX_BUBBLES } from "../render/units.ts";

/** Each link sends its portion round on its own period (seconds), from quickest to slowest. */
const PERIOD = [1.3, 3.2] as const;
/** Within its own cycle a portion necks off until this phase and is taken in from that one. */
const DETACHED = 0.35;
const TAKEN_IN = 0.62;
/** A portion's path bows aside by this share of its length (at most BOW_LIMIT px), so crossing flows part. */
const BOW = 0.08;
const BOW_LIMIT = 36;
const MIN_PORTION_RADIUS = 1.5;

/** What is read of the model: the relations, the displayed weight and what each relation carries of it. */
export type Flows = Pick<World<never>, "state" | "shown" | "carried" | "flow">;

/** Where the pages are drawn and which links show (raft/raft.ts), as the emitter reads it. */
export type Layout = { readonly points: Float64Array; readonly size: Frame; readonly focus: number | null; readonly linkVisibility: number };

/** The visual panel's share: the raft's scale, how small a flow is still drawn, and 흐름 버블 (0: none at all). */
export type Emission = { readonly area: number; readonly portions: number; readonly flow: number };

/**
 * The agents' own (model/agents.ts): each bubble's coat seed (its sign's shape), and the signs on their way from the
 * bubble they are copied from, on the world's clock `time`.
 */
export type Signs = {
  readonly seeds: Float32Array;
  readonly couriers: readonly { readonly from: number; readonly to: number; readonly start: number; readonly arrive: number; readonly seed: number }[];
  readonly time: number;
};

/** A copied sign crosses as a portion this share of the smaller of its two bubbles across. */
const COURIER_WIDTH = 0.34;

function smooth(from: number, to: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

export class Emitter {
  /** 오브제: the page each bubble belongs to (a portion, its source). */
  readonly pageOf = new Int32Array(MAX_BUBBLES);
  /** 오브제 (각도 · 움직이는 방향): each bubble's heading, the angle that turns an object's top towards where it is going. */
  readonly headingOf = new Float32Array(MAX_BUBBLES);
  /** 오브제 (bubble/7): each portion's target page and share of its way, for its morph. */
  readonly targetOf = new Int32Array(MAX_BUBBLES);
  readonly travelOf = new Float32Array(MAX_BUBBLES);
  /** How many bubbles the last `emit` wrote, and where its pages start (the portions come before them). */
  count = 0;
  pageStart = 0;
  /** Each page's pool: its displayed rank less what is under way along its links. */
  private readonly pools = new Float64Array(MAX_ENTITIES);
  /** Each page's smoothed velocity (px/s), where it was last frame, and its last heading (kept while it is still). */
  private readonly pageVelocity = new Float32Array(MAX_ENTITIES * 2);
  private readonly pagePrevious = new Float32Array(MAX_ENTITIES * 2);
  private readonly pageHeading = new Float32Array(MAX_ENTITIES);
  private pagesTracked = 0;
  /** The buffer being written (x y radius seed per bubble), during `emit`. */
  private bubbles: Float32Array = new Float32Array(0);

  /** The world started over: no page has a last place to have moved from. */
  restart() {
    this.pagesTracked = 0;
  }

  /** Adds a bubble for the renderer (a portion: with its target page and share of its way). */
  private put(x: number, y: number, radius: number, seed: number, page: number, heading: number, target = -1, travel = 1) {
    const index = this.count;
    if (index >= MAX_BUBBLES) return;
    this.pageOf[index] = page;
    this.headingOf[index] = heading;
    this.targetOf[index] = target;
    this.travelOf[index] = travel;
    const bubbles = this.bubbles;
    const at = index * BUBBLE_FLOATS;
    bubbles[at] = x;
    bubbles[at + 1] = y;
    bubbles[at + 2] = radius;
    bubbles[at + 3] = seed;
    this.count = index + 1;
  }

  /**
   * Nothing but rank's mass. Each page is a pool of its displayed rank.
   * Every link keeps sending its share, d · x(from) · w / W, round on its
   * own period and phase: a portion necks off the source pool, travels
   * and merges into the target pool, then the next begins. Links never
   * beat together and are seen only in where the mass goes. Mass is
   * conserved at every moment: a portion is taken from its source as it
   * necks off and given to its target as it merges, against the steady
   * flow that both pools carry on average.
   *
   * Writes the portions, then one bubble per page, into `bubbles` (MAX_BUBBLES of them); returns where the pages
   * start. `motionTime` is the portions' clock, `frameSeconds` the frame's length (for the pages' headings).
   */
  emit(world: Flows, raft: Layout, bubbles: Float32Array, visual: Emission, motionTime: number, frameSeconds: number, signs: Signs | null = null) {
    const state = world.state;
    const field = raft.size;
    const points = raft.points;
    const shown = world.shown;
    const pools = this.pools;
    const focus = raft.focus;
    const pageCount = Math.min(state.size, MAX_ENTITIES);
    const flowing = raft.linkVisibility >= 0.5;
    for (let page = 0; page < pageCount; page += 1) pools[page] = shown[page]!;
    this.bubbles = bubbles;
    this.count = 0;
    // `visual.flow` is the 흐름 버블 switch; `flow` below is what one link carries.
    const { area, portions } = visual;

    if (flowing) {
      let linkCount = 0;
      for (let from = 0; from < pageCount; from += 1) linkCount += state.out[from]!.length;
      // 흐름 버블 끔: no flow is large enough to be drawn.
      const leastFlow = (visual.flow ?? 1) < 0.5 ? 1e9 : portions * (linkCount > 0 ? world.carried / linkCount : 1);
      for (let from = 0; from < pageCount; from += 1) {
        for (const entry of state.out[from]!) {
          const to = entry.target;
          if (to >= pageCount) continue;
          // Constants per (from, to), worked out again each frame: the model keeps no mark of when its links change.
          const offset = hashOf(to, from);
          const period = PERIOD[0] + (PERIOD[1] - PERIOD[0]) * hashOf(from, to);
          const cycle = (motionTime / period + offset) % 1;
          const flow = world.flow(from, entry);
          const detach = smooth(0, DETACHED, cycle);
          const takeIn = smooth(TAKEN_IN, 1, cycle);
          pools[from] = pools[from]! - flow * (detach - cycle);
          pools[to] = pools[to]! + flow * (takeIn - cycle);
          const involved = focus !== null && (from === focus || to === focus);
          if (flow < leastFlow && !involved) continue;
          const portion = flow * (detach - takeIn);
          const radius = Math.sqrt((Math.max(portion, 0) * area * field.width * field.height) / Math.PI);
          if (radius < MIN_PORTION_RADIUS) continue;
          const travel = smooth(0.04, 0.96, cycle);
          const ax = points[from * 2]!;
          const ay = points[from * 2 + 1]!;
          const dx = points[to * 2]! - ax;
          const dy = points[to * 2 + 1]! - ay;
          const length = Math.hypot(dx, dy) || 1;
          const reach = Math.min(BOW_LIMIT, BOW * length) * (hashOf(from + 7, to) < 0.5 ? -1 : 1);
          const bow = Math.sin(Math.PI * travel) * reach;
          // Where it is heading: along the link, turned by the bow's slope.
          const slope = Math.PI * Math.cos(Math.PI * travel) * reach;
          const heading = Math.atan2(dx - (dy / length) * slope, -(dy + (dx / length) * slope));
          // Its morph runs over its whole cycle: necking off as its own object, arriving as the target's.
          this.put(ax + dx * travel - (dy / length) * bow, ay + dy * travel + (dx / length) * bow, radius, hashOf(from, to + 5), from, heading, to, smooth(DETACHED * 0.5, (TAKEN_IN + 1) / 2, cycle));
        }
      }
    }

    // A copied sign on its way (the agents'): one portion, once, from the bubble it is copied from to the one that
    // takes it on as it arrives. What it is made of is lent by the first and handed to the second while it crosses.
    if (signs && (visual.flow ?? 1) >= 0.5) {
      const unit = area * field.width * field.height;
      for (const courier of signs.couriers) {
        const { from, to } = courier;
        if (from >= pageCount || to >= pageCount) continue;
        const u = Math.min(1, Math.max(0, (signs.time - courier.start) / Math.max(1e-3, courier.arrive - courier.start)));
        const width = COURIER_WIDTH * Math.sqrt((Math.min(shown[from]!, shown[to]!) * unit) / Math.PI);
        const mass = (Math.PI * width * width) / unit;
        const detach = smooth(0, DETACHED, u);
        const takeIn = smooth(TAKEN_IN, 1, u);
        pools[from] = pools[from]! - mass * detach * (1 - takeIn);
        pools[to] = pools[to]! + mass * takeIn * (1 - smooth(0.9, 1, u));
        const radius = width * Math.sqrt(Math.max(0, detach - takeIn));
        if (radius < MIN_PORTION_RADIUS) continue;
        const travel = smooth(0.04, 0.96, u);
        const ax = points[from * 2]!;
        const ay = points[from * 2 + 1]!;
        const dx = points[to * 2]! - ax;
        const dy = points[to * 2 + 1]! - ay;
        const length = Math.hypot(dx, dy) || 1;
        const reach = Math.min(BOW_LIMIT, BOW * length) * (courier.seed < 0.5 ? -1 : 1);
        const bow = Math.sin(Math.PI * travel) * reach;
        const slope = Math.PI * Math.cos(Math.PI * travel) * reach;
        const heading = Math.atan2(dx - (dy / length) * slope, -(dy + (dx / length) * slope));
        this.put(ax + dx * travel - (dy / length) * bow, ay + dy * travel + (dx / length) * bow, radius, courier.seed, from, heading, to, smooth(DETACHED * 0.5, (TAKEN_IN + 1) / 2, u));
      }
    }

    // Pages: one bubble each, as large as its rank, pressed into its neighbours, heading the way it is pushed.
    const pageStart = this.count;
    const ease = 1 - Math.exp(-frameSeconds / 0.4);
    const { pageVelocity, pagePrevious, pageHeading } = this;
    for (let page = 0; page < pageCount; page += 1) {
      const x = points[page * 2]!;
      const y = points[page * 2 + 1]!;
      if (page < this.pagesTracked) {
        pageVelocity[page * 2] = pageVelocity[page * 2]! + ((x - pagePrevious[page * 2]!) / frameSeconds - pageVelocity[page * 2]!) * ease;
        pageVelocity[page * 2 + 1] = pageVelocity[page * 2 + 1]! + ((y - pagePrevious[page * 2 + 1]!) / frameSeconds - pageVelocity[page * 2 + 1]!) * ease;
        // Turned only while it moves: a still page keeps its last heading.
        if (Math.hypot(pageVelocity[page * 2]!, pageVelocity[page * 2 + 1]!) > 3) pageHeading[page] = Math.atan2(pageVelocity[page * 2]!, -pageVelocity[page * 2 + 1]!);
      } else {
        pageVelocity[page * 2] = 0;
        pageVelocity[page * 2 + 1] = 0;
        pageHeading[page] = 0;
      }
      pagePrevious[page * 2] = x;
      pagePrevious[page * 2 + 1] = y;
      const r = radiusFor(Math.max(pools[page]!, 0), field, area);
      // Its coat is picked by its seed: its own for good, or its sign's shape (the agents').
      this.put(x, y, r, signs ? signs.seeds[page]! : hashOf(page, 3), page, pageHeading[page]!);
    }
    this.pagesTracked = pageCount;
    this.pageStart = pageStart;
    return pageStart;
  }
}
