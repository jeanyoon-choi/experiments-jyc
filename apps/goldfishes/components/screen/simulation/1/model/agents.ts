// The bubbles' side of the two myopic agents (model M9; simulation/0/model.ts is the engine these rules were moved
// from, simulation/docs/1.md says what changed on the way). Behind the seam (world.ts), in PageRank's place.
//
//  bubble i   wants its own audience. Sees its audience and its touching neighbours' audience and sign. While it is
//             losing fish it takes the sign of its busiest neighbour (with probability `mu`, a keyword associated
//             with that one instead): a portion necks off that neighbour, crosses, and the sign changes as it arrives.
//  heat       dh = a − lambda h; a bubble holding more fish than `capacity` bursts: heat 0, its fish spill to its
//             neighbours (the school is told through `bursts`).
//  size       area ∝ heat^contrast over a small floor: a share of one fixed total (`zeroSum` 1, as bubble/9's raft),
//             or by its own heat alone (0, as M8.2 onward had it in the gallery).
//  input      a stroke lays bubbles of one new keyword. Nothing new appears without one.
//
// The goldfish's side — which bubble a fish goes to next, what it grows used to — is fish/attention.ts, in the
// school's worker: it reads `pageData` (each bubble's sign, keyword and burst count) and the relations, and what it
// does comes back as the school's contact (`attend`) and the fish's moves (`moved`).
//
// A relation is a contact: two bubbles pressed together in the raft (`touch`), kept while they touch and faded once
// they part. What it carries is what crossed it lately — fish that moved along it, a burst's spill — so the portions
// the emitter draws along it are attention under way, and they stop when nothing moves.

import type { Relation, World, WorldEvent, WorldMetrics, WorldState } from "./world.ts";

export const MAX_AGENTS = 1_000;

export type AgentParameters = {
  // goldfish (read by the school: fish/attention.ts)
  /** How often a fish looks again, per second per bubble in view. */
  look: number;
  /** Pull of a crowd: value × (1 + alpha × share of the fish in view). */
  alpha: number;
  /** Seconds⁻¹ at which a watched keyword, and a watched shape, become familiar. */
  keywordBore: number;
  shapeBore: number;
  /** Seconds⁻¹ at which an unwatched keyword's, and shape's, familiarity fades. */
  keywordForget: number;
  shapeForget: number;
  /** 1: move only to a bubble worth `theta` more (no dice); 0: choose by exp(greed × value) (M8). */
  betterOnly: number;
  theta: number;
  greed: number;
  /** How familiar the fish already are with the opening keywords. */
  familiar: number;
  // bubble
  /** How often a bubble looks at its neighbours, per second. */
  copy: number;
  /** Chance that a copy takes an associated keyword instead. */
  mu: number;
  /** Heat cools at this rate per second. */
  lambda: number;
  /** 1: copy only while losing fish (audience below (1 − lose) × its `window`-second average); 0: whenever a neighbour is busier (M8). */
  losingOnly: number;
  window: number;
  lose: number;
  /** 1: burst above `capacity` fish; 0: burst above `burstHeat` × the neighbours' mean heat (M8). */
  capacityBurst: number;
  /** Fish a bubble holds, in multiples of the mean per bubble (the starting mean when `open`, the current one otherwise). */
  capacity: number;
  burstHeat: number;
  /**
   * 1: bubble/6's tiring in place of the burst (web/model.ts): a bubble holding more than `burstAt` times its fair
   * share of the area tires for as long as it does — its fatigue F builds at 3 ln(1 + excess) a second, and it is
   * worth e^F less to a fish — and rests over `recovery` seconds below. 0: M9's burst above `capacity`.
   */
  tiring: number;
  burstAt: number;
  recovery: number;
  // audience
  /** 1: fish come with a stroke and leave when bored (M9); 0: the school is the panel's, with its lifecycle (bubble/9). */
  open: number;
  join: number;
  /** What the world off the screen is worth to a fish. */
  outside: number;
  // where a bubble sits (M9.1)
  /** 1: every fish looks again at the same rate, look × (1 + view); 0: look × the bubbles it sees. */
  evenLook: number;
  /** A bubble's neighbours: its `view` nearest among those it touches when above 0; 0: all it touches. */
  view: number;
  // size
  /** 1: a share of one fixed total; 0: its own heat alone. */
  zeroSum: number;
  /** Area ∝ heat^contrast. */
  contrast: number;
};

