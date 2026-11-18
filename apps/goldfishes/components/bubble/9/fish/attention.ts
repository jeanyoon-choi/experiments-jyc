// A fish's attention: which page it attends, and what watching does to it and
// to the page. Today every fish is the same surfer of the web (PageRank's
// random surfer): when its attention lapses it either follows one of its
// page's links, with probability `follow` and in proportion to the link's
// weight, or looks about and picks by salience — displayed rank, novelty of
// new pages, its own boredom and the crowd already there. Pages buried inside
// the raft are not reachable and are not chosen.
//
// The unit is kept apart from the swimming (school.ts) so the rule can change.
//   Reads: the web's links (SchoolWeb or FlatLinks) and displayed ranks
//          (`shown`); the raft's faces (Faces: which pages are buried, where a
//          page's free face is); the fish's position, seed and current page;
//          the fish settings; the school's clock and its one random stream.
//   Writes: on the fish — target, angle, turn, stuck, reconsiderAt; of its own
//          — the crowd at each page, each fish's familiarity with each page,
//          when each page arrived, and `contact`, the fish-seconds each page
//          was watched, which the route drains into that page's quality.
// Draws from the random stream are in a pinned order (school-hash.test.ts).

import { drain, unit, type RandomStream } from "./math.ts";
import { MAX_PAGES, type Fish, type FishParameters, type FlatLinks, type SchoolWeb } from "./model.ts";

const FAMILIARITY_DECAY = 12;
const FAMILIARITY_CAP = 4;

/** What attention asks of the raft (obstacles.ts): the pages' discs, and which of them can be reached. */
export type Faces = {
  readonly pageCount: number;
  /** x y radius seed per disc; a page's is at discOf(page). */
  readonly discs: Float32Array;
  discOf(page: number): number;
  buried(page: number, hold: number, clearance: number): boolean;
  /** The free angle around `page` nearest to `preferred`, or null. */
  exposedAngle(page: number, preferred: number, hold: number, clearance: number): number | null;
};

/** One step's inputs to attention; the school keeps one and refills it. */
export type AttentionInput = {
  /** The school's clock, s. */
  time: number;
  web: SchoolWeb | FlatLinks;
  /** Displayed rank per page. */
  shown: ArrayLike<number>;
  parameters: FishParameters;
  faces: Faces;
  /** How far from a page's edge a fish holds, and the clearance its side needs, px. */
  hold: number;
  clearance: number;
  random: RandomStream;
};

export class Attention {
  // Per page: when it appeared (s) and how many fish attend it.
  private readonly born = new Float64Array(MAX_PAGES);
  private readonly crowd = new Uint16Array(MAX_PAGES);
  private readonly contact = new Float64Array(MAX_PAGES);
  /** Scratch: each page's appeal to the fish reconsidering. */
  private readonly scores = new Float64Array(MAX_PAGES);
  /** Scratch for lookAbout(): the pages that score, by index. */
  private readonly order = new Int32Array(MAX_PAGES);
  /** Per fish and page (fish id × MAX_PAGES + page): how used to it the fish is, and as of when. */
  private readonly familiarity = new Map<number, { value: number; time: number }>();
  private lastCleanup = 0;
  /** Scratch for follow(): one page's links copied flat from a web that keeps them as objects. */
  private linkTarget = new Int32Array(16);
  private linkWeight = new Float64Array(16);
  /** The hold angle found with the page follow() or lookAbout() chose. */
  private found = 0;

  constructor() {
    this.born.fill(-1_000);
  }

  /** Marks pages from `from` up to `to` as just arrived. */
  notePages(from: number, to: number, time: number) {
    for (let page = Math.max(0, from); page < Math.min(to, this.born.length); page += 1) this.born[page] = time;
  }

  /** The web started over: every page is new to the fish. */
  forgetPages() {
    this.born.fill(-1_000);
    this.familiarity.clear();
  }

