// Two myopic agents (model M9, 2026-11-16; source: ../docs/model/goldfishes-all-versions.html#m9).
//
//  goldfish f  wants: something less boring. sees: its own bubble and that bubble's neighbours — their sign and
//              crowd — and its own familiarity. value(j) = fresh_f(s_j) (1 + alpha a_j / Σa in view),
//              fresh_f(s) = (1 − M_f(K_s)) (1 − m_f(s)). It moves only to a bubble worth `theta` more than its
//              own; if nothing in view is worth `outside`, it leaves the screen. Watching makes a keyword and a
//              shape familiar; not watching lets them fade.
//  bubble i    wants: its own audience. sees: its audience and its neighbours' audience and sign; nothing of the
//              fish's minds. While it is losing fish it takes the sign of its busiest neighbour (with
//              probability `mu`, a keyword associated with that one instead).
//  heat        dh = a − lambda h; a bubble holding more fish than `capacity` bursts: heat 0, its fish spill to
//              its neighbours.
//  input       a stroke lays bubbles of one new keyword and brings `join` new fish. Nothing new appears
//              without one.
//
// One engine. The earlier versions that differ from M9 only by conditions are parameter sets (PRESETS), not code.
// Positions and sizes are the model's own here (packing.ts) because who touches whom depends on them; colours and
// shapes are not part of it. Lengths are fractions of the field's width. All randomness is the world's own stream.

import { neighbours, radii, relax } from "./packing.ts";

export type Parameters = {
  // goldfish
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
  /** Field widths per second. */
  speed: number;
  /** 1: move only to a bubble worth `theta` more (no dice); 0: choose by exp(greed × value) (M8). */
  betterOnly: number;
  theta: number;
  greed: number;
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
  /** 1: the audience is every fish that chose the bubble, swimming there included (M8.1); 0: arrived fish only. */
  countSwimming: number;
  /** 1: burst above `capacity` fish; 0: burst above `burstHeat` × the neighbours' mean heat (M8). */
  capacityBurst: number;
  /** Fish a bubble holds, in multiples of the mean per bubble (the starting mean when `open`, the current one otherwise). */
  capacity: number;
  burstHeat: number;
  // audience
  /** 1: fish come with a stroke and leave when bored (M9); 0: their number is fixed (M8.2). */
  open: number;
  join: number;
  /** What the world off the screen is worth to a fish. */
  outside: number;
  // setup
  fish: number;
  bubbles: number;
  keywords: number;
  /** How familiar the fish already are with the starting keywords. */
  familiar: number;
  // where a bubble sits (M9.1's three conditions)
  /** 1: every fish looks again at the same rate, look × (1 + view); 0: look × the bubbles it sees. */
  evenLook: number;
  /** 1: a bubble's neighbours are its `view` nearest; 0: the ones it touches. */
  evenView: number;
  view: number;
  /** 1: neighbours only on real contact and a weak pull to the centre; 0: M9's looser contact. */
  trueContact: number;
  // size
  /** 1: a bubble's area follows its own heat; 0: its share of a fixed total (M8.1). */
  ownSize: number;
  area: number;
  /** Area ∝ heat^contrast. */
  contrast: number;
};

export const M9: Parameters = {
  look: 0.05,
  alpha: 1,
  keywordBore: 0.15,
  shapeBore: 0.4,
  keywordForget: 0.001,
  shapeForget: 0.05,
  speed: 0.15,
  betterOnly: 1,
  theta: 0.3,
  greed: 4,
  copy: 0.3,
  mu: 0.005,
  lambda: 0.3,
  losingOnly: 1,
  window: 5,
  lose: 0.3,
  countSwimming: 0,
  capacityBurst: 1,
  capacity: 4,
  burstHeat: 3,
  open: 1,
  join: 40,
  outside: 0.1,
  fish: 150,
  bubbles: 60,
  keywords: 3,
  familiar: 0.9,
  evenLook: 0,
  evenView: 0,
  view: 8,
  trueContact: 0,
  ownSize: 1,
  area: 0.85,
  contrast: 1,
};

const M8_2: Parameters = { ...M9, open: 0, fish: 380, keywordBore: 0.03 };
const M8_1: Parameters = { ...M8_2, look: 0.1, lambda: 1, countSwimming: 1, ownSize: 0, capacity: 10, contrast: 2 };

