// Each page's morph (변신, the set's chips): the layer it flows from, the one it flows to, and since when. A page
// morphs when what it should be shown as changes; the object pass reads where it is every frame.

import type { Liquid } from "../morph/liquid.ts";
import { retarget, type Morph } from "../morph/morph.ts";

/** Pages tracked for their morphs (and their turns and extents: object-pass.ts). */
export const MAX_TRACKED = 4096;

export type PageMorphs = {
  /**
   * The layers a page is shown as now, its morph moved on if what it should be (`want`) has changed. The answer is
   * reused: read it at once.
   */
  layer(page: number, want: number, time: number, liquid: Liquid): Morph;
  /** The layer a page's morph is going to; −1 if it is not tracked (yet). */
  going(page: number): number;
  /** Whether a page's morph has set by `time` (or it has none): only then does it move on again. */
  settled(page: number, time: number, duration: number): boolean;
};

export function createPageMorphs(max = MAX_TRACKED): PageMorphs {
  // From, to, and since when (to −1: not seen yet).
  const pageFrom = new Int16Array(max);
  const pageTo = new Int16Array(max).fill(-1);
  const pageStart = new Float64Array(max);
  const morph: Morph = { from: 0, to: 0, start: 0 };
  /** layer's answer, reused: it is read at once, per page per frame. */
  const answer: Morph = { from: 0, to: 0, start: 0 };
  const layer: PageMorphs["layer"] = (page, want, time, liquid) => {
    answer.from = want;
    answer.to = want;
    answer.start = -Infinity;
    if (page >= max) return answer;
    if (pageTo[page]! < 0) {
      pageFrom[page] = want;
      pageTo[page] = want;
      pageStart[page] = -Infinity;
    } else if (pageTo[page] !== want) {
      morph.from = pageFrom[page]!;
      morph.to = pageTo[page]!;
      morph.start = pageStart[page]!;
      retarget(morph, want, time, liquid);
      pageFrom[page] = morph.from;
      pageTo[page] = morph.to;
      pageStart[page] = morph.start;
    }
    answer.from = pageFrom[page]!;
    answer.to = pageTo[page]!;
    answer.start = pageStart[page]!;
    return answer;
  };
  const going = (page: number) => (page < max && pageTo[page]! >= 0 ? pageTo[page]! : -1);
  const settled: PageMorphs["settled"] = (page, time, duration) => page >= max || pageTo[page]! < 0 || time - pageStart[page]! >= duration;
  return { layer, going, settled };
}