  /** Fish-seconds of contact per page since the last drain; the array is reused. */
  drainContact(pageCount: number, out: Float64Array) {
    drain(this.contact, pageCount, out);
  }

  /** A step begins: old memories go, pages that are gone and the dying are attended by nobody, the crowds are counted. */
  begin(time: number, school: readonly Fish[], pageCount: number) {
    if (time - this.lastCleanup > 2) {
      this.lastCleanup = time;
      for (const [key, entry] of this.familiarity) if (time - entry.time > 60) this.familiarity.delete(key);
    }
    this.crowd.fill(0, 0, pageCount);
    for (const fish of school) {
      if (fish.target >= pageCount || fish.life.dying) fish.target = -1;
      if (fish.target >= 0) this.crowd[fish.target] = this.crowd[fish.target]! + 1;
    }
  }

  /** True when the fish should reconsider: it attends nothing, its span is up, or it has stalled. */
  lapsed(fish: Fish, time: number) {
    return fish.target < 0 || time >= fish.reconsiderAt || fish.stuck > 2.5;
  }

  /** How used to `page` the fish `id` is now. */
  private remembered(id: number, page: number, time: number) {
    const entry = this.familiarity.get(id * MAX_PAGES + page);
    return entry ? entry.value * Math.exp(-(time - entry.time) / FAMILIARITY_DECAY) : 0;
  }

  /** Attention lapses: follow a link of the current page, or choose by salience. */
  reconsider(fish: Fish, input: AttentionInput) {
    const { random, parameters } = input;
    const pageCount = input.faces.pageCount;
    const id = Math.floor(fish.seed);
    const previous = fish.target;
    if (previous >= 0 && previous < pageCount) this.crowd[previous] = Math.max(0, this.crowd[previous]! - 1);
    let chosen = -1;
    this.found = 0;

    if (previous >= 0 && previous < pageCount && random.next() < parameters.follow) chosen = this.follow(fish, previous, input);
    if (chosen < 0) chosen = this.lookAbout(fish, id, previous, input);

    fish.target = chosen;
    fish.angle = this.found;
    fish.stuck = 0;
    if (chosen >= 0) this.crowd[chosen] = this.crowd[chosen]! + 1;
    if (chosen !== previous && random.next() < 0.5) fish.turn = -fish.turn;
    fish.reconsiderAt = input.time + parameters.span * (0.65 + 0.7 * unit(id, 9 + random.next()));
  }

  /** The surfer's step: one of `previous`'s links, by weight, if the page it leads to can be reached; else -1. */
  private follow(fish: Fish, previous: number, input: AttentionInput) {
    const { web, faces, random, hold, clearance } = input;
    const pageCount = faces.pageCount;
    let targets: Int32Array;
    let weights: Float64Array;
    let start = 0;
    let end = 0;
    if ("out" in web) {
      // Links kept as objects: this page's, copied in their order (values as they are).
      const links = web.out[previous];
      end = links ? links.length : 0;
      if (this.linkTarget.length < end) {
        this.linkTarget = new Int32Array(end * 2);
        this.linkWeight = new Float64Array(end * 2);
      }
      targets = this.linkTarget;
      weights = this.linkWeight;
      for (let index = 0; index < end; index += 1) {
        targets[index] = links![index]!.target;
        weights[index] = links![index]!.weight;
      }
    } else {
      targets = web.linkTarget;
      weights = web.linkWeight;
      start = web.linkStart[previous]!;
      end = web.linkStart[previous + 1]!;
    }
    let chosen = -1;
    let total = 0;
    for (let index = start; index < end; index += 1) if (targets[index]! < pageCount) total += weights[index]!;
    // Up to three draws, so one buried target does not end the surf.
    for (let draw = 0; draw < 3 && total > 1e-9 && chosen < 0; draw += 1) {
      let cursor = random.next() * total;
      for (let index = start; index < end; index += 1) {
        const target = targets[index]!;
        if (target >= pageCount) continue;
        cursor -= weights[index]!;
        if (cursor > 0) continue;
        const at = faces.discOf(target);
        const found = faces.exposedAngle(target, Math.atan2(fish.y - faces.discs[at + 1]!, fish.x - faces.discs[at]!), hold, clearance);
        if (found !== null) {
          chosen = target;
          this.found = found;
        }
        break;
      }
    }
    return chosen;
  }

