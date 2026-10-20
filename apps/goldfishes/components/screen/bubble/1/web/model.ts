// A living web ranked by PageRank, in continuous time. Every page spreads its
// outgoing attention over a few candidate links with weights w_ij ≥ 0; a
// random surfer on page i follows link j with probability w_ij / Σ_k w_ik
// (with probability d), otherwise jumps to a uniformly random page:
//
//   PR(i) = (1 − d)/N + d Σ_j PR(j) · w_ji / W_j + d Σ_{dangling j} PR(j)/N
//
// Attention adapts continuously toward appeal: each weight relaxes as
//   dw_ij/dt = λ (a_j / Σ_{k ∈ C_i} a_k − w_ij),  a_j = (PR_j + floor/N) · e^{q_j},
// where C_i is page i's candidate set and q_j is page j's hidden quality,
// which drifts as a mean-reverting random walk. Candidates are discovered by
// appeal and enter at weight 0; the weakest candidate of a full set fades out
// before it is dropped. Rank shapes attention and attention shapes rank, and
// nothing changes in a jump. New pages arrive at a set rate.
//
// Sources: Brin & Page, Comput. Netw. ISDN Syst. 30, 107 (1998); Fortunato,
// Flammini & Menczer, PRL 96, 218701 (2006) "Scale-free network growth by
// ranking"; Bianconi & Barabási, Europhys. Lett. 54, 436 (2001) for fitness.
// The continuous attention weights and drifting quality are this route's
// extension. Positions are not part of this model.

export const MAX_PAGES = 1_000;
export const DEFAULT_PAGES = 100;
export const DEFAULT_DAMPING = 0.85;
export const DAMPING_RANGE = [0.5, 0.95] as const;
/** New pages per second. */
export const GROWTH_RANGE = [0, 2] as const;
export const VOLATILITY_RANGE = [0, 1.5] as const;
/** Uniform floor in appeal, in units of 1/N: small favours high rank, large is even. */
export const FLOOR_RANGE = [0.05, 20] as const;
/** Candidate links one page keeps. */
export const MAX_CANDIDATES = 5;
/** Disconnected groups (echo chambers): links form only within a group. */
export const MAX_GROUPS = 4;
export const DEFAULT_DIVERSITY = 0.6;

/**
 * One group's character, relative to the parameters the panel sets: its share
 * of the pages (and of new pages), a shift in its pages' mean log quality, and
 * multipliers on the appeal floor (small: hub-dominated, large: even), quality
 * volatility, how fast attention follows appeal, and link discovery.
 */
export type GroupProfile = {
  share: number;
  quality: number;
  floor: number;
  volatility: number;
  adaptation: number;
  discovery: number;
};

const NEUTRAL_PROFILE: GroupProfile = { share: 1, quality: 0, floor: 1, volatility: 1, adaptation: 1, discovery: 1 };

/**
 * Group profiles spread around the given parameters. Each trait takes evenly
 * spaced values in [−1, 1] dealt to the groups in a seeded order, so groups
 * always differ and differ in different ways; `diversity` 0 makes them alike.
 * Its own random stream: the web's is untouched.
 */
