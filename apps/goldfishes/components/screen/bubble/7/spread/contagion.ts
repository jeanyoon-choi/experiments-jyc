// 전파 (user, 2026-10-27: "특정 추가 버블이 특정 컬러를 가지고 들어오면 그
// 컬러에 의해 차근차근히 전파되는 … 점차 전염이 되는 말 그대로 cas"). A page
// that comes in carries a colour of its own — and, if asked, an object of its
// own — and passes it on. The newcomer is placed by hand (user, 2026-10-27:
// "색 선택 … 선택한 이후에, 화면 아무데나 클릭하면 그 오브제가 나오는거 … 그 색에 맞춰서
// 쭉 전파"): a colour and an object are chosen in the 전파 panel, and a tap puts
// a new page there carrying them. Then: every page that has taken a colour exposes the pages
// it touches (pressed against it in the raft, or linked to it), and each one
// exposed catches it at a rate per second, takes it on over a few seconds, may
// lose it again (SIS: susceptible, infected, susceptible), and can be taken by
// a stronger strain. Nothing decides where it goes: the raft's contacts and the
// web's links do.
//
// Pure CPU state per page, stepped by the frame loop; the object pass tints the
// coat by it (and morphs the shape, 모양도 전파).

import { MAX_PAGES, type RankedWeb } from "../web/model.ts";

/** The strains' colours, one per newcomer in turn: Squid Game's pink and teal, acid yellow, electric blue, orange. */
export const STRAINS: readonly (readonly [number, number, number])[] = [
  [0.96, 0.12, 0.47],
  [0.0, 0.62, 0.56],
  [0.86, 0.9, 0.05],
  [0.08, 0.3, 1.0],
  [1.0, 0.42, 0.04],
];

export const SPREAD_ROUTES = ["contact", "links", "both"] as const;
export const SPREAD_ROUTE_LABELS: Record<(typeof SPREAD_ROUTES)[number], string> = { contact: "맞닿음", links: "링크", both: "둘 다" };

export type SpreadParameters = {
  /** Chance per second that a page catches it from one exposing neighbour (a rate). */
  rate: number;
  /** Seconds a page takes to take the colour on fully (and only then passes it on). */
  takeOn: number;
  /** Seconds a page keeps it on average before it fades away again; 0 for ever. */
  keep: number;
  /** The colour a tap brings in: index in STRAINS. */
  strain: number;
  /** The object a tap brings in: a field kind (bubble included). */
  pick: string;
  /** Index in SPREAD_ROUTES. */
  route: number;
  /** 1: the newcomer's object spreads too (the pages morph into it). */
  shape: number;
};

// Measured at 0.6 and 2.5 s (2026-10-27): the whole raft in 20 s; now a hop takes several seconds.
export const SPREAD_DEFAULTS: SpreadParameters = { rate: 0.1, takeOn: 3.5, keep: 0, strain: 0, pick: "heart", route: 0, shape: 1 };

export type SpreadControl = { key: "rate" | "takeOn" | "keep"; label: string; min: number; max: number; step: number };

export const SPREAD_CONTROLS: readonly SpreadControl[] = [
  { key: "rate", label: "전염률 (이웃 하나당 초당)", min: 0, max: 3, step: 0.01 },
  { key: "takeOn", label: "물드는 시간 (초)", min: 0.2, max: 10, step: 0.1 },
  { key: "keep", label: "유지 시간 (초, 0 영원히)", min: 0, max: 120, step: 1 },
];

/** Exposure is checked this often (seconds): contacts are found anew each time. */
const CHECK = 0.1;
/** Strains kept at once: one per colour and object brought in. */
const MAX_STRAINS = 120;

export class Contagion {
  /** Per page: its strain (−1 none): a colour and an object, as brought in together. */
  readonly strain = new Int8Array(MAX_PAGES).fill(-1);
  /** Per page: how far it has taken the strain on, 0–1. */
  readonly level = new Float32Array(MAX_PAGES);
  /** Per page: the object its strain carries (a field layer), or −1. */
  readonly caught = new Int8Array(MAX_PAGES).fill(-1);
  /** Per page: tint rgb and amount, for the object pass. */
  readonly tints = new Float32Array(MAX_PAGES * 4);
  /**
   * Each strain's colour (index in STRAINS) and object (a field layer, −1 none). A colour once carried its last
   * object everywhere, so a pink GPU brought in after pink hearts turned every pink heart into a GPU, and a newcomer
   * of a colour already around could not spread (user: "다른 오브제로 다시 해볼려 했는데 잘 안되던데").
   */
  private readonly strainColour = new Int8Array(MAX_STRAINS);
  private readonly strainKind = new Int8Array(MAX_STRAINS).fill(-1);
  private strainCount = 0;
  private sinceCheck = 0;
  private web: RankedWeb | null = null;
  private readonly order = new Int32Array(MAX_PAGES);
  private readonly lefts = new Float64Array(MAX_PAGES);
  private readonly exposed = new Float32Array(MAX_PAGES);
  private readonly exposer = new Int16Array(MAX_PAGES);

  /** Clears every strain. */
  reset() {
    this.strain.fill(-1);
    this.level.fill(0);
    this.caught.fill(-1);
    this.tints.fill(0);
    this.strainCount = 0;
  }

  /** The strain of `colour` (index in STRAINS) and `kind` (a field layer, or −1), made if it is new. */
  strainOf(colour: number, kind: number) {
    for (let strain = 0; strain < this.strainCount; strain += 1) {
      if (this.strainColour[strain] === colour && this.strainKind[strain] === kind) return strain;
    }
    // Past the limit the oldest is reused (its pages take on the new pair).
    const strain = this.strainCount < MAX_STRAINS ? this.strainCount++ : (colour * 31 + kind) % MAX_STRAINS;
    this.strainColour[strain] = colour;
    this.strainKind[strain] = kind;
    return strain;
  }

