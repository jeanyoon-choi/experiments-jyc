// The raft's state, shared by the frame loop and the pointer: the model (behind
// its contract, model/world.ts), each
// page's body in the force layout, the drawn centres and radii, and the view.
// Browser-side and React-free; the frame loop advances it, gestures edit it.
// It holds the state and the order things happen in; what is computed is in
// display.ts (radii, presence, pulling links), layout.ts (the bodies' step),
// views.ts (the centres' targets) and picking.ts (what is under a point).

import { bodyAt, groupAnchors, relaxBodies, rescaleBodies, type Body, type Frame, type Pair } from "./layout.ts";
import { PageRankWorld } from "../model/pagerank.ts";
import { DEFAULT_DAMPING, DEFAULT_DIVERSITY, DEFAULT_PAGES, MAX_GROUPS, MAX_PAGES, type RankedWeb, type WebParameters } from "../web/model.ts";
import { DEFAULT_GROUPS, DEFAULT_SEED } from "./defaults.ts";
import { followRanks, pullingLinks, radiusFor } from "./display.ts";
import { linkAt, pageAt } from "./picking.ts";
import { LINK_VISIBILITY, viewTargets, type ViewId } from "./views.ts";

export { radiusFor } from "./display.ts";

/** Weight a link drawn by hand starts with; it then follows appeal like any other. */
const HAND_LINK_WEIGHT = 0.5;
const TRANSITION_SECONDS = 0.9;
/** Displayed pools follow the layout slowly, so packing jitter never reaches the surface. */
const FOLLOW_RATE = 4;

type Transition = { from: Float64Array; linksFrom: number; startedAt: number };