export const M9: AgentParameters = {
  look: 0.05,
  alpha: 1,
  keywordBore: 0.15,
  shapeBore: 0.4,
  keywordForget: 0.001,
  shapeForget: 0.05,
  betterOnly: 1,
  theta: 0.3,
  greed: 4,
  familiar: 0.9,
  copy: 0.3,
  mu: 0.005,
  lambda: 0.3,
  losingOnly: 1,
  window: 5,
  lose: 0.3,
  capacityBurst: 1,
  capacity: 4,
  burstHeat: 3,
  tiring: 0,
  burstAt: 80,
  recovery: 10,
  open: 1,
  join: 40,
  outside: 0.1,
  evenLook: 0,
  view: 0,
  zeroSum: 1,
  contrast: 1,
};

const M8_2: AgentParameters = { ...M9, open: 0, keywordBore: 0.03 };

/** The versions that are M9 under other conditions (simulation/0 PRESETS), as far as they reach in this body. */
export const RULES = {
  // The agent model of docs/agent-model-proposal.md keeps bubble/9's transport and makes its decisions local; of
  // this file it uses the contacts, the objects and their crossing only (no copying by itself, no bursting).
  "에이전트": { ...M9, open: 0, copy: 0, mu: 0 },
  M9,
  "M9.1": { ...M9, evenLook: 1, view: 8 },
  "M8.2": M8_2,
  M8: { ...M8_2, look: 0.1, lambda: 1, capacity: 10, contrast: 2, betterOnly: 0, losingOnly: 0, capacityBurst: 0, familiar: 0, keywordForget: 0.005, mu: 0.03 },
} satisfies Record<string, AgentParameters>;
export type RuleId = keyof typeof RULES;

/** What a world starts from. `fish`: the school's size, for the reference heat that sizes are measured from. */
export type AgentStart = { bubbles: number; fish: number; seed: number; keywords: number };

/** A sign: one shape of a keyword, shown as the keyword's object in the coat `seed` picks. */
export type Sign = { keyword: number; seed: number };
/** A keyword: the object it is shown as is picked by `key` (objects/kinds pageKind), or is the field layer `layer` when ≥ 0. */
export type Keyword = { parent: number | null; key: number; layer: number };

/** A relation as the world keeps it: `rate` is the fish per second that crossed it lately. */
type Contact = { target: number; weight: number; fading: boolean; rate: number; gap: number };

/** A sign on its way from the bubble it is copied from: it is taken on when it arrives. */
export type Courier = { from: number; to: number; sign: number; start: number; arrive: number; seed: number };

/** What happened since the counts were last taken (measure/track.ts drains them). */
export type AgentCounts = { signChanges: number; moves: number; bursts: number; strokes: number };

/** Ints per bubble in `pageData`: its sign, its keyword, how many times it has burst, its fatigue in thousandths. */
export const PAGE_INTS = 4;
/** How fast fatigue builds above `burstAt`, per second per unit of ln(excess) (web/model.ts FATIGUE_GAIN). */
const FATIGUE_GAIN = 3;

/** Bubbles are checked for who touches whom this often (seconds). */
const TOUCH_EVERY = 0.1;
/** Counted as touching within this share of the two radii (the raft's contact, with slack for its jitter). */
const TOUCH_SLACK = 1.12;
/** What crossed a relation is remembered over about this long (seconds). */
const CROSSING_SECONDS = 2;
/** A copied sign takes this long to cross (seconds): one of the emitter's periods. */
const COURIER_SECONDS = 1.8;
/** The share of the reference heat every bubble is at least as large as (M8.2: 0.08). */
const FLOOR = 0.08;
/**
 * Fish that come onto the screen within this long of a stroke go to its last bubble. M9: "a stroke brings `join` new
 * fish"; under bubble/9's school, which swims in as many as have gone every six seconds, it is the next two waves.
 */
const NEWCOMERS_SECONDS = 12;
/** The portions' mean period (simulation/emitter.ts PERIOD), for what one beat of a relation carries. */
const BEAT = 2.25;

