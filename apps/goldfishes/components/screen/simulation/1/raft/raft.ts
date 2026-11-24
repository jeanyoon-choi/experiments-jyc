// The raft's state, shared by the frame loop and the pointer: the model (behind
// its contract, model/world.ts), each
// page's body in the force layout, the drawn centres and radii, and the view.
// Browser-side and React-free; the frame loop advances it, gestures edit it.
// It holds the state and the order things happen in; what is computed is in
// display.ts (radii, presence, pulling links), layout.ts (the bodies' step),
// views.ts (the centres' targets) and picking.ts (what is under a point).

import { bodyAt, groupAnchors, relaxBodies, rescaleBodies, type Body, type Frame, type Pair } from "./layout.ts";
import { AgentWorld, type AgentParameters } from "../model/agents.ts";
import { PageRankWorld } from "../model/pagerank.ts";
import type { World } from "../model/world.ts";
import { addCandidate, DEFAULT_DAMPING, DEFAULT_DIVERSITY, DEFAULT_PAGES, MAX_GROUPS, MAX_PAGES, type RankedWeb, type WebParameters } from "../web/model.ts";
import { PAGE_INTS } from "../model/agents.ts";
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

/** What the raft and the loop read of whichever model is in use: everything of the seam but its step (the raft's). */
export type BodyWorld = Omit<World<never>, "step">;
/** Both models' parameters; the raft steps the one in use with its own. */
export type RaftParameters = { web: WebParameters; rule: AgentParameters };
/** What the screen opens on under the agents: this many keywords, known to every fish (M9 opened on 3; bubble/9 shows some 230 kinds at once, and a raft of three objects is not its body: simulation/docs/1.md). */
export const OPENING_KEYWORDS = 240;

function easeInOut(value: number) {
  return value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2;
}

export class Raft {
  /** bubble/9's model, kept beside the agents as the baseline (simulation/docs/1.md): PageRank on a living web. */
  readonly pagerank: PageRankWorld;
  /** The two myopic agents' bubbles (model/agents.ts): the model in use while `rules` is true. */
  readonly agents: AgentWorld;
  /** true: the agents decide (signs, audiences, the fish's choice); false: bubble/9 as it is. */
  rules = false;
  /**
   * true: sizes and flows are bubble/9's transport (the web's conserved weight, its portions, bubble/6's tiring). Under
   * the agents its links are the raft's contacts and nothing comes into it by itself: no drifting quality, no links
   * found at a distance, no new pages. false: sizes are the agents' own heat (model/agents.ts).
   */
  transport = true;
  /**
   * The places where bubble/9's decisions are made local (simulation/docs/agent-model-proposal.md, rows 1–6), each a
   * switch so that one can be measured apart (study/run.ts). All on: the agent model.
   *   contacts   — a bubble sends only to bubbles it touches; no link is found at a distance (rows 1, 2)
   *   visible    — appeal and tiring go by the size shown now, not the rank the whole web would settle to (row 3)
   *   noSpread   — no share of every bubble's size is spread over all the bubbles each beat (row 4)
   *   nearSpread — with noSpread: that share goes, evenly, to the bubbles it touches (not in the proposal: measured
   *                as a way to keep the small bubbles from drying up; off)
   *   noDrift    — quality does not wander by itself; only the goldfish's watching raises it (row 5)
   *   noArrivals — no bubble comes by itself; only a stroke lays one (row 6)
   */
  readonly local = { contacts: true, visible: true, noSpread: true, noDrift: true, noArrivals: true, nearSpread: false };
  /** The web's parameters under the agents, filled each step from the panel's and `local`. */
  private readonly quiet: WebParameters = { growth: 0, volatility: 0, floor: 3, adaptation: 0.6, discovery: 0, dynamics: 1, burstAt: 50, recovery: 10, visible: 1 };
  /** A stroke's bubble comes in this many times a bubble's fair share large, so the stroke is seen where it is drawn. */
  strokeSize = 5;
  /** And with this much appeal (log quality), as 전파's newcomers had 1.5: its neighbours send to it and it holds. */
  strokeQuality = 2.5;
  /** The school's size, for the agents' reference heat (the loop keeps it told). */
  school = 380;
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
  constructor(start: { pages: number; groups: number; damping: number; rules?: boolean; transport?: boolean } = { pages: DEFAULT_PAGES, groups: DEFAULT_GROUPS, damping: DEFAULT_DAMPING }) {
    this.rules = start.rules ?? false;
    this.transport = start.transport ?? true;
    // Under the agents the raft is one world: echo chambers are PageRank's.
    if (this.rules) start = { ...start, groups: 1 };
    this.groups = start.groups;
    this.damping = start.damping;
    this.pagerank = new PageRankWorld({ pages: start.pages, seed: this.seed, groups: this.groups, diversity: this.diversity, damping: this.damping });
    this.agents = new AgentWorld({ bubbles: start.pages, fish: this.school, seed: this.seed, keywords: OPENING_KEYWORDS });
  }

