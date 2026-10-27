// The raft's state, shared by the frame loop and the pointer: the web, each
// page's body in the force layout, the drawn centres and radii, and the view.
// Browser-side and React-free; the frame loop advances it, gestures edit it.

import { bodyAt, groupAnchors, relaxBodies, rescaleBodies, type Body, type Frame, type Pair } from "./layout";
import {
  addCandidate,
  addPage,
  candidate,
  createRankedWeb,
  DEFAULT_DAMPING,
  DEFAULT_DIVERSITY,
  DEFAULT_PAGES,
  fadeCandidate,
  leader,
  MAX_GROUPS,
  MAX_PAGES,
  setDamping,
  type RankedWeb,
} from "../web/model";
import { AREA_BUDGET, DEFAULT_GROUPS, DEFAULT_SEED } from "../settings";
import { LINK_VISIBILITY, viewTargets, type ViewId } from "./views";

const MIN_RADIUS = 5;
/** Weight a link drawn by hand starts with; it then follows appeal like any other. */
const HAND_LINK_WEIGHT = 0.5;
const HIT_SLOP = 6;
/** Links lighter than this do not pull in the layout. */
const PULLING_WEIGHT = 0.08;
/** Links lighter than this cannot be tapped. */
const TAPPABLE_WEIGHT = 0.05;
const TRANSITION_SECONDS = 0.9;
/** Displayed pools follow the layout slowly, so packing jitter never reaches the surface. */
const FOLLOW_RATE = 4;

type Transition = { from: Float64Array; linksFrom: number; startedAt: number };

/** Disc area is exactly proportional to rank: πr² = rank × budget. */
export function radiusFor(rank: number, field: Frame, area = AREA_BUDGET) {
  return Math.max(MIN_RADIUS, Math.sqrt((rank * area * field.width * field.height) / Math.PI));
}

function distanceToSegment(px: number, py: number, x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / length));
  return Math.hypot(px - (x1 + dx * t), py - (y1 + dy * t));
}

function easeInOut(value: number) {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

export class Raft {
  web: RankedWeb;
  bodies: Body[] = [];
  /** Drawn radius per page, following the displayed rank. */
  readonly radii = new Float64Array(MAX_PAGES);
  /** Contact radius per page in the layout (see layout.ts). */
  readonly spacing = new Float64Array(MAX_PAGES);
  /** Drawn centre per page (x, y): the view's target, eased. */
  readonly points = new Float64Array(MAX_PAGES * 2);
  size: Frame = { width: 0, height: 0 };
  pendingPages = { value: 0 };
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
    this.web = createRankedWeb(start.pages, this.seed, this.groups, this.diversity);
    setDamping(this.web, this.damping);
  }

  setDamping(value: number) {
    this.damping = value;
    setDamping(this.web, value);
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
    const fresh = createRankedWeb(pages, this.seed, this.groups, this.diversity);
    setDamping(fresh, this.damping);
    this.web = fresh;
    this.pendingPages = { value: 0 };
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
    const { radii, spacing, presence, points, targets } = this;

    // Radii follow the displayed rank; small pages may cluster (as in 7-glsl-3).
    const grow = 1 - Math.exp(-8 * delta);
    for (let page = 0; page < web.size; page += 1) {
      radii[page] = radii[page]! + (radiusFor(shown[page]!, field, area) - radii[page]!) * grow;
      presence[page] = Math.min(1, Math.max(0.35, Math.sqrt((web.rank[page]! * web.size) / 4)));
      // Bubbles rest at their contact distance (see layout.ts).
      spacing[page] = radii[page]!;
    }

    // The layout pulls on links that matter.
    let pullingCount = 0;
    for (let from = 0; from < web.size; from += 1) {
      for (const entry of web.out[from]!) {
        if (!(entry.weight > PULLING_WEIGHT)) continue;
        const link = (this.pullingPool[pullingCount] ??= { from: 0, to: 0 });
        link.from = from;
        link.to = entry.target;
        this.pulling[pullingCount] = link;
        pullingCount += 1;
      }
    }
    this.pulling.length = pullingCount;
    if (web.groups > 1) {
      // Each group's gravity pulls toward its own place, so disconnected groups float apart.
      groupAnchors(web.groups, field, this.groupPoints);
      for (let page = 0; page < web.size; page += 1) {
        const group = web.group[page]!;
        this.anchors[page * 2] = this.groupPoints[group * 2]!;
        this.anchors[page * 2 + 1] = this.groupPoints[group * 2 + 1]!;
      }
      relaxBodies(this.bodies, this.pulling, spacing, field, step, presence, this.anchors);
    } else {
      relaxBodies(this.bodies, this.pulling, spacing, field, step, presence);
    }

    const view = this.view;
    viewTargets(view, this.bodies, spacing, web.rank, web.size, field, targets);
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
    const points = this.points;
    let best: number | null = null;
    let bestDistance = Infinity;
    for (let page = 0; page < this.web.size; page += 1) {
      const distance = Math.hypot(points[page * 2]! - x, points[page * 2 + 1]! - y);
      if (distance <= this.radii[page]! + HIT_SLOP && distance < bestDistance) {
        best = page;
        bestDistance = distance;
      }
    }
    return best;
  }

  /** A live link drawn under (x, y), or null. */
  linkAt(x: number, y: number) {
    const web = this.web;
    const points = this.points;
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
    const web = this.web;
    // A page made by hand joins the group it is linked from, or the group it is placed nearest.
    const group = linkedFrom !== null ? web.group[linkedFrom]! : this.nearestGroup(x, y);
    const page = addPage(web, 0, group);
    if (page === null) return null;
    if (linkedFrom !== null) addCandidate(web, linkedFrom, page, HAND_LINK_WEIGHT);
    this.placePage(page, x, y);
    return page;
  }

  /** A link dragged from one page to another: added (by hand), or let fade if it is live. */
  toggleLink(from: number, to: number) {
    const existing = candidate(this.web, from, to);
    if (existing && !existing.fading) fadeCandidate(this.web, from, to);
    else addCandidate(this.web, from, to, HAND_LINK_WEIGHT);
  }

  /** A page linked from the leader, a little off it (key N). */
  createPageFromLeader() {
    const top = leader(this.web);
    const anchor = this.bodies[top];
    return this.createPage((anchor?.x ?? 0) + 30, (anchor?.y ?? 0) + 30, top);
  }
}