export class AgentWorld implements World<AgentParameters> {
  readonly shown = new Float64Array(MAX_AGENTS);
  carried = 0;
  /** Seconds since it began. */
  time = 0;
  readonly signs: Sign[] = [];
  readonly keywords: Keyword[] = [];
  /** How many keywords the screen opened on: every fish already knows them. */
  opening = 0;
  readonly sign = new Int32Array(MAX_AGENTS);
  readonly heat = new Float64Array(MAX_AGENTS);
  /** Fish at each bubble over the last step, over about a second, and over `window` seconds. */
  readonly audience = new Float64Array(MAX_AGENTS);
  readonly recent = new Float64Array(MAX_AGENTS);
  readonly usual = new Float64Array(MAX_AGENTS);
  /** bubble/6's fatigue, per bubble. */
  readonly fatigue = new Float64Array(MAX_AGENTS);
  /** For the emitter and the object pass: each bubble's coat seed (its sign's) and its keyword's object key and layer. */
  readonly seeds = new Float32Array(MAX_AGENTS);
  readonly keys = new Float64Array(MAX_AGENTS);
  readonly layers = new Int16Array(MAX_AGENTS).fill(-1);
  /** For the school: sign, keyword and burst count per bubble (PAGE_INTS each). */
  readonly pageData = new Int32Array(MAX_AGENTS * PAGE_INTS);
  readonly couriers: Courier[] = [];
  readonly counts: AgentCounts = { signChanges: 0, moves: 0, bursts: 0, strokes: 0 };
  /**
   * The school's size. With an open audience it is the world's own: it grows with a stroke and falls as fish leave.
   * Otherwise the loop keeps it at the panel's (the school replaces its dead: fish/lifecycle.ts).
   */
  population = 0;
  /** Where newcomers go: the last stroke's last bubble, until `entryUntil`. */
  entry = -1;
  entryUntil = 0;
  parameters: AgentParameters = M9;
  /**
   * true: sizes are this world's (heat), with its own bursting or tiring. false: the bubbles' sizes, flows and tiring
   * are bubble/9's transport (raft.ts keeps its web's links at this world's contacts), and this world keeps only the
   * signs and the audiences.
   */
  ownSizes = true;
  private current: AgentState;
  private readonly contact = new Float64Array(MAX_AGENTS);
  private readonly waiting = new Uint8Array(MAX_AGENTS);
  private readonly weight = new Float64Array(MAX_AGENTS);
  private startCrowd = 1;
  private startCount = 1;
  private reference = 1;
  private sinceTouch = TOUCH_EVERY;
  private randomState = 1;
  // Scratch for touch().
  private readonly order = new Int32Array(MAX_AGENTS);
  private readonly lefts = new Float64Array(MAX_AGENTS);

  constructor(start: AgentStart) {
    this.current = this.create(start);
  }

  get state(): WorldState {
    return this.current;
  }

  private random() {
    let next = this.randomState | 0;
    next ^= next << 13;
    next ^= next >>> 17;
    next ^= next << 5;
    this.randomState = next >>> 0 || 0x9e3779b9;
    return this.randomState / 4_294_967_296;
  }

  private create(start: AgentStart): AgentState {
    const size = Math.max(1, Math.min(MAX_AGENTS, Math.round(start.bubbles)));
    this.randomState = start.seed >>> 0 || 1;
    this.time = 0;
    this.signs.length = 0;
    this.keywords.length = 0;
    this.couriers.length = 0;
    this.heat.fill(0);
    this.audience.fill(0);
    this.recent.fill(0);
    this.usual.fill(0);
    this.fatigue.fill(0);
    this.contact.fill(0);
    this.waiting.fill(0);
    this.pageData.fill(0);
    this.layers.fill(-1);
    this.entry = -1;
    this.startCount = size;
    this.startCrowd = Math.max(0.05, start.fish / size);
    this.population = start.fish;
    const state: AgentState = {
      size,
      rank: new Float64Array(MAX_AGENTS),
      quality: new Float64Array(MAX_AGENTS),
      groups: 1,
      group: new Uint8Array(MAX_AGENTS),
      out: Array.from({ length: size }, () => []),
    };
    this.current = state;
    this.opening = Math.max(1, Math.min(size, Math.round(start.keywords)));
    for (let keyword = 0; keyword < this.opening; keyword += 1) this.keywords.push({ parent: null, key: keyword + 0.5, layer: -1 });
    // Each bubble its own shape of its keyword (simulation/0 opened on one shape per keyword: docs/1.md).
    for (let bubble = 0; bubble < size; bubble += 1) {
      this.put(bubble, this.newSign(bubble % this.opening));
      this.heat[bubble] = (0.5 + this.random()) * this.startCrowd;
    }
    this.measure();
    for (let bubble = 0; bubble < size; bubble += 1) this.shown[bubble] = this.weight[bubble]! * this.scale();
    this.settle();
    return state;
  }