export function groupProfiles(groups: number, diversity: number, seed: number): GroupProfile[] {
  if (groups <= 1) return [{ ...NEUTRAL_PROFILE }];
  let state = (seed ^ (groups * 0x9e3779b9)) >>> 0 || 1;
  const random = () => {
    const [value, next] = nextRandom(state);
    state = next;
    return value;
  };
  const dealt = () => {
    const values = Array.from({ length: groups }, (_, index) => (index / (groups - 1)) * 2 - 1);
    for (let index = values.length - 1; index > 0; index -= 1) {
      const other = Math.floor(random() * (index + 1));
      [values[index], values[other]] = [values[other]!, values[index]!];
    }
    return values;
  };
  const amount = Math.max(0, Math.min(1, diversity));
  const share = dealt();
  const quality = dealt();
  const floor = dealt();
  const volatility = dealt();
  const adaptation = dealt();
  const discovery = dealt();
  return Array.from({ length: groups }, (_, group) => ({
    // At full diversity: shares up to about 6:1, floors ×0.22–4.5 (a hub raft beside an even one).
    share: Math.exp(amount * 0.9 * share[group]!),
    quality: amount * 0.5 * quality[group]! + 0, // never −0
    floor: Math.exp(amount * 1.5 * floor[group]!),
    volatility: Math.exp(amount * 0.6 * volatility[group]!),
    adaptation: Math.exp(amount * 0.6 * adaptation[group]!),
    discovery: Math.exp(amount * 0.7 * discovery[group]!),
  }));
}
/** Candidates a new page starts with. */
export const NEW_PAGE_LINKS = 2;
/** A fading candidate is dropped below this weight. */
const DROP_WEIGHT = 0.004;
const QUALITY_REVERSION = 0.08;
const TOLERANCE = 1e-9;
const MAX_ITERATIONS = 200;

export type Candidate = { target: number; weight: number; fading: boolean };

export type RankedWeb = {
  size: number;
  readonly out: Candidate[][];
  readonly rank: Float64Array;
  /** Log of each page's hidden quality. */
  readonly quality: Float64Array;
  damping: number;
  randomState: number;
  /** Number of groups; 1 is one connected web. */
  groups: number;
  /** Each page's group. Automatic links stay inside it; only a hand-drawn link crosses. */
  readonly group: Uint8Array;
  readonly profiles: readonly GroupProfile[];
  /** Pages per group. */
  readonly groupSize: Uint16Array;
};

export type WebParameters = {
  /** New pages per second. */
  growth: number;
  /** Volatility of log quality per √second. */
  volatility: number;
  /** Appeal floor, in units of 1/N. */
  floor: number;
  /** λ: how fast attention follows appeal, per second. */
  adaptation: number;
  /** Rate per page per second of discovering a new candidate. */
  discovery: number;
};

export const DEFAULT_PARAMETERS: WebParameters = {
  growth: 0.3,
  volatility: 0.6,
  floor: 3,
  adaptation: 0.6,
  discovery: 0.25,
};

export type WebEvent = { kind: "page"; page: number; targets: number[] };

function nextRandom(state: number): readonly [number, number] {
  let next = state | 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  const unsigned = next >>> 0;
  return [unsigned / 4_294_967_296, unsigned || 0x9e3779b9];
}

function randomFor(web: RankedWeb) {
  return () => {
    const [value, next] = nextRandom(web.randomState);
    web.randomState = next;
    return value;
  };
}

function randomIndex(value: number, length: number) {
  return Math.min(length - 1, Math.floor(value * length));
}

function gaussian(random: () => number) {
  return Math.sqrt(-2 * Math.log(Math.max(1e-12, random()))) * Math.cos(2 * Math.PI * random());
}

export function candidate(web: RankedWeb, from: number, to: number) {
  return web.out[from]?.find((entry) => entry.target === to) ?? null;
}

/** Total outgoing weight of a page. */
export function outWeight(web: RankedWeb, page: number) {
  let total = 0;
  for (const entry of web.out[page]!) total += entry.weight;
  return total;
}

// Scratch for computeRank and stepRankedWeb, reused between calls (web.size ≤ MAX_PAGES).
let rankCurrent = new Float64Array(MAX_PAGES);
let rankNext = new Float64Array(MAX_PAGES);
const rankTotals = new Float64Array(MAX_PAGES);
const appeals = new Float64Array(MAX_PAGES);

