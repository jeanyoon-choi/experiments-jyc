// 전파 in the loop: the strains' simulation (spread/contagion.ts) beside the raft it runs on — a newcomer where the
// canvas was tapped, the step through the raft's contacts or links, and the object settings its pages are drawn with.

import { MAX_ENTITIES } from "../model";
import type { ObjectParameters } from "../objects/kinds/parameters"; // 오브제
import { FIELD_KINDS, layerOf } from "../objects/morph/morph";
import type { Raft } from "../raft/raft";
import { Contagion, type SpreadParameters } from "../spread/contagion"; // 전파

/** 전파: a newcomer's log quality, so it grows from a speck into sight. */
const NEWCOMER_QUALITY = 1.5;

export class Spread {
  private readonly contagion = new Contagion();
  /** The object settings with its own unit for the pages, made again only when either changes. */
  private spreadObjects: ObjectParameters | null = null;
  private spreadFrom: { objects: ObjectParameters; unit: ObjectParameters["pages"] } | null = null;

  /** Per page: tint rgb and amount, and the kind a strain has given it (a field layer, −1 its own). */
  get tints() {
    return this.contagion.tints;
  }

  get caught() {
    return this.contagion.caught;
  }

  /** A new page where the canvas was tapped (or a stroke passed), carrying the chosen colour and object. */
  arrive(raft: Raft, spread: SpreadParameters, x: number, y: number, from: number | null = null) {
    const kind = layerOf(spread.pick as (typeof FIELD_KINDS)[number]);
    const under = raft.pageAt(x, y);
    const page = raft.createPage(x, y, from ?? under);
    if (page === null) {
      // The web is full (it also fills by itself as it grows): the page there, or the nearest, takes them on
      // instead. Before, a tap on empty space at the cap did nothing at all.
      const nearest = under ?? this.nearestPage(raft, x, y);
      if (nearest !== null) this.contagion.seed(nearest, spread.strain, kind);
      return nearest;
    }
    // It comes in with appeal enough to grow into sight (log quality 1.5: e^1.5 ≈ 4.5 × a new page's).
    raft.world.setQuality(page, NEWCOMER_QUALITY);
    this.contagion.seed(page, spread.strain, kind);
    return page;
  }

  /** The page whose disc is nearest (x, y), or null without pages. */
  private nearestPage(raft: Raft, x: number, y: number) {
    const { points, radii } = raft;
    let best: number | null = null;
    let bestGap = Infinity;
    for (let page = 0; page < Math.min(raft.world.state.size, MAX_ENTITIES); page += 1) {
      const gap = Math.hypot(points[page * 2]! - x, points[page * 2 + 1]! - y) - radii[page]!;
      if (gap < bestGap) {
        bestGap = gap;
        best = page;
      }
    }
    return best;
  }

  /** Strains pass through the raft's contacts or the web's links (the simulation reads the web as one: raft.web). */
  step(seconds: number, raft: Raft, parameters: SpreadParameters) {
    this.contagion.step(seconds, raft.web, raft.points, raft.radii, parameters, raft.random);
  }

  /** The object settings this frame draws with: under 전파, the panel's with 전파's own unit for the pages. */
  objectsFor(settings: { mode: string; objects: ObjectParameters; spread: SpreadParameters }): ObjectParameters {
    if (settings.mode !== "spread") return settings.objects;
    const from = this.spreadFrom;
    if (!this.spreadObjects || !from || from.objects !== settings.objects || from.unit !== settings.spread.unit) {
      this.spreadFrom = { objects: settings.objects, unit: settings.spread.unit };
      this.spreadObjects = { ...settings.objects, pages: settings.spread.unit };
    }
    return this.spreadObjects;
  }
}