  /** Starts over. */
  restart(start: AgentStart) {
    this.create(start);
  }

  private newSign(keyword: number) {
    this.signs.push({ keyword, seed: this.random() });
    return this.signs.length - 1;
  }

  /** Bubble `bubble` shows `sign` from now. */
  private put(bubble: number, sign: number) {
    const { keyword, seed } = this.signs[sign]!;
    const word = this.keywords[keyword]!;
    this.sign[bubble] = sign;
    this.seeds[bubble] = seed;
    this.keys[bubble] = word.key;
    this.layers[bubble] = word.layer;
    this.pageData[bubble * PAGE_INTS] = sign;
    this.pageData[bubble * PAGE_INTS + 1] = keyword;
  }

  keywordOf(bubble: number) {
    return this.signs[this.sign[bubble]!]!.keyword;
  }

  /** The reference heat sizes are measured from: the mean a bubble would hold with the starting crowd on it. */
  private referenceHeat() {
    return this.startCrowd / Math.max(0.05, this.parameters.lambda);
  }

  /** Each bubble's weight (heat^contrast over the floor) and their total. */
  private measure() {
    const q = this.parameters.contrast;
    const floor = FLOOR * this.referenceHeat() ** q;
    let total = 0;
    for (let bubble = 0; bubble < this.current.size; bubble += 1) {
      const weight = Math.max(0, this.heat[bubble]!) ** q + floor;
      this.weight[bubble] = weight;
      total += weight;
    }
    this.reference = total;
    return total;
  }

  /** What turns a weight into a displayed share: 1 / the total (zero sum), or 1 / the total the screen began with. */
  private scale() {
    if (this.parameters.zeroSum >= 0.5) return 1 / Math.max(1e-12, this.reference);
    const q = this.parameters.contrast;
    return 1 / (this.startCount * (1 + FLOOR) * this.referenceHeat() ** q);
  }

  /** The settled share of each bubble (Σ = 1): presence, the 순위 order, the metrics. */
  private settle() {
    const rank = this.current.rank;
    const total = Math.max(1e-12, this.reference);
    for (let bubble = 0; bubble < this.current.size; bubble += 1) rank[bubble] = this.weight[bubble]! / total;
  }