/** The versions that are M9 under other conditions, as the gallery's defaults had them. M9 is the engine. */
export const PRESETS = {
  M9,
  "M9.1": { ...M9, evenLook: 1, evenView: 1, view: 8, trueContact: 1 },
  "M8.2": M8_2,
  "M8.1": M8_1,
  M8: { ...M8_1, betterOnly: 0, losingOnly: 0, countSwimming: 0, capacityBurst: 0, familiar: 0, keywordForget: 0.005, mu: 0.03 },
} satisfies Record<string, Parameters>;

/** A sign: one shape of a keyword. Keywords may have a parent they were associated from. */
export type Sign = { keyword: number };
export type Keyword = { parent: number | null; signs: number };

export type Bubble = {
  x: number;
  y: number;
  sign: number;
  heat: number;
  /** Fish on it this step. */
  audience: number;
  /** The audience over about a second, and over `window` seconds. */
  recent: number;
  usual: number;
  /** Target and shown radius. */
  radius: number;
  shown: number;
  neighbours: Bubble[];
};

export type Fish = {
  x: number;
  y: number;
  at: Bubble;
  angle: number;
  wait: number;
  /** Familiarity per keyword and per sign, 0–1. */
  keywords: Map<number, number>;
  signs: Map<number, number>;
  /** Bubbles it saw when it last chose. */
  seen: number;
};

/** What happened since the counts were last taken (measure.ts drains them every second). */
export type Counts = { signChanges: number; moves: number; bursts: number; left: number; joined: number };

export type World = {
  parameters: Parameters;
  time: number;
  bubbles: Bubble[];
  fish: Fish[];
  signs: Sign[];
  keywords: Keyword[];
  /** The keywords the screen opened on. */
  opening: number[];
  /** Fish per bubble and the heat that goes with it, at the start: what sizes and capacity are measured from. */
  startCrowd: number;
  startHeat: number;
  counts: Counts;
  bursts: number;
  randomState: number;
};

/** Field radius the bubbles start within. */
export const FIELD = 0.45;
/** A fish this near its place on a bubble's rim has arrived. */
const ARRIVED = 0.006;

export function random(world: World) {
  let next = world.randomState | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  world.randomState = next >>> 0 || 0x9e3779b9;
  return world.randomState / 4_294_967_296;
}

function newKeyword(world: World, parent: number | null = null) {
  world.keywords.push({ parent, signs: 0 });
  return world.keywords.length - 1;
}

function newSign(world: World, keyword: number) {
  world.signs.push({ keyword });
  world.keywords[keyword]!.signs += 1;
  return world.signs.length - 1;
}

export function keywordOf(world: World, bubble: Bubble) {
  return world.signs[bubble.sign]!.keyword;
}

function newBubble(x: number, y: number, sign: number, heat: number): Bubble {
  return { x, y, sign, heat, audience: 0, recent: 0, usual: 0, radius: 0.01, shown: 0.002, neighbours: [] };
}

function newFish(world: World, at: Bubble): Fish {
  const { familiar } = world.parameters;
  const keywords = new Map<number, number>();
  // Everyone already knows the keywords the screen opened on, so only a stroke brings something fresh.
  if (familiar > 0) for (const keyword of world.opening) keywords.set(keyword, Math.min(0.99, familiar * (0.7 + 0.6 * random(world))));
  return { x: at.x, y: at.y, at, angle: random(world) * Math.PI * 2, wait: random(world), keywords, signs: new Map(), seen: 1 };
}

export function createWorld(parameters: Parameters = M9, seed = 1): World {
  const world: World = {
    parameters,
    time: 0,
    bubbles: [],
    fish: [],
    signs: [],
    keywords: [],
    opening: [],
    startCrowd: parameters.fish / parameters.bubbles,
    startHeat: parameters.fish / parameters.bubbles / Math.max(0.05, parameters.lambda),
    counts: { signChanges: 0, moves: 0, bursts: 0, left: 0, joined: 0 },
    bursts: 0,
    randomState: seed >>> 0 || 1,
  };
  const first: number[] = [];
  for (let index = 0; index < parameters.keywords; index += 1) {
    const keyword = newKeyword(world);
    world.opening.push(keyword);
    first.push(newSign(world, keyword));
  }
  for (let index = 0; index < parameters.bubbles; index += 1) {
    const turn = random(world) * Math.PI * 2;
    const reach = FIELD * Math.sqrt(random(world));
    world.bubbles.push(newBubble(0.5 + reach * Math.cos(turn), 0.5 + reach * Math.sin(turn), first[index % first.length]!, random(world)));
  }
  radii(world);
  for (const bubble of world.bubbles) bubble.shown = bubble.radius;
  for (let pass = 0; pass < 80; pass += 1) relax(world);
  neighbours(world);
  for (let index = 0; index < parameters.fish; index += 1) world.fish.push(newFish(world, world.bubbles[Math.floor(random(world) * world.bubbles.length)]!));
  return world;
}

