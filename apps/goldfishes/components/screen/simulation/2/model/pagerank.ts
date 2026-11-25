// The model as it is today, behind the seam (world.ts): PageRank on a living web. Every method is the call the frame
// loop and the raft make now, on the same arrays in the same order — nothing is computed here that web/model.ts and
// web/iteration.ts do not compute (pagerank.test.ts holds it to the bit).

import { iterate, outWeights, transit } from "../web/iteration.ts";
import {
  addCandidate,
  addPage,
  attend,
  candidate,
  concentration,
  createRankedWeb,
  fadeCandidate,
  leader,
  MAX_PAGES,
  setDamping,
  stepRankedWeb,
  type RankedWeb,
  type WebParameters,
} from "../web/model.ts";
import type { Relation, World, WorldBirth, WorldMetrics } from "./world.ts";

/** What a web starts from (raft.ts keeps these between restarts). */
export type PageRankStart = { pages: number; seed: number; groups: number; diversity: number; damping: number };

export class PageRankWorld implements World<WebParameters> {
  /** The web itself: `state` to the contract. */
  web: RankedWeb;
  // The displayed distribution: it follows one power-iteration step of itself, so it converges to
  // PageRank continuously and again whenever the web changes.
  readonly shown = new Float64Array(MAX_PAGES);
  private readonly stepped = new Float64Array(MAX_PAGES);
  /** Each page's total outgoing weight, as of the last `show`. */
  private readonly weights = new Float64Array(MAX_PAGES);
  /** The fraction of a new page carried from step to step. */
  private pending = { value: 0 };

  constructor(start: PageRankStart) {
    this.web = this.create(start);
    this.uniform();
  }

  get state() {
    return this.web;
  }

  get carried() {
    return this.web.damping;
  }

  private create(start: PageRankStart) {
    const web = createRankedWeb(start.pages, start.seed, start.groups, start.diversity);
    setDamping(web, start.damping);
    return web;
  }

  /** The display starts over from uniform. */
  private uniform() {
    this.shown.fill(0);
    this.shown.fill(1 / Math.max(1, this.web.size), 0, this.web.size);
  }

  /** Starts the web, and the display, over. */
  restart(start: PageRankStart) {
    this.web = this.create(start);
    this.pending = { value: 0 };
    this.uniform();
  }

  setDamping(value: number) {
    setDamping(this.web, value);
  }

  step(seconds: number, parameters: WebParameters): WorldBirth[] {
    return stepRankedWeb(this.web, seconds, parameters, this.pending);
  }

  /** Continuous power iteration on the web as it is now. */
  show(fraction: number) {
    const web = this.web;
    const { shown, stepped } = this;
    outWeights(web, this.weights);
    iterate(web, shown, stepped, this.weights);
    for (let page = 0; page < web.size; page += 1) shown[page] = shown[page]! + (stepped[page]! - shown[page]!) * fraction;
  }

  flow(from: number, relation: Relation) {
    return transit(this.web, this.shown, from, relation.weight, this.weights[from]!);
  }

  attend(entity: number, amount: number, most?: number) {
    attend(this.web, entity, amount, most);
  }

  add(group?: number, quality = 0) {
    return addPage(this.web, quality, group);
  }

  /**
   * simulation/2: a page laid by a stroke is seen at once — it is shown at `share` of the whole, taken evenly from
   * every other page (the total stays 1). Without this it comes in at nothing and waits to be fed.
   */
  seed(page: number, share: number) {
    const keep = 1 - share;
    for (let other = 0; other < this.web.size; other += 1) this.shown[other] = this.shown[other]! * keep;
    this.shown[page] = share;
  }

  relate(from: number, to: number, weight?: number) {
    return addCandidate(this.web, from, to, weight);
  }

  release(from: number, to: number) {
    return fadeCandidate(this.web, from, to);
  }

  relation(from: number, to: number) {
    return candidate(this.web, from, to);
  }

  setQuality(entity: number, value: number) {
    this.web.quality[entity] = value;
  }

  metrics(): WorldMetrics {
    const web = this.web;
    const share = concentration(web);
    return { leader: leader(web), ...share };
  }
}