/** Power iteration on the weighted web, warm-started from the current ranks. */
export function computeRank(web: RankedWeb) {
  const n = web.size;
  if (n === 0) return 0;
  const d = web.damping;
  let current = rankCurrent;
  let next = rankNext;
  let sum = 0;
  for (let i = 0; i < n; i += 1) {
    current[i] = web.rank[i]!;
    sum += current[i]!;
  }
  if (!(sum > 0)) current.fill(1 / n, 0, n);
  else for (let i = 0; i < n; i += 1) current[i] = current[i]! / sum;
  const totals = rankTotals;
  for (let i = 0; i < n; i += 1) totals[i] = outWeight(web, i);
  let iteration = 0;
  for (; iteration < MAX_ITERATIONS; iteration += 1) {
    let dangling = 0;
    for (let i = 0; i < n; i += 1) if (totals[i]! <= 1e-12) dangling += current[i]!;
    next.fill((1 - d) / n + (d * dangling) / n, 0, n);
    for (let i = 0; i < n; i += 1) {
      if (totals[i]! <= 1e-12) continue;
      const scale = (d * current[i]!) / totals[i]!;
      for (const entry of web.out[i]!) next[entry.target] = next[entry.target]! + scale * entry.weight;
    }
    let change = 0;
    for (let i = 0; i < n; i += 1) change += Math.abs(next[i]! - current[i]!);
    // The step just taken becomes the current distribution; the old one is overwritten next step.
    [current, next] = [next, current];
    if (change < TOLERANCE) break;
  }
  rankCurrent = current;
  rankNext = next;
  sum = 0;
  for (let i = 0; i < n; i += 1) sum += current[i]!;
  for (let i = 0; i < n; i += 1) web.rank[i] = current[i]! / sum;
  return iteration + 1;
}

/** True when automatic links may not join `a` and `b`. */
function apart(web: RankedWeb, a: number, b: number) {
  return web.groups > 1 && web.group[a] !== web.group[b];
}

/** The group furthest below its share of the pages: new pages keep the groups in proportion. */
function neediestGroup(web: RankedWeb) {
  if (web.groups <= 1) return 0;
  let total = 0;
  for (const profile of web.profiles) total += profile.share;
  let best = 0;
  let deficit = -Infinity;
  for (let group = 0; group < web.groups; group += 1) {
    const want = ((web.size + 1) * web.profiles[group]!.share) / total - web.groupSize[group]!;
    if (want > deficit) {
      deficit = want;
      best = group;
    }
  }
  return best;
}

/**
 * A random sparse web: every page starts with two settled candidates. With
 * `groups` > 1 the pages are dealt to groups by their profiles' shares and
 * link only within their group, so the web is that many disconnected parts,
 * each with its own character (`groupProfiles`); one group is the original web.
 */
export function createRankedWeb(size = DEFAULT_PAGES, seed = 0x2545f491, groups = 1, diversity = DEFAULT_DIVERSITY): RankedWeb {
  const groupCount = Math.max(1, Math.min(MAX_GROUPS, Math.round(groups)));
  const web: RankedWeb = {
    size,
    out: Array.from({ length: size }, () => []),
    rank: new Float64Array(MAX_PAGES),
    quality: new Float64Array(MAX_PAGES),
    damping: DEFAULT_DAMPING,
    randomState: seed >>> 0 || 1,
    groups: groupCount,
    group: new Uint8Array(MAX_PAGES),
    profiles: groupProfiles(groupCount, diversity, seed),
    groupSize: new Uint16Array(MAX_GROUPS),
  };
  const members: number[][] = Array.from({ length: web.groups }, () => []);
  for (let page = 0; page < size; page += 1) {
    web.size = page;
    const group = neediestGroup(web);
    web.group[page] = group;
    web.groupSize[group] = web.groupSize[group]! + 1;
    members[group]!.push(page);
  }
  web.size = size;
  const random = randomFor(web);
  for (let page = 0; page < size; page += 1) {
    web.quality[page] = gaussian(random) * 0.5 + web.profiles[web.group[page]!]!.quality;
    const own = members[web.group[page]!]!;
    // A group too small to give every page two others links what it can.
    while (web.out[page]!.length < Math.min(NEW_PAGE_LINKS, own.length - 1)) {
      const target = own[randomIndex(random(), own.length)]!;
      if (target !== page && !candidate(web, page, target)) {
        web.out[page]!.push({ target, weight: 1 / NEW_PAGE_LINKS, fading: false });
      }
    }
  }
  computeRank(web);
  return web;
}