  step(seconds: number, parameters: AgentParameters): readonly WorldEvent[] {
    this.parameters = parameters;
    if (!(seconds > 0)) return NOTHING;
    const p = parameters;
    const state = this.current;
    const size = state.size;
    this.time += seconds;
    const time = this.time;

    // Audience and heat.
    for (let bubble = 0; bubble < size; bubble += 1) {
      const audience = this.contact[bubble]! / seconds;
      this.contact[bubble] = 0;
      this.audience[bubble] = audience;
      this.recent[bubble] = this.recent[bubble]! + (audience - this.recent[bubble]!) * Math.min(1, seconds);
      this.usual[bubble] = this.usual[bubble]! + ((this.recent[bubble]! - this.usual[bubble]!) * seconds) / p.window;
      this.heat[bubble] = Math.max(0, this.heat[bubble]! + (audience - p.lambda * this.heat[bubble]!) * seconds);
    }

    // Signs that have crossed are taken on.
    for (let index = this.couriers.length - 1; index >= 0; index -= 1) {
      const courier = this.couriers[index]!;
      if (time < courier.arrive) continue;
      this.couriers.splice(index, 1);
      this.waiting[courier.to] = 0;
      if (courier.to < size && this.sign[courier.to] !== courier.sign) {
        this.put(courier.to, courier.sign);
        this.counts.signChanges += 1;
      }
    }

    // A bubble takes its busiest neighbour's sign.
    for (let bubble = 0; bubble < size; bubble += 1) {
      const out = state.out[bubble]!;
      if (out.length === 0 || this.waiting[bubble] || this.random() >= p.copy * seconds) continue;
      let busiest = -1;
      for (const contact of out) {
        if (contact.fading) continue;
        if (busiest < 0 || this.recent[contact.target]! > this.recent[busiest]!) busiest = contact.target;
      }
      if (busiest < 0 || this.recent[busiest]! <= this.recent[bubble]! || this.sign[busiest] === this.sign[bubble]) continue;
      if (p.losingOnly >= 0.5 && !(this.recent[bubble]! < this.usual[bubble]! * (1 - p.lose) - 0.05)) continue;
      let sign = this.sign[busiest]!;
      if (this.random() < p.mu) {
        this.keywords.push({ parent: this.signs[sign]!.keyword, key: this.keywords.length + 0.5, layer: -1 });
        sign = this.newSign(this.keywords.length - 1);
      }
      this.waiting[bubble] = 1;
      this.couriers.push({ from: busiest, to: bubble, sign, start: time, arrive: time + COURIER_SECONDS, seed: this.random() });
    }

    // Bursting.
    const crowd = p.open >= 0.5 ? this.startCrowd : Math.max(0.05, this.population / size);
    const capacity = p.capacity * crowd;
    for (let bubble = 0; bubble < size && p.tiring < 0.5 && this.ownSizes; bubble += 1) {
      const out = state.out[bubble]!;
      if (out.length === 0) continue;
      let over: boolean;
      if (p.capacityBurst >= 0.5) over = this.recent[bubble]! > capacity;
      else {
        let mean = 0;
        for (const contact of out) mean += this.heat[contact.target]!;
        over = this.heat[bubble]! > (p.burstHeat * mean) / out.length + 1e-6;
      }
      if (!over) continue;
      this.counts.bursts += 1;
      // Its fish spill to its neighbours: what leaves is seen crossing every contact.
      const share = Math.max(1, this.recent[bubble]!) / out.length;
      for (const contact of out) contact.rate += share / CROSSING_SECONDS;
      this.heat[bubble] = 0;
      this.recent[bubble] = 0;
      this.pageData[bubble * PAGE_INTS + 2] = this.pageData[bubble * PAGE_INTS + 2]! + 1;
    }

    // What crossed each relation fades; one that no longer touches goes once nothing is on it. A relation's weight is
    // its neighbour's share of the audience around the bubble: the raft's layout pulls along the heavy ones, so a
    // busy bubble is held among those that look to it (as a much-linked page was in bubble/9's raft).
    const keep = Math.exp(-seconds / CROSSING_SECONDS);
    for (let bubble = 0; bubble < size; bubble += 1) {
      const out = state.out[bubble]!;
      let around = 1e-6;
      for (const contact of out) if (!contact.fading) around += this.recent[contact.target]!;
      for (let index = out.length - 1; index >= 0; index -= 1) {
        const contact = out[index]!;
        contact.rate *= keep;
        contact.weight = contact.fading ? 0 : this.recent[contact.target]! / around;
        if (contact.fading && contact.rate < 1e-3) out.splice(index, 1);
      }
    }

    const total = this.measure();
    this.settle();
    // Tiring (bubble/6): above `burstAt` times its fair share a bubble tires until the fish have left it.
    const rest = Math.exp(-seconds / Math.max(0.1, p.recovery));
    for (let bubble = 0; bubble < size && this.ownSizes; bubble += 1) {
      const excess = p.tiring >= 0.5 ? (size * this.weight[bubble]!) / total - p.burstAt : -1;
      if (excess > 0) {
        if (this.fatigue[bubble] === 0) this.counts.bursts += 1;
        this.fatigue[bubble] = this.fatigue[bubble]! + FATIGUE_GAIN * Math.log1p(excess) * seconds;
      } else {
        const fatigue = this.fatigue[bubble]! * rest;
        this.fatigue[bubble] = fatigue < 1e-3 ? 0 : fatigue;
      }
      this.pageData[bubble * PAGE_INTS + 3] = Math.round(this.fatigue[bubble]! * 1_000);
    }
    return NOTHING;
  }