function fresh(world: World, fish: Fish, sign: number) {
  return (1 - (fish.keywords.get(world.signs[sign]!.keyword) ?? 0)) * (1 - (fish.signs.get(sign) ?? 0));
}

/** The bubble a fish goes to next: its own, another in view, or null (it leaves the screen). */
function choose(world: World, fish: Fish): Bubble | null {
  const { alpha, betterOnly, theta, greed, open, outside } = world.parameters;
  const own = fish.at;
  let crowd = 1e-6 + own.audience;
  for (const bubble of own.neighbours) crowd += bubble.audience;
  fish.seen = 1 + own.neighbours.length;
  const worth = (bubble: Bubble) => fresh(world, fish, bubble.sign) * (1 + (alpha * bubble.audience) / crowd);
  if (betterOnly >= 0.5) {
    const stay = worth(own);
    let best = own;
    let most = stay;
    for (const bubble of own.neighbours) {
      const value = worth(bubble);
      if (value > most) {
        most = value;
        best = bubble;
      }
    }
    if (open >= 0.5 && most < outside) return null;
    return most > stay + theta ? best : own;
  }
  // M8: a dice weighted by exp(greed × value).
  let total = Math.exp(greed * worth(own));
  const weights = [total];
  for (const bubble of own.neighbours) {
    const weight = Math.exp(greed * worth(bubble));
    weights.push(weight);
    total += weight;
  }
  let cursor = random(world) * total;
  let index = 0;
  while ((cursor -= weights[index]!) > 0 && index < weights.length - 1) index += 1;
  return index === 0 ? own : own.neighbours[index - 1]!;
}

function grow(map: Map<number, number>, key: number, rate: number, seconds: number) {
  const value = map.get(key) ?? 0;
  map.set(key, value + rate * (1 - value) * seconds);
}

function fade(map: Map<number, number>, keep: number) {
  for (const [key, value] of map) {
    const next = value * keep;
    if (next < 1e-4) map.delete(key);
    else map.set(key, next);
  }
}

function setSign(world: World, bubble: Bubble, sign: number) {
  if (bubble.sign === sign) return;
  bubble.sign = sign;
  world.counts.signChanges += 1;
}

function exponential(world: World) {
  return -Math.log(random(world) || 1e-9);
}