  /** Looking about: the most appealing page that can be reached; -1 when none can. */
  private lookAbout(fish: Fish, id: number, previous: number, input: AttentionInput) {
    const { shown, parameters, faces, time, hold, clearance } = input;
    const pageCount = faces.pageCount;
    const discs = faces.discs;
    const mean = 1 / Math.max(1, pageCount);
    const { scores, order } = this;
    // Pages that score, in index order: a buried page (no hold point anywhere round it) cannot be chosen.
    let candidates = 0;
    for (let page = 0; page < pageCount; page += 1) {
      if (faces.buried(page, hold, clearance)) {
        scores[page] = 0;
        continue;
      }
      const at = faces.discOf(page);
      const discX = discs[at]!;
      const discY = discs[at + 1]!;
      const gap = Math.max(0, Math.hypot(discX - fish.x, discY - fish.y) - discs[at + 2]!);
      const salience = Math.sqrt(Math.max(shown[page]!, 0) / mean);
      const novelty = 1 + parameters.novelty * 4 * Math.exp(-(time - this.born[page]!) / 4);
      const loyalty = page === previous ? 1.2 : 1;
      const affinity = 0.8 + 0.4 * unit(id, page + 5);
      const boredom = 1 + this.remembered(id, page, time) * parameters.habituation * 3;
      scores[page] = (salience * novelty * loyalty * affinity) / ((80 + gap) * boredom * (1 + this.crowd[page]! * 0.3));
      if (scores[page]! > 0) order[candidates++] = page;
    }
    // The best-scoring page that is reachable (lowest index among equals): the
    // most salient first, so the search for an open hold point runs only
    // until one is found, not for every page that beats the best so far.
    // Buried pages never score (scoring left `order` the rest, by index).
    for (;;) {
      let page = -1;
      let best = 0;
      for (let index = 0; index < candidates; index += 1) {
        const other = order[index]!;
        if (scores[other]! > best) {
          best = scores[other]!;
          page = other;
        }
      }
      if (page < 0) return -1;
      const at = faces.discOf(page);
      const found = faces.exposedAngle(page, Math.atan2(fish.y - discs[at + 1]!, fish.x - discs[at]!), hold, clearance);
      if (found !== null) {
        this.found = found;
        return page;
      }
      scores[page] = 0;
    }
  }

  /**
   * The fish's mouth is at its page's edge for `seconds`: the page gains that
   * contact, the fish grows used to it and, bored before its span is up, looks elsewhere.
   */
  watch(fish: Fish, id: number, page: number, seconds: number, input: AttentionInput) {
    const { time, parameters } = input;
    this.contact[page] = this.contact[page]! + seconds;
    const key = id * MAX_PAGES + page;
    const memory = this.remembered(id, page, time);
    const value = Math.min(FAMILIARITY_CAP, memory + seconds * 0.5 * parameters.habituation);
    const entry = this.familiarity.get(key);
    if (entry) {
      entry.value = value;
      entry.time = time;
    } else this.familiarity.set(key, { value, time });
    // Bored before its span is up: look elsewhere.
    if (parameters.habituation > 0 && memory > 2.4) fish.reconsiderAt = Math.min(fish.reconsiderAt, time);
  }

  /** A fish that dies lets go of its page. */
  release(fish: Fish) {
    if (fish.target >= 0 && fish.target < this.crowd.length) this.crowd[fish.target] = Math.max(0, this.crowd[fish.target]! - 1);
    fish.target = -1;
  }
}