  show(fraction: number) {
    const scale = this.scale();
    const state = this.current;
    let carried = 0;
    for (let bubble = 0; bubble < state.size; bubble += 1) {
      this.shown[bubble] = this.shown[bubble]! + (this.weight[bubble]! * scale - this.shown[bubble]!) * fraction;
      for (const contact of state.out[bubble]!) carried += this.flow(bubble, contact);
    }
    this.carried = carried;
  }

  /** What a relation carries during a beat: the fish that crossed it, each as much of the display as a fish holds. */
  flow(from: number, relation: Relation) {
    const rate = (relation as Contact).rate;
    if (!(rate > 0)) return 0;
    const perFish = this.scale() / Math.max(0.05, this.parameters.lambda) ** this.parameters.contrast;
    return Math.min(0.5 * this.shown[from]!, rate * BEAT * perFish);
  }

  /** The school's contact: `amount` fish-seconds at `entity` since the last step. */
  attend(entity: number, amount: number) {
    if (entity < this.current.size) this.contact[entity] = this.contact[entity]! + amount;
  }

  /** A fish went from one bubble to another: seen along their relation if they touch. */
  moved(from: number, to: number) {
    this.counts.moves += 1;
    const out = this.current.out[from];
    if (!out) return;
    for (const contact of out) {
      if (contact.target !== to) continue;
      contact.rate += 1 / CROSSING_SECONDS;
      return;
    }
  }

  /**
   * Who touches whom, from the raft's centres and radii: found again every TOUCH_EVERY seconds. A new contact is a
   * new relation; one that has parted fades. With `view` above 0 a bubble keeps only its `view` nearest.
   */
  touch(seconds: number, points: Float64Array, radii: Float64Array) {
    this.sinceTouch += seconds;
    if (this.sinceTouch < TOUCH_EVERY) return;
    this.sinceTouch = 0;
    const state = this.current;
    const size = state.size;
    const { order, lefts } = this;
    for (let bubble = 0; bubble < size; bubble += 1) {
      order[bubble] = bubble;
      lefts[bubble] = points[bubble * 2]! - radii[bubble]! * TOUCH_SLACK;
      for (const contact of state.out[bubble]!) contact.gap = Infinity;
    }
    const sorted = order.subarray(0, size).sort((a, b) => lefts[a]! - lefts[b]!);
    for (let at = 0; at < size; at += 1) {
      const a = sorted[at]!;
      const ax = points[a * 2]!;
      const ay = points[a * 2 + 1]!;
      const ar = radii[a]! * TOUCH_SLACK;
      for (let next = at + 1; next < size; next += 1) {
        const b = sorted[next]!;
        if (lefts[b]! > ax + ar) break;
        const reach = ar + radii[b]! * TOUCH_SLACK;
        const distance = Math.hypot(points[b * 2]! - ax, points[b * 2 + 1]! - ay);
        if (distance >= reach) continue;
        const gap = distance - radii[a]! - radii[b]!;
        this.meet(a, b, gap);
        this.meet(b, a, gap);
      }
    }
    const view = Math.round(this.parameters.view);
    for (let bubble = 0; bubble < size; bubble += 1) {
      const out = state.out[bubble]!;
      if (view > 0 && out.length > view) {
        // Its `view` nearest stay; the rest are as if parted.
        const nearest = out.map((contact) => contact.gap).sort((a, b) => a - b)[view - 1]!;
        for (const contact of out) if (contact.gap > nearest) contact.gap = Infinity;
      }
      for (const contact of out) contact.fading = contact.gap === Infinity;
    }
  }

  private meet(from: number, to: number, gap: number) {
    const out = this.current.out[from]!;
    for (const contact of out) {
      if (contact.target !== to) continue;
      contact.gap = gap;
      return;
    }
    out.push({ target: to, weight: 0, fading: false, rate: 0, gap });
  }

  /**
   * `to` takes the object of `from` (its keyword; its own coat stays): the object crosses as a portion and is taken on
   * as it arrives. Nothing if it already has it, or if one is on its way.
   */
  adopt(to: number, from: number) {
    if (this.waiting[to] || from === to || from < 0) return false;
    const keyword = this.keywordOf(from);
    if (keyword === this.keywordOf(to)) return false;
    this.signs.push({ keyword, seed: this.seeds[to]! });
    this.waiting[to] = 1;
    this.couriers.push({ from, to, sign: this.signs.length - 1, start: this.time, arrive: this.time + COURIER_SECONDS, seed: this.random() });
    return true;
  }