export function setDamping(web: RankedWeb, damping: number) {
  web.damping = Math.min(DAMPING_RANGE[1], Math.max(DAMPING_RANGE[0], damping));
  computeRank(web);
}

/** A page's appeal; its group's floor multiplier applies (1 with one group). */
function appeal(web: RankedWeb, page: number, floor: number) {
  return (web.rank[page]! + (floor * web.profiles[web.group[page]!]!.floor) / web.size) * Math.exp(web.quality[page]!);
}

/** Writes every page's appeal into `out`. */
function appealsOf(web: RankedWeb, floor: number, out: Float64Array) {
  for (let page = 0; page < web.size; page += 1) out[page] = appeal(web, page, floor);
  return out;
}

/** Picks a page with probability ∝ its appeal (from `appealOf`), excluding `exclude`. */
function pickByAppeal(web: RankedWeb, random: () => number, appealOf: ArrayLike<number>, exclude: (page: number) => boolean) {
  let total = 0;
  for (let page = 0; page < web.size; page += 1) if (!exclude(page)) total += appealOf[page]!;
  if (total <= 0) return null;
  let cursor = random() * total;
  let last: number | null = null;
  for (let page = 0; page < web.size; page += 1) {
    if (exclude(page)) continue;
    last = page;
    cursor -= appealOf[page]!;
    if (cursor <= 0) return page;
  }
  return last;
}

/** Adds `to` as a candidate of `from`, entering at `weight` (0 means it grows in). */
export function addCandidate(web: RankedWeb, from: number, to: number, weight = 0) {
  if (from === to || from < 0 || to < 0 || from >= web.size || to >= web.size) return false;
  const existing = candidate(web, from, to);
  if (existing) {
    existing.fading = false;
    existing.weight = Math.max(existing.weight, weight);
    return true;
  }
  web.out[from]!.push({ target: to, weight, fading: false });
  return true;
}

/** Marks a candidate to fade out; it is dropped once its weight is negligible. */
export function fadeCandidate(web: RankedWeb, from: number, to: number) {
  const entry = candidate(web, from, to);
  if (!entry || entry.fading) return false;
  entry.fading = true;
  return true;
}

/**
 * Appends a page with no candidates; null at MAX_PAGES. Unless given, its
 * group is the one furthest below its share; its quality is relative to its
 * group's mean.
 */
export function addPage(web: RankedWeb, quality = 0, group?: number) {
  if (web.size >= MAX_PAGES) return null;
  const chosen = Math.max(0, Math.min(web.groups - 1, group ?? neediestGroup(web)));
  const page = web.size;
  web.size += 1;
  web.out.push([]);
  web.group[page] = chosen;
  web.groupSize[chosen] = web.groupSize[chosen]! + 1;
  web.rank[page] = 1 / web.size;
  web.quality[page] = quality + web.profiles[chosen]!.quality;
  computeRank(web);
  return page;
}

/**
 * Advances the web by `seconds`: quality drifts, attention relaxes toward
 * appeal, candidates are discovered and faded, and new pages may arrive.
 */
