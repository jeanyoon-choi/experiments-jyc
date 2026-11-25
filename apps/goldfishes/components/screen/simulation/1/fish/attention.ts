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

import { apparent, holds, OBJECT_PACE } from "../rules/attach.ts";
import { drain, unit, type RandomStream } from "./math.ts";
import { MAX_PAGES, PAGE_INTS, type AgentsInput, type Fish, type FishParameters, type FlatLinks, type SchoolWeb } from "./model.ts";

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
  /** Looking about reaches only this far from the fish, px (0 or absent: the whole screen). */
  near?: number;
  /** The two myopic agents' bubbles (null or absent: today's surfer, as bubble/9). */
  agents?: AgentsInput | null;
};

/** A fish's familiarity with a keyword or a shape: its value as of `time`. */
type Memory = { value: number; time: number };
/** Strides of the memories' keys (fish id × stride + keyword, or + sign). */
const KEYWORD_STRIDE = 16_384;
const SIGN_STRIDE = 4_194_304;

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
  // The agents' goldfish: how familiar each fish is with each keyword and each shape, the bursts seen of each
  // bubble, and which burst this step (their fish spill to a neighbour).
  private readonly keywordMemory = new Map<number, Memory>();
  private readonly signMemory = new Map<number, Memory>();
  private readonly burstsSeen = new Int32Array(MAX_PAGES);
  private readonly spilt = new Uint8Array(MAX_PAGES);
  private spilling = false;
  private agentsOn = false;
  /** A fish that holds to nothing waits for its attention to lapse before it looks again (rules/attach.ts `worth`). */
  private patient = false;
  /** Familiarity is kept by object (the bubble's keyword), and fades over this many seconds (rules/attach.ts `touch`). */
  private byObject = false;
  private forget = FAMILIARITY_DECAY;
  private keys: Int32Array | null = null;
  /** Scratch for choose(): the bubbles in view. */
  private view = new Int32Array(64);
  private worth = new Float64Array(64);

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
    this.keywordMemory.clear();
    this.signMemory.clear();
    this.burstsSeen.fill(0);
  }

  /** Fish-seconds of contact per page since the last drain; the array is reused. */
  drainContact(pageCount: number, out: Float64Array) {
    drain(this.contact, pageCount, out);
  }

  /** A step begins: old memories go, pages that are gone and the dying are attended by nobody, the crowds are counted. */
  begin(time: number, school: readonly Fish[], pageCount: number, agents: AgentsInput | null = null, patient = false) {
    this.patient = patient;
    if (!this.byObject) this.forget = FAMILIARITY_DECAY;
    if (time - this.lastCleanup > 2) {
      this.lastCleanup = time;
      const old = Math.max(60, this.forget * 5);
      for (const [key, entry] of this.familiarity) if (time - entry.time > old) this.familiarity.delete(key);
      if (agents) {
        // A shape not seen for two minutes is forgotten (at 0.05/s it is down to a 400th); the gone fish's keywords go with them.
        for (const [key, entry] of this.signMemory) if (time - entry.time > 120) this.signMemory.delete(key);
        if (this.keywordMemory.size > school.length * 64) {
          const alive = new Set<number>();
          for (const fish of school) alive.add(Math.floor(fish.seed));
          for (const key of this.keywordMemory.keys()) if (!alive.has(Math.floor(key / KEYWORD_STRIDE))) this.keywordMemory.delete(key);
        }
      }
    }
    this.agentsOn = agents !== null;
    if (agents) {
      // A bubble that has burst since the last step: its fish spill to a neighbour.
      this.spilling = false;
      for (let page = 0; page < pageCount; page += 1) {
        const bursts = agents.data[page * PAGE_INTS + 2]!;
        const burst = bursts !== this.burstsSeen[page];
        this.spilt[page] = burst ? 1 : 0;
        this.burstsSeen[page] = bursts;
        if (burst) this.spilling = true;
      }
    } else if (this.spilling) {
      this.spilt.fill(0);
      this.spilling = false;
    }
    this.crowd.fill(0, 0, pageCount);
    for (const fish of school) {
      if (fish.target >= pageCount || fish.life.dying) fish.target = -1;
      if (fish.target >= 0) this.crowd[fish.target] = this.crowd[fish.target]! + 1;
    }
  }

  /** True when the fish should reconsider: it attends nothing, its span is up, or it has stalled. */
  lapsed(fish: Fish, time: number) {
    // The agents' fish that let go of its bubble swims on a moment before it looks again.
    if (fish.target < 0) return !(this.agentsOn || this.patient) || time >= fish.reconsiderAt;
    return time >= fish.reconsiderAt || fish.stuck > 2.5 || (this.spilling && this.spilt[fish.target] === 1);
  }

  /** How familiar a memory is now: it fades at `forget` per second while unwatched. */
  private recall(map: Map<number, Memory>, key: number, time: number, forget: number) {
    const entry = map.get(key);
    return entry ? entry.value * Math.exp(-(time - entry.time) * forget) : 0;
  }

  private remember(map: Map<number, Memory>, key: number, value: number, time: number) {
    const entry = map.get(key);
    if (entry) {
      entry.value = value;
      entry.time = time;
    } else map.set(key, { value, time });
  }

  /** The fish `id`'s familiarity with `keyword`: every fish already knows the keywords the screen opened on. */
  private keywordKnown(id: number, keyword: number, time: number, agents: AgentsInput) {
    const key = id * KEYWORD_STRIDE + keyword;
    if (keyword < agents.opening && agents.rules.familiar > 0 && !this.keywordMemory.has(key)) {
      this.keywordMemory.set(key, { value: Math.min(0.99, agents.rules.familiar * (0.7 + 0.6 * unit(id, keyword + 31))), time });
    }
    return this.recall(this.keywordMemory, key, time, agents.rules.keywordForget);
  }

  /** How fresh the bubble `page` is to the fish `id`: (1 − its keyword's familiarity)(1 − its shape's). */
  private fresh(id: number, page: number, time: number, agents: AgentsInput) {
    const sign = agents.data[page * PAGE_INTS]!;
    const keyword = agents.data[page * PAGE_INTS + 1]!;
    // A bubble that has outgrown its share is tired (bubble/6): it is worth e^fatigue less.
    const tired = agents.rules.tiring >= 0.5 ? Math.exp(-agents.data[page * PAGE_INTS + 3]! / 1_000) : 1;
    return tired * (1 - this.keywordKnown(id, keyword, time, agents)) * (1 - this.recall(this.signMemory, id * SIGN_STRIDE + sign, time, agents.rules.shapeForget));
  }

  /** The bubbles `page` touches, written into `view` after `count` entries already there; the new count. */
  private touching(web: SchoolWeb | FlatLinks, page: number, pageCount: number, count: number) {
    let start = 0;
    let end = 0;
    const flat = !("out" in web);
    const links = flat ? null : web.out[page];
    if (flat) {
      start = web.linkStart[page]!;
      end = web.linkStart[page + 1]!;
    } else end = links ? links.length : 0;
    if (this.view.length < count + (end - start)) {
      const view = new Int32Array((count + end - start) * 2);
      view.set(this.view);
      this.view = view;
      this.worth = new Float64Array(view.length);
    }
    for (let index = start; index < end; index += 1) {
      const target = flat ? web.linkTarget[index]! : links![index]!.target;
      if (target < pageCount && target !== page) this.view[count++] = target;
    }
    return count;
  }

  /**
   * The agents' goldfish (model M9): it sees its own bubble and those that bubble touches, and wants something less
   * boring — value = fresh × (1 + alpha × that bubble's share of the fish in view). It moves only to a bubble worth
   * `theta` more than its own (or, M8, by a dice weighted exp(greed × value)); with an open audience, if nothing in
   * view is worth `outside`, it leaves the screen. A fish with no bubble takes the stroke's while it is fresh, else
   * the nearest it can reach; one whose bubble has just burst spills to a neighbour.
   */
  private choose(fish: Fish, id: number, previous: number, input: AttentionInput, agents: AgentsInput) {
    const { faces, random, hold, clearance, time } = input;
    const rules = agents.rules;
    const pageCount = faces.pageCount;
    const discs = faces.discs;
    const reach = (page: number) => {
      const at = faces.discOf(page);
      const found = faces.exposedAngle(page, Math.atan2(fish.y - discs[at + 1]!, fish.x - discs[at]!), hold, clearance);
      if (found !== null) this.found = found;
      return found !== null;
    };
    let chosen = -1;
    let seen = 1;
    if (previous < 0 || previous >= pageCount) {
      if (agents.entry >= 0 && agents.entry < pageCount && reach(agents.entry)) chosen = agents.entry;
      else {
        // What is in front of it: the open faces nearest to it, and of those the one worth most to it (a face a
        // thumb's width nearer does not decide; what it has not seen does).
        const { scores, order } = this;
        let candidates = 0;
        for (let page = 0; page < pageCount; page += 1) {
          scores[page] = 0;
          if (faces.buried(page, hold, clearance)) continue;
          const at = faces.discOf(page);
          const gap = Math.max(0, Math.hypot(discs[at]! - fish.x, discs[at + 1]! - fish.y) - discs[at + 2]!);
          scores[page] = (0.05 + this.fresh(id, page, time, agents)) / (40 + gap) ** 2;
          order[candidates++] = page;
        }
        for (let tries = 0; tries < 12 && chosen < 0; tries += 1) {
          let page = -1;
          let best = 0;
          for (let index = 0; index < candidates; index += 1) {
            const other = order[index]!;
            if (scores[other]! > best) {
              best = scores[other]!;
              page = other;
            }
          }
          if (page < 0) break;
          if (reach(page)) chosen = page;
          else scores[page] = 0;
        }
      }
    } else {
      this.view[0] = previous;
      const count = this.touching(input.web, previous, pageCount, 1);
      seen = count;
      if (this.spilt[previous] === 1 && count > 1) {
        // Its bubble burst: any neighbour it can reach, from a random one on.
        const first = 1 + Math.floor(random.next() * (count - 1));
        for (let step = 0; step < count - 1 && chosen < 0; step += 1) {
          const page = this.view[1 + ((first - 1 + step) % (count - 1))]!;
          if (reach(page)) chosen = page;
        }
        if (chosen < 0) chosen = previous;
      } else {
        let crowd = 1e-6;
        for (let index = 0; index < count; index += 1) crowd += this.crowd[this.view[index]!]! + (index === 0 ? 1 : 0);
        const { view, worth } = this;
        let most = 0;
        for (let index = 0; index < count; index += 1) {
          const page = view[index]!;
          const audience = this.crowd[page]! + (index === 0 ? 1 : 0);
          worth[index] = this.fresh(id, page, time, agents) * (1 + (rules.alpha * audience) / crowd);
          if (worth[index]! > most) most = worth[index]!;
        }
        if (rules.betterOnly >= 0.5 && most < rules.outside) {
          // Nothing in view is worth staying for. An open audience leaves the screen; the school's fish lets go of
          // its bubble and swims on to whatever is in front of it next.
          if (rules.open >= 0.5) fish.leaving = true;
          fish.target = -1;
          fish.stuck = 0;
          fish.reconsiderAt = time + 0.8 + random.next() * 1.2;
          return;
        }
        chosen = previous;
        if (rules.betterOnly >= 0.5) {
          // The best in view, if it is clearly better and can be reached; else the next best that is.
          const stay = worth[0]!;
          for (let tries = 0; tries < 4; tries += 1) {
            let best = 0;
            for (let index = 1; index < count; index += 1) if (worth[index]! > worth[best]!) best = index;
            if (best === 0 || !(worth[best]! > stay + rules.theta)) break;
            if (reach(view[best]!)) {
              chosen = view[best]!;
              break;
            }
            worth[best] = -1;
          }
        } else {
          let total = 0;
          for (let index = 0; index < count; index += 1) {
            worth[index] = Math.exp(rules.greed * worth[index]!);
            total += worth[index]!;
          }
          let cursor = random.next() * total;
          let index = 0;
          while ((cursor -= worth[index]!) > 0 && index < count - 1) index += 1;
          if (index > 0 && reach(view[index]!)) chosen = view[index]!;
        }
      }
    }
    if (chosen === previous && previous >= 0) this.found = fish.angle;
    fish.target = chosen;
    fish.angle = this.found;
    fish.stuck = 0;
    if (chosen >= 0) this.crowd[chosen] = this.crowd[chosen]! + 1;
    if (chosen !== previous && random.next() < 0.5) fish.turn = -fish.turn;
    const rate = rules.look * (rules.evenLook >= 0.5 ? 1 + Math.max(1, rules.view) : seen);
    fish.reconsiderAt = time + Math.max(0.15, -Math.log(Math.max(1e-9, random.next())) / Math.max(1e-3, rate));
  }

  /** How used to `page` the fish `id` is now. */
  /** What a fish's familiarity is kept by: the bubble, or the object it shows (rules/attach.ts `touch`). */
  private what(page: number) {
    const keys = this.keys;
    return keys && this.byObject ? keys[page * PAGE_INTS + 1]! % MAX_PAGES : page;
  }

  private remembered(id: number, page: number, time: number) {
    const entry = this.familiarity.get(id * MAX_PAGES + this.what(page));
    return entry ? entry.value * Math.exp(-(time - entry.time) / this.forget) : 0;
  }

  /** The step's way of tiring: by bubble (bubble/9) or by the object shown, from `keys` (each bubble's keyword). */
  tireBy(byObject: boolean, forget: number, keys: Int32Array | null) {
    this.byObject = byObject && keys !== null;
    this.forget = this.byObject && forget > 0 ? forget : FAMILIARITY_DECAY;
    this.keys = keys;
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
    if (input.agents && !this.byObject) {
      this.choose(fish, id, previous, input, input.agents);
      return;
    }

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
    const near = input.near ?? 0;
    const worth = parameters.worth ?? 0;
    const body = worth > 0 ? (parameters.body ?? 0) : 0;
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
      // Only what is near it (simulation/1).
      if (near > 0 && gap > near) {
        scores[page] = 0;
        continue;
      }
      const salience = apparent(shown[page]!, mean, body);
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
      // Nothing pulls more than swimming on: the fish holds to nothing (rules/attach.ts).
      if (!holds(best, worth)) return -1;
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
    const agents = this.byObject ? null : input.agents;
    if (agents) {
      // Watching makes its keyword and its shape familiar.
      const rules = agents.rules;
      const keyword = agents.data[page * PAGE_INTS + 1]!;
      const known = this.keywordKnown(id, keyword, time, agents);
      this.remember(this.keywordMemory, id * KEYWORD_STRIDE + keyword, known + rules.keywordBore * (1 - known) * seconds, time);
      const signKey = id * SIGN_STRIDE + agents.data[page * PAGE_INTS]!;
      const shape = this.recall(this.signMemory, signKey, time, rules.shapeForget);
      this.remember(this.signMemory, signKey, shape + rules.shapeBore * (1 - shape) * seconds, time);
      return;
    }
    const key = id * MAX_PAGES + this.what(page);
    const memory = this.remembered(id, page, time);
    const value = Math.min(FAMILIARITY_CAP, memory + seconds * 0.5 * parameters.habituation * (this.byObject ? OBJECT_PACE : 1));
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