  /** `bubble` moves on to some other of the opening's objects, at once (bubble/9's way of changing: no neighbour in it). */
  moveOn(bubble: number) {
    if (this.waiting[bubble] || this.opening < 2) return;
    const keyword = (this.keywordOf(bubble) + 1 + Math.floor(this.random() * (this.opening - 1))) % this.opening;
    this.signs.push({ keyword, seed: this.seeds[bubble]! });
    this.put(bubble, this.signs.length - 1);
    this.counts.signChanges += 1;
  }

  /** A stroke begins: one new keyword, shown as the object `key` picks (or the field layer `layer`). */
  beginStroke(key: number, layer = -1) {
    this.keywords.push({ parent: null, key, layer });
    this.counts.strokes += 1;
    if (this.parameters.open >= 0.5) this.population = Math.min(MAX_AGENTS, this.population + Math.round(this.parameters.join));
    return this.keywords.length - 1;
  }

  /** A new bubble of `keyword`, its own shape of it, as hot as `heat` (what is around it; the reference when absent); null when full. */
  lay(keyword: number, heat?: number): number | null {
    const state = this.current;
    if (state.size >= MAX_AGENTS) return null;
    const bubble = state.size;
    state.out.push([]);
    state.size = bubble + 1;
    this.heat[bubble] = heat ?? this.referenceHeat();
    this.fatigue[bubble] = 0;
    this.audience[bubble] = 0;
    this.recent[bubble] = 0;
    this.usual[bubble] = 0;
    this.contact[bubble] = 0;
    this.waiting[bubble] = 0;
    this.shown[bubble] = 0;
    this.pageData[bubble * PAGE_INTS + 2] = 0;
    this.pageData[bubble * PAGE_INTS + 3] = 0;
    this.put(bubble, this.newSign(keyword));
    this.arrivesAt(bubble);
    return bubble;
  }

  /** At the cap: the bubble there takes a new shape of the stroke's keyword instead. */
  takeOn(bubble: number, keyword: number) {
    this.put(bubble, this.newSign(keyword));
    this.counts.signChanges += 1;
    this.arrivesAt(bubble);
  }

  private arrivesAt(bubble: number) {
    this.entry = bubble;
    this.entryUntil = this.time + NEWCOMERS_SECONDS;
  }

  /** `count` fish have left the screen (the open audience). */
  left(count: number) {
    this.population = Math.max(0, this.population - count);
  }

  // The seam's hand-made relations and qualities are PageRank's: nothing here.
  add(): number | null {
    return null;
  }

  relate() {
    return false;
  }

  release() {
    return false;
  }

  relation(): Relation | null {
    return null;
  }

  setQuality() {}

  metrics(): WorldMetrics {
    const state = this.current;
    const ranks = Array.from(state.rank.subarray(0, state.size));
    let leader = 0;
    for (let bubble = 1; bubble < state.size; bubble += 1) if (ranks[bubble]! > ranks[leader]!) leader = bubble;
    ranks.sort((a, b) => b - a);
    const n = ranks.length;
    let weighted = 0;
    let total = 0;
    for (let index = 0; index < n; index += 1) {
      weighted += (n - 2 * index - 1) * ranks[index]!;
      total += ranks[index]!;
    }
    const median = ranks[Math.floor(n / 2)] ?? 0;
    let middle = 0;
    let large = 0;
    for (const rank of ranks) {
      const width = median > 0 ? Math.sqrt(rank / median) : 0;
      if (width >= 5) large += 1;
      else if (width >= 2) middle += 1;
    }
    const tenth = Math.max(1, Math.round(n / 10));
    return {
      leader,
      middle,
      large,
      top: ranks[0] ?? 0,
      topTenth: ranks.slice(0, tenth).reduce((sum, value) => sum + value, 0),
      gini: n > 0 && total > 0 ? weighted / (n * total) : 0,
      widest: median > 0 ? Math.sqrt((ranks[0] ?? 0) / median) : 0,
    };
  }
}

type AgentState = { size: number; rank: Float64Array; quality: Float64Array; groups: number; group: Uint8Array; out: Contact[][] };

const NOTHING: readonly WorldEvent[] = [];