export function stepRankedWeb(
  web: RankedWeb,
  seconds: number,
  parameters: WebParameters,
  pendingPages = { value: 0 },
): WebEvent[] {
  const events: WebEvent[] = [];
  if (seconds <= 0) return events;
  const random = randomFor(web);
  const { floor, volatility } = parameters;

  // Quality: Ornstein–Uhlenbeck in log space, exact over the step.
  const keep = Math.exp(-QUALITY_REVERSION * seconds);
  const spread = volatility * Math.sqrt((1 - keep * keep) / (2 * QUALITY_REVERSION));
  // Each group's quality reverts to its own mean, with its own volatility.
  for (let page = 0; page < web.size; page += 1) {
    const profile = web.profiles[web.group[page]!]!;
    web.quality[page] = profile.quality + (web.quality[page]! - profile.quality) * keep + spread * profile.volatility * gaussian(random);
  }

  // Attention: each weight relaxes toward its target's share of appeal. Rank,
  // quality and size hold still until the new pages below, so appeal is computed once.
  appealsOf(web, floor, appeals);
  const relaxes = web.profiles.map((profile) => 1 - Math.exp(-parameters.adaptation * profile.adaptation * seconds));
  const discovers = web.profiles.map((profile) => 1 - Math.exp(-parameters.discovery * profile.discovery * seconds));
  for (let page = 0; page < web.size; page += 1) {
    const relax = relaxes[web.group[page]!]!;
    const discover = discovers[web.group[page]!]!;
    const list = web.out[page]!;
    let total = 0;
    for (const entry of list) if (!entry.fading) total += appeals[entry.target]!;
    for (const entry of list) {
      const share = entry.fading || total <= 0 ? 0 : appeals[entry.target]! / total;
      entry.weight += (share - entry.weight) * relax;
    }
    for (let index = list.length - 1; index >= 0; index -= 1) {
      if (list[index]!.fading && list[index]!.weight < DROP_WEIGHT) list.splice(index, 1);
    }
    if (random() < discover) {
      const target = pickByAppeal(web, random, appeals, (other) => other === page || apart(web, page, other) || list.some((entry) => entry.target === other));
      if (target !== null) {
        const active = list.filter((entry) => !entry.fading);
        if (active.length >= MAX_CANDIDATES) {
          // A full page lets its weakest link fade to make room.
          let weakest = active[0]!;
          for (const entry of active) if (entry.weight < weakest.weight) weakest = entry;
          weakest.fading = true;
        }
        list.push({ target, weight: 0, fading: false });
      }
    }
  }

  // New pages arrive with fresh quality and grow their first links from zero.
  pendingPages.value += parameters.growth * seconds;
  while (pendingPages.value >= 1) {
    pendingPages.value -= 1;
    const page = addPage(web, gaussian(random) * 0.6);
    if (page === null) break;
    const targets: number[] = [];
    // addPage changed the size and the ranks: appeal afresh.
    appealsOf(web, floor, appeals);
    for (let link = 0; link < NEW_PAGE_LINKS; link += 1) {
      const target = pickByAppeal(web, random, appeals, (other) => other === page || apart(web, page, other) || targets.includes(other));
      if (target !== null) targets.push(target);
    }
    for (const target of targets) web.out[page]!.push({ target, weight: 0, fading: false });
    events.push({ kind: "page", page, targets });
  }

  computeRank(web);
  return events;
}

/** Most log quality watching can give a page; it then reverts like any other quality. */
const ATTENDED_QUALITY = 1.5;

/**
 * Attention from outside the web (bubble/3's goldfish) raises a page's log
 * quality by `amount`, up to ATTENDED_QUALITY above its group mean; drift then pulls it back.
 */
export function attend(web: RankedWeb, page: number, amount: number) {
  if (page < 0 || page >= web.size || !(amount > 0)) return;
  // Measured from the page's group mean (0 with one group).
  const ceiling = web.profiles[web.group[page]!]!.quality + ATTENDED_QUALITY;
  const quality = web.quality[page]!;
  if (quality < ceiling) web.quality[page] = Math.min(ceiling, quality + amount);
}

/** Share of rank held by the top page, and by the top 10% of pages. */
export function concentration(web: RankedWeb) {
  const ranks = Array.from(web.rank.subarray(0, web.size)).sort((a, b) => b - a);
  const tenth = Math.max(1, Math.round(web.size / 10));
  return {
    top: ranks[0] ?? 0,
    topTenth: ranks.slice(0, tenth).reduce((sum, value) => sum + value, 0),
  };
}

export function leader(web: RankedWeb) {
  let best = 0;
  for (let page = 1; page < web.size; page += 1) if (web.rank[page]! > web.rank[best]!) best = page;
  return best;
}