  /** Makes `page` a newcomer carrying `colour` (index in STRAINS) and `kind` (a field layer, or −1), fully taken on. */
  seed(page: number, colour: number, kind: number) {
    this.strain[page] = this.strainOf(colour, kind);
    this.level[page] = 1;
  }

  /** One frame: exposure through the raft's contacts or the web's links, taking on and fading; `random` is the raft's. */
  step(delta: number, web: RankedWeb, points: Float64Array, radii: Float64Array, parameters: SpreadParameters, random: () => number) {
    const count = Math.min(web.size, MAX_PAGES);
    // A new web (a restart) starts clean.
    if (this.web !== web) {
      this.web = web;
      this.reset();
    }

    // Exposure, now and then: each page's strongest exposing neighbour.
    this.sinceCheck += delta;
    if (this.sinceCheck >= CHECK) {
      const elapsed = this.sinceCheck;
      this.sinceCheck = 0;
      this.exposed.fill(0, 0, count);
      const route = Math.round(parameters.route);
      const expose = (from: number, to: number) => {
        if (this.strain[from]! < 0 || this.level[from]! < 0.999 || this.strain[from] === this.strain[to]) return;
        this.exposed[to] = this.exposed[to]! + 1;
        // The last exposing neighbour wins a tie; any is as strong as another.
        this.exposer[to] = from;
      };
      if (route !== 1) this.contacts(count, points, radii, expose);
      if (route !== 0) {
        for (let from = 0; from < count; from += 1) {
          for (const link of web.out[from]!) {
            if (link.target >= count) continue;
            expose(from, link.target);
            expose(link.target, from);
          }
        }
      }
      for (let page = 0; page < count; page += 1) {
        const exposed = this.exposed[page]!;
        if (exposed > 0 && random() < 1 - Math.exp(-parameters.rate * exposed * elapsed)) {
          this.strain[page] = this.strain[this.exposer[page]!]!;
          this.level[page] = 0;
        }
        // Fading away again (SIS), once fully taken on.
        if (parameters.keep > 0 && this.strain[page]! >= 0 && this.level[page]! >= 1 && random() < 1 - Math.exp(-elapsed / parameters.keep)) {
          this.strain[page] = -1;
        }
      }
    }

    // Taking on, or letting go. The colour shown eases towards the strain's (and its amount towards 1, or 0 once
    // it has none), so a page taken from one strain by another passes through the colours between them. Before, its
    // colour switched at once and its amount fell to 0 and rose again: with several strains about, pages flickered
    // from one colour to silver to the next (user, 2026-10-27: "너무 갑작스럽게 애니메이션 없이").
    const shape = parameters.shape >= 0.5;
    const ease = 1 - Math.exp(-delta / Math.max(0.05, parameters.takeOn / 3));
    for (let page = 0; page < count; page += 1) {
      const strain = this.strain[page]!;
      const at = page * 4;
      const step = delta / Math.max(0.05, parameters.takeOn);
      this.level[page] = strain >= 0 ? Math.min(1, this.level[page]! + step) : Math.max(0, this.level[page]! - step);
      const amount = this.tints[at + 3]!;
      if (strain >= 0) {
        const colour = STRAINS[this.strainColour[strain]!]!;
        // Uncoloured, it takes the strain's colour outright and only its amount eases in.
        const blend = amount < 0.02 ? 1 : ease;
        this.tints[at] = this.tints[at]! + (colour[0] - this.tints[at]!) * blend;
        this.tints[at + 1] = this.tints[at + 1]! + (colour[1] - this.tints[at + 1]!) * blend;
        this.tints[at + 2] = this.tints[at + 2]! + (colour[2] - this.tints[at + 2]!) * blend;
      }
      this.tints[at + 3] = amount + ((strain >= 0 ? 1 : 0) - amount) * ease;
      // Its object follows once the new strain is half taken on, and the old one's object stays until then
      // (not back to its own in between: two morphs where there should be one).
      if (!shape) this.caught[page] = -1;
      else if (strain >= 0 && this.level[page]! >= 0.5) this.caught[page] = this.strainKind[strain]!;
      else if (strain < 0 && this.level[page]! < 0.5) this.caught[page] = -1;
    }
  }

  /** Every pair of pages pressed together (sweep and prune along x). */
  private contacts(count: number, points: Float64Array, radii: Float64Array, touch: (from: number, to: number) => void) {
    const { order, lefts } = this;
    for (let page = 0; page < count; page += 1) {
      order[page] = page;
      lefts[page] = points[page * 2]! - radii[page]! * 1.15;
    }
    const sorted = order.subarray(0, count).sort((a, b) => lefts[a]! - lefts[b]!);
    for (let at = 0; at < count; at += 1) {
      const a = sorted[at]!;
      const ax = points[a * 2]!;
      const ay = points[a * 2 + 1]!;
      const ar = radii[a]! * 1.15;
      for (let next = at + 1; next < count; next += 1) {
        const b = sorted[next]!;
        if (lefts[b]! > ax + ar) break;
        const reach = ar + radii[b]! * 1.15;
        const dx = points[b * 2]! - ax;
        const dy = points[b * 2 + 1]! - ay;
        if (dx * dx + dy * dy >= reach * reach) continue;
        touch(a, b);
        touch(b, a);
      }
    }
  }
}