  /** The model in use. The loop reads it only as a `World`. */
  get world(): BodyWorld {
    return this.transport ? this.pagerank : this.agents;
  }

  /** Who decides, and whose sizes: the raft starts over when either changes. */
  setMode(rules: boolean, transport: boolean) {
    if (rules === this.rules && transport === this.transport) return;
    const pages = this.world.state.size;
    this.rules = rules;
    this.transport = transport;
    if (rules) this.groups = 1;
    this.requestRestart(pages);
  }

  /** The web itself, for those that read it as one (전파, a tapped link): the same object as `world.state`. */
  get web(): RankedWeb {
    return this.pagerank.web;
  }

  setDamping(value: number) {
    this.damping = value;
    this.pagerank.setDamping(value);
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
    if (this.rules) this.agents.restart({ bubbles: pages, fish: this.school, seed: this.seed, keywords: OPENING_KEYWORDS });
    if (this.transport) this.pagerank.restart({ pages, seed: this.seed, groups: this.rules ? 1 : this.groups, diversity: this.diversity, damping: this.damping });
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
    const web = this.world.state;
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

  /** The model's step; a new page appears beside the first page it links to. */
  step(seconds: number, given: RaftParameters | WebParameters) {
    // PageRank's parameters alone (its tests, as bubble/9's raft was stepped) or both models'.
    const parameters: RaftParameters = "web" in given ? given : { web: given, rule: this.agents.parameters };
    const field = this.size;
    const random = this.random;
    const agents = this.agents;
    let web = parameters.web;
    if (this.rules) {
      agents.ownSizes = !this.transport;
      agents.step(seconds, parameters.rule);
      // Their own sizes: bubbles come only from a stroke (lay), a step brings none.
      if (!this.transport) return;
      // bubble/9's transport with its decisions made local, each by its own switch (`local`).
      const local = this.local;
      const quiet = this.quiet;
      quiet.floor = web.floor;
      quiet.adaptation = web.adaptation;
      quiet.dynamics = web.dynamics;
      quiet.burstAt = web.burstAt;
      quiet.recovery = web.recovery;
      quiet.discovery = local.contacts ? 0 : web.discovery;
      quiet.volatility = local.noDrift ? 0 : web.volatility;
      quiet.growth = local.noArrivals ? 0 : web.growth;
      quiet.visible = local.visible ? 1 : 0;
      this.pagerank.web.local = local.noSpread;
      this.pagerank.web.nearSpread = local.nearSpread;
      web = quiet;
    }
    for (const event of this.pagerank.step(seconds, web)) {
      if (event.kind !== "page") continue;
      const anchor = this.bodies[event.targets[0] ?? 0];
      const angle = random() * Math.PI * 2;
      this.placePage(
        event.page,
        (anchor?.x ?? field.width / 2) + Math.cos(angle) * 24,
        (anchor?.y ?? field.height / 2) + Math.sin(angle) * 24,
      );
      // A page that came by itself (only while `noArrivals` is off) is one more of the opening's objects.
      if (this.rules) agents.lay(event.page % agents.opening);
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
      from: this.points.slice(0, this.world.state.size * 2),
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
    const web = this.world.state;
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
    // The agents' relations are the raft's contacts: who is pressed against whom, as drawn.
    if (this.rules) {
      this.agents.touch(step, points, radii);
      if (this.transport && this.local.contacts) this.linkContacts();
    }
  }

  /**
   * The bubble pressed against `bubble` that sends it the most (what its relation to `bubble` carries a beat), or −1:
   * whose object `bubble` takes when it changes (proposal row 8).
   */
  sender(bubble: number) {
    const world = this.pagerank;
    const out = world.state.out;
    let best = -1;
    let most = 0;
    for (const contact of this.agents.state.out[bubble] ?? []) {
      if (contact.fading) continue;
      for (const link of out[contact.target] ?? []) {
        if (link.target !== bubble) continue;
        const flow = world.flow(contact.target, link);
        if (flow > most) {
          most = flow;
          best = contact.target;
        }
        break;
      }
    }
    return best;
  }

  /** The web's links are the bubbles pressed against one another: a new contact is a link that grows in, a parted one fades. */
  private linkContacts() {
    const web = this.pagerank.web;
    const contacts = this.agents.state.out;
    const size = Math.min(web.size, contacts.length);
    for (let page = 0; page < size; page += 1) {
      const touching = contacts[page]!;
      for (const link of web.out[page]!) {
        let still = false;
        for (const contact of touching) {
          if (contact.target !== link.target || contact.fading) continue;
          still = true;
          break;
        }
        link.fading = !still;
      }
      for (const contact of touching) if (!contact.fading && contact.target < size) addCandidate(web, page, contact.target);
    }
  }

  /** The page drawn under (x, y), with a little slop; the nearest if several. */
  pageAt(x: number, y: number) {
    return pageAt(this.points, this.radii, this.world.state.size, x, y);
  }

  /** A live link drawn under (x, y), or null. */
  linkAt(x: number, y: number) {
    return this.rules ? null : linkAt(this.web, this.points, x, y);
  }

  /** The group whose raft gathers nearest (x, y). */
  private nearestGroup(x: number, y: number) {
    const groups = this.world.state.groups;
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
    if (this.rules) return null;
    const world = this.pagerank;
    // A page made by hand joins the group it is linked from, or the group it is placed nearest.
    const group = linkedFrom !== null ? world.state.group[linkedFrom]! : this.nearestGroup(x, y);
    const page = world.add(group);
    if (page === null) return null;
    if (linkedFrom !== null) world.relate(linkedFrom, page, HAND_LINK_WEIGHT);
    this.placePage(page, x, y);
    return page;
  }

  /** A link dragged from one page to another: added (by hand), or let fade if it is live. */
  toggleLink(from: number, to: number) {
    if (this.rules) return;
    const world = this.pagerank;
    const existing = world.relation(from, to);
    if (existing && !existing.fading) world.release(from, to);
    else world.relate(from, to, HAND_LINK_WEIGHT);
  }

  /** A page linked from the leader, a little off it (key N). */
  createPageFromLeader() {
    if (this.rules) return null;
    const top = this.world.metrics().leader;
    const anchor = this.bodies[top];
    return this.createPage((anchor?.x ?? 0) + 30, (anchor?.y ?? 0) + 30, top);
  }

  /**
   * The agents' stroke: a new bubble of `keyword` at (x, y). At the cap the bubble nearest there takes a new shape of
   * the keyword instead. Its bubble, or null without one.
   */
  lay(x: number, y: number, keyword: number) {
    const agents = this.agents;
    const { points, radii } = this;
    // As hot as what is around it (M9), so it comes in at the size of its place and not as a speck.
    const near = 0.12 * this.size.width;
    let heat = 0;
    let count = 0;
    for (let other = 0; other < agents.state.size; other += 1) {
      if (Math.hypot(points[other * 2]! - x, points[other * 2 + 1]! - y) - radii[other]! >= near) continue;
      heat += agents.heat[other]!;
      count += 1;
    }
    // Under bubble/9's transport it comes in as 전파's newcomers did, with appeal enough to grow into sight.
    if (this.transport) {
      const page = this.pagerank.add(0, this.strokeQuality);
      if (page === null) count = -1;
      else this.pagerank.seed(page, Math.min(0.2, this.strokeSize / this.pagerank.state.size));
    }
    const bubble = count < 0 ? null : agents.lay(keyword, count ? heat / count : undefined);
    if (bubble !== null) {
      this.placePage(bubble, x, y);
      return bubble;
    }
    let nearest: number | null = null;
    let least = Infinity;
    for (let other = 0; other < agents.state.size; other += 1) {
      const gap = Math.hypot(points[other * 2]! - x, points[other * 2 + 1]! - y) - radii[other]!;
      if (gap < least) {
        least = gap;
        nearest = other;
      }
    }
    if (nearest !== null) agents.takeOn(nearest, keyword);
    return nearest;
  }
}