function easeInOut(value: number) {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

export class Raft {
  /** The model: started over where the web is (rebuild), never replaced. The loop reads it only as a `World`. */
  readonly world: PageRankWorld;
  bodies: Body[] = [];
  /** Drawn radius per page, following the displayed rank; also its contact radius in the layout (see layout.ts). */
  readonly radii = new Float64Array(MAX_PAGES);
  /** Drawn centre per page (x, y): the view's target, eased. */
  readonly points = new Float64Array(MAX_PAGES * 2);
  size: Frame = { width: 0, height: 0 };
  /** Seconds since the start, slowed by nothing (view transitions run on it). */
  time = 0;
  /** The tapped page whose links always flow, or null. */
  focus: number | null = null;
  view: ViewId = "network";
  linkVisibility = LINK_VISIBILITY.network;
  damping = DEFAULT_DAMPING;
  /** Disconnected groups. Changing it starts the web over. */
  groups = DEFAULT_GROUPS;
  /** How far the groups' sizes and characters spread around the panel's parameters. */
  diversity = DEFAULT_DIVERSITY;
  /** The web's seed; 다시 섞기 draws other groups. */
  seed = DEFAULT_SEED;
  /** A requested page count; the frame loop starts the web over with it. */
  repopulate: number | null = null;
  private transition: Transition | null = null;
  private randomState = 0x9e3779b9;
  private readonly targets = new Float64Array(MAX_PAGES * 2);
  private readonly presence = new Float64Array(MAX_PAGES);
  private readonly groupPoints = new Float64Array(MAX_GROUPS * 2);
  private readonly anchors = new Float64Array(MAX_PAGES * 2);
  /** The links that pull this step, and a pool their entries are reused from. */
  private readonly pulling: Pair[] = [];
  private readonly pullingPool: { from: number; to: number }[] = [];

  /** Presentation-only randomness (layout seeds); never touches the model. */
  readonly random = () => {
    let state = this.randomState;
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    this.randomState = state >>> 0 || 1;
    return this.randomState / 4_294_967_296;
  };

  /** The web it starts with: page count, groups and d (기본값 3 starts at a thousand pages, one group). */
  constructor(start: { pages: number; groups: number; damping: number } = { pages: DEFAULT_PAGES, groups: DEFAULT_GROUPS, damping: DEFAULT_DAMPING }) {
    this.groups = start.groups;
    this.damping = start.damping;
    this.world = new PageRankWorld({ pages: start.pages, seed: this.seed, groups: this.groups, diversity: this.diversity, damping: this.damping });
  }

  /** The web itself, for those that read it as one (전파, a tapped link): the same object as `world.state`. */
  get web(): RankedWeb {
    return this.world.web;
  }

  setDamping(value: number) {
    this.damping = value;
    this.world.setDamping(value);
  }

  /** Tapping a page highlights its links; tapping it again clears that. */
  toggleFocus(page: number) {
    this.focus = this.focus === page ? null : page;
  }

  clearFocus() {
    this.focus = null;
  }

  /** Takes effect at the next restart. One group is always the default web. */
  setGroups(count: number) {
    this.groups = count;
    if (count === 1) this.seed = DEFAULT_SEED;
  }

  /** Takes effect at the next restart. */
  setDiversity(value: number) {
    this.diversity = value;
  }

  /** 다시 섞기: other groups at the next restart. */
  reshuffle() {
    this.seed = (Math.random() * 4_294_967_296) >>> 0 || 1;
  }

  /** Asks the frame loop to start the web over with `pages` pages. */
  requestRestart(pages: number) {
    this.repopulate = pages;
  }

  /** Starts the web, and the layout, over at the requested page count. */
  rebuild(pages: number) {
    this.repopulate = null;
    this.world.restart({ pages, seed: this.seed, groups: this.groups, diversity: this.diversity, damping: this.damping });
    this.transition = null;
    this.focus = null;
    this.seedPages(this.size);
  }

  /** The field changed size: the first time every page is seeded, afterwards the raft is rescaled. */
  resize(next: Frame) {
    if (this.bodies.length === 0) this.seedPages(next);
    else rescaleBodies(this.bodies, this.size, next);
    this.size = next;
  }

  private seedPages(field: Frame) {
    const web = this.web;
    this.bodies = [];
    groupAnchors(web.groups, field, this.groupPoints);
    for (let page = 0; page < web.size; page += 1) {
      const body = bodyAt(field, this.random);
      if (web.groups > 1) {
        // Each group starts gathered round its own place, a third the size of one raft.
        const group = web.group[page]!;
        body.x = this.groupPoints[group * 2]! + (body.x - field.width / 2) * 0.45;
        body.y = this.groupPoints[group * 2 + 1]! + (body.y - field.height / 2) * 0.45;
      }
      this.bodies[page] = body;
      this.points[page * 2] = body.x;
      this.points[page * 2 + 1] = body.y;
      this.radii[page] = radiusFor(web.rank[page]!, field);
    }
  }

  /**
   * simulation/2 (rules/): what of bubble/9's web is nobody's act and is left out — `drift`: quality wandering by
   * itself; `arrivals`: bubbles coming by themselves. Both true is bubble/9. Without the drift, bubble/6's tiring
   * runs at `burstAt` and `recovery`.
   */
  readonly own = { drift: true, arrivals: true, burstAt: 50, recovery: 30 };
  /** The web's parameters with what `own` leaves out at nothing. */
  private quiet: WebParameters | null = null;
  private quietFrom: WebParameters | null = null;

  /** The model's step; a new page appears beside the first page it links to. */
  step(seconds: number, given: WebParameters) {
    const field = this.size;
    const random = this.random;
    let parameters = given;
    if (!this.own.drift || !this.own.arrivals) {
      if (this.quietFrom !== given || !this.quiet) {
        this.quietFrom = given;
        this.quiet = { ...given };
      }
      this.quiet.volatility = this.own.drift ? given.volatility : 0;
      // Without the dice the raft is moved by the tiring cycle, at its own values (rules/versions.ts).
      this.quiet.burstAt = this.own.drift ? given.burstAt : this.own.burstAt;
      this.quiet.recovery = this.own.drift ? given.recovery : this.own.recovery;
      this.quiet.growth = this.own.arrivals ? given.growth : 0;
      parameters = this.quiet;
    }
    for (const event of this.world.step(seconds, parameters)) {
      const anchor = this.bodies[event.targets[0] ?? 0];
      const angle = random() * Math.PI * 2;
      this.placePage(
        event.page,
        (anchor?.x ?? field.width / 2) + Math.cos(angle) * 24,
        (anchor?.y ?? field.height / 2) + Math.sin(angle) * 24,
      );
    }
  }

  /** Gives page `page` a body and a position at (x, y); it grows in from nothing. */
  placePage(page: number, x: number, y: number) {
    this.bodies[page] = { x, y, vx: 0, vy: 0 };
    this.points[page * 2] = x;
    this.points[page * 2 + 1] = y;
    this.radii[page] = 0;
    const transition = this.transition;
    if (transition && transition.from.length < (page + 1) * 2) {
      const from = new Float64Array((page + 1) * 2);
      from.set(transition.from);
      from[page * 2] = x;
      from[page * 2 + 1] = y;
      transition.from = from;
    }
  }

  changeView(next: ViewId) {
    if (next === this.view) return;
    this.transition = {
      from: this.points.slice(0, this.web.size * 2),
      linksFrom: this.linkVisibility,
      startedAt: this.time,
    };
    this.view = next;
  }

  /**
   * One layout step: radii follow the displayed rank `shown`, the bodies relax
   * (`step` is the possibly slowed simulation time), and the drawn centres
   * follow the view, easing through a view change.
   */
  arrange(shown: Float64Array, delta: number, step: number, still: boolean, area: number) {
    const web = this.web;
    const field = this.size;
    const { radii, presence, points, targets } = this;

    followRanks(shown, web.rank, web.size, field, area, delta, radii, presence);
    pullingLinks(web, this.pulling, this.pullingPool);
    if (web.groups > 1) {
      // Each group's gravity pulls toward its own place, so disconnected groups float apart.
      groupAnchors(web.groups, field, this.groupPoints);
      for (let page = 0; page < web.size; page += 1) {
        const group = web.group[page]!;
        this.anchors[page * 2] = this.groupPoints[group * 2]!;
        this.anchors[page * 2 + 1] = this.groupPoints[group * 2 + 1]!;
      }
      relaxBodies(this.bodies, this.pulling, radii, field, step, presence, this.anchors);
    } else {
      relaxBodies(this.bodies, this.pulling, radii, field, step, presence);
    }

    const view = this.view;
    viewTargets(view, this.bodies, radii, web.rank, web.size, field, targets);
    const transition = this.transition;
    const progress = transition ? Math.min(1, (this.time - transition.startedAt) / (still ? 0.01 : TRANSITION_SECONDS)) : 1;
    const eased = easeInOut(progress);
    const follow = 1 - Math.exp(-FOLLOW_RATE * delta);
    for (let index = 0; index < web.size * 2; index += 1) {
      points[index] = transition && progress < 1
        ? transition.from[index]! + (targets[index]! - transition.from[index]!) * eased
        : points[index]! + (targets[index]! - points[index]!) * follow;
    }
    const linksFrom = transition?.linksFrom ?? LINK_VISIBILITY[view];
    this.linkVisibility = linksFrom + (LINK_VISIBILITY[view] - linksFrom) * eased;
    if (transition && progress >= 1) this.transition = null;
  }

  /** The page drawn under (x, y), with a little slop; the nearest if several. */
  pageAt(x: number, y: number) {
    return pageAt(this.points, this.radii, this.web.size, x, y);
  }

  /** A live link drawn under (x, y), or null. */
  linkAt(x: number, y: number) {
    return linkAt(this.web, this.points, x, y);
  }

  /** The group whose raft gathers nearest (x, y). */
  private nearestGroup(x: number, y: number) {
    const groups = this.web.groups;
    const anchors = this.groupPoints;
    groupAnchors(groups, this.size, anchors);
    let best = 0;
    for (let group = 1; group < groups; group += 1) {
      if (Math.hypot(anchors[group * 2]! - x, anchors[group * 2 + 1]! - y) < Math.hypot(anchors[best * 2]! - x, anchors[best * 2 + 1]! - y)) best = group;
    }
    return best;
  }

  /** Adds a page at (x, y), linked from `linkedFrom` when given; null at the page cap. */
  createPage(x: number, y: number, linkedFrom: number | null) {
    const world = this.world;
    // A page made by hand joins the group it is linked from, or the group it is placed nearest.
    const group = linkedFrom !== null ? world.state.group[linkedFrom]! : this.nearestGroup(x, y);
    const page = world.add(group);
    if (page === null) return null;
    if (linkedFrom !== null) world.relate(linkedFrom, page, HAND_LINK_WEIGHT);
    this.placePage(page, x, y);
    return page;
  }

  /**
   * simulation/2: the bubble that sends `page` the most this beat (the displayed weight its link to `page` carries),
   * or −1: whose disposition and object `page` takes when it changes.
   */
  sender(page: number) {
    const world = this.world;
    const out = world.state.out;
    const size = world.state.size;
    let best = -1;
    let most = 0;
    for (let from = 0; from < size; from += 1) {
      if (from === page) continue;
      for (const link of out[from]!) {
        if (link.target !== page) continue;
        const flow = world.flow(from, link);
        if (flow > most) {
          most = flow;
          best = from;
        }
        break;
      }
    }
    return best;
  }

  /**
   * simulation/2: a stroke's bubble at (x, y), linked from `linkedFrom` (the stroke's last) when given. It comes in
   * `shares` fair shares large (artist, 2026-11-25: a bubble's mean share), taken evenly from the rest. Null at the cap.
   */
  lay(x: number, y: number, linkedFrom: number | null, shares: number, quality = 0) {
    const page = this.createPage(x, y, linkedFrom);
    if (page === null) return null;
    // Its appeal as it comes in (전파's newcomers had 1.5); it wears off like any other unless the goldfish keep it up.
    this.world.setQuality(page, quality);
    const size = this.world.state.size;
    this.world.seed(page, Math.min(0.2, Math.max(0, shares) / Math.max(1, size)));
    return page;
  }

  /** A link dragged from one page to another: added (by hand), or let fade if it is live. */
  toggleLink(from: number, to: number) {
    const world = this.world;
    const existing = world.relation(from, to);
    if (existing && !existing.fading) world.release(from, to);
    else world.relate(from, to, HAND_LINK_WEIGHT);
  }

  /** A page linked from the leader, a little off it (key N). */
  createPageFromLeader() {
    const top = this.world.metrics().leader;
    const anchor = this.bodies[top];
    return this.createPage((anchor?.x ?? 0) + 30, (anchor?.y ?? 0) + 30, top);
  }
}