/** Advances the world by `seconds` (the gallery stepped at most 0.05 s). */
export function step(world: World, seconds: number) {
  const p = world.parameters;
  world.time += seconds;
  for (const bubble of world.bubbles) bubble.audience = 0;

  // Goldfish.
  const keepKeyword = Math.exp(-p.keywordForget * seconds);
  const keepShape = Math.exp(-p.shapeForget * seconds);
  const countSwimming = p.countSwimming >= 0.5;
  let anyLeft = false;
  for (const fish of world.fish) {
    fade(fish.keywords, keepKeyword);
    fade(fish.signs, keepShape);
    const at = fish.at;
    const dx = at.x + Math.cos(fish.angle) * at.shown - fish.x;
    const dy = at.y + Math.sin(fish.angle) * at.shown - fish.y;
    const distance = Math.hypot(dx, dy);
    if (countSwimming) at.audience += 1;
    if (distance > ARRIVED) {
      const stride = Math.min(distance, p.speed * seconds);
      fish.x += (dx / distance) * stride;
      fish.y += (dy / distance) * stride;
      continue;
    }
    if (!countSwimming) at.audience += 1;
    fish.wait -= seconds;
    fish.angle += seconds * 0.6;
    grow(fish.keywords, world.signs[at.sign]!.keyword, p.keywordBore, seconds);
    grow(fish.signs, at.sign, p.shapeBore, seconds);
    if (fish.wait > 0) continue;
    const next = choose(world, fish);
    if (next === null) {
      fish.wait = Number.NaN;
      anyLeft = true;
      world.counts.left += 1;
      continue;
    }
    if (next !== at) world.counts.moves += 1;
    fish.angle = Math.atan2(fish.y - next.y, fish.x - next.x);
    fish.at = next;
    fish.wait = exponential(world) / (p.look * (p.evenLook >= 0.5 ? 1 + p.view : fish.seen));
  }
  if (anyLeft) world.fish = world.fish.filter((fish) => !Number.isNaN(fish.wait));

  // Bubbles: their audience over a second and over `window` seconds, and their heat.
  for (const bubble of world.bubbles) {
    bubble.recent += (bubble.audience - bubble.recent) * Math.min(1, seconds);
    bubble.usual += ((bubble.recent - bubble.usual) * seconds) / p.window;
    bubble.heat += (bubble.audience - p.lambda * bubble.heat) * seconds;
  }

  // A bubble takes its busiest neighbour's sign.
  for (const bubble of world.bubbles) {
    if (!bubble.neighbours.length || random(world) >= p.copy * seconds) continue;
    let busiest = bubble.neighbours[0]!;
    for (const other of bubble.neighbours) if (other.recent > busiest.recent) busiest = other;
    if (busiest.recent <= bubble.recent || busiest.sign === bubble.sign) continue;
    if (p.losingOnly >= 0.5 && !(bubble.recent < bubble.usual * (1 - p.lose) - 0.05)) continue;
    if (random(world) < p.mu) setSign(world, bubble, newSign(world, newKeyword(world, world.signs[busiest.sign]!.keyword)));
    else setSign(world, bubble, busiest.sign);
  }

  // Bursting.
  const capacity = p.capacity * (p.open >= 0.5 ? world.startCrowd : world.fish.length / world.bubbles.length);
  for (const bubble of world.bubbles) {
    if (!bubble.neighbours.length) continue;
    let over: boolean;
    if (p.capacityBurst >= 0.5) over = bubble.audience > capacity;
    else {
      let mean = 0;
      for (const other of bubble.neighbours) mean += other.heat;
      over = bubble.heat > (p.burstHeat * mean) / bubble.neighbours.length + 1e-6;
    }
    if (!over) continue;
    world.counts.bursts += 1;
    world.bursts += 1;
    bubble.heat = 0;
    bubble.shown *= 0.3;
    for (const fish of world.fish) {
      if (fish.at !== bubble) continue;
      fish.at = bubble.neighbours[Math.floor(random(world) * bubble.neighbours.length)]!;
      fish.wait = random(world) / (p.look * (fish.at.neighbours.length + 1));
    }
  }

  // Sizes follow heat; bubbles push each other; who touches whom is found again.
  radii(world);
  const ease = 1 - Math.exp(-8 * seconds);
  for (const bubble of world.bubbles) bubble.shown += (bubble.radius - bubble.shown) * ease;
  relax(world);
  neighbours(world);
}

/** A bubble of a stroke's keyword at a point, as hot as what is around it; each is a new shape of the keyword. */
function lay(world: World, keyword: number, x: number, y: number) {
  let heat = 0;
  let near = 0;
  for (const other of world.bubbles) {
    if (Math.hypot(other.x - x, other.y - y) >= 0.12) continue;
    heat += other.heat;
    near += 1;
  }
  const bubble = newBubble(x, y, newSign(world, keyword), near ? heat / near : 1);
  bubble.shown = 0.01;
  world.bubbles.push(bubble);
  return bubble;
}

/**
 * The audience's stroke begins: one new keyword, its first bubble and, when the audience is open, `join` new fish
 * at it. Returns the keyword, for extendStroke.
 */
export function beginStroke(world: World, x: number, y: number) {
  const keyword = newKeyword(world);
  const bubble = lay(world, keyword, x, y);
  if (world.parameters.open >= 0.5) {
    for (let index = 0; index < world.parameters.join; index += 1) world.fish.push(newFish(world, bubble));
    world.counts.joined += world.parameters.join;
  }
  return keyword;
}

/** The stroke goes on: another bubble of its keyword. */
export function extendStroke(world: World, keyword: number, x: number, y: number) {
  lay(world, keyword, x, y);
}

/** A whole stroke at once: a bubble at each point. Returns its keyword. */
export function stroke(world: World, points: readonly (readonly [number, number])[]) {
  const keyword = beginStroke(world, points[0]![0], points[0]![1]);
  for (let index = 1; index < points.length; index += 1) extendStroke(world, keyword, points[index]![0], points[index]![1]);
  return keyword;
}

/** The gallery's pointer laid a bubble each time it had moved this far (a fraction of the field). */
export const STROKE_SPACING = 0.03;

/** Points along a straight stroke, spaced as the gallery's pointer spaced them. */
export function line(from: readonly [number, number], to: readonly [number, number]) {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const count = Math.max(1, Math.floor(length / STROKE_SPACING) + 1);
  return Array.from({ length: count }, (_, index): [number, number] => {
    const t = count > 1 ? index / (count - 1) : 0;
    return [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
  });
}
