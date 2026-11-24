// An instance's tint: 전파's strain when its page has one, else its logo's brand colour by 브랜드 색 (테크 로고;
// shapes/brands.ts), blended between the two layers it flows between.

import { KIND, type LogoKind } from "../kinds/groups.ts";
import { FIELD_KINDS } from "../kinds/layers.ts";
import { brandOf } from "../shapes/brands.ts";

export type Tint = {
  /**
   * Writes rgb and amount at `at` of `data`: `tints`' (per page, rgb and amount) for `page` when it has any, else
   * the brand colours of the layers it flows between (`shape` of the way from one to the other), by `brand`.
   */
  write(data: Float32Array, at: number, tints: Float32Array | null, page: number, fromLayer: number, toLayer: number, shape: number, brand: number): void;
};

export function createTint(): Tint {
  // Each logo's brand colour by layer, the others none.
  const brandColour = new Float32Array(FIELD_KINDS.length * 3);
  const branded = new Float32Array(FIELD_KINDS.length);
  FIELD_KINDS.forEach((kind, layer) => {
    if (kind === "bubble" || KIND[kind].source !== "mark") return;
    const colour = brandOf(kind as LogoKind);
    brandColour.set(colour, layer * 3);
    // A black or near-black brand (Apple, X, TikTok, OpenAI) dyes nothing: a film cannot be black.
    branded[layer] = Math.min(1, Math.max(0, (Math.max(...colour) - 0.08) / 0.3));
  });

  const write: Tint["write"] = (data, at, tints, page, fromLayer, toLayer, shape, brand) => {
    if (tints && page >= 0 && tints[page * 4 + 3]! > 0) {
      data[at] = tints[page * 4]!;
      data[at + 1] = tints[page * 4 + 1]!;
      data[at + 2] = tints[page * 4 + 2]!;
      data[at + 3] = tints[page * 4 + 3]!;
      return;
    }
    const along = Math.min(1, Math.max(0, shape));
    const a = branded[fromLayer]! * (1 - along);
    const b = branded[toLayer]! * along;
    if (brand <= 0 || a + b <= 0) {
      data[at] = 0;
      data[at + 1] = 0;
      data[at + 2] = 0;
      data[at + 3] = 0;
      return;
    }
    for (let channel = 0; channel < 3; channel += 1) data[at + channel] = (brandColour[fromLayer * 3 + channel]! * a + brandColour[toLayer * 3 + channel]! * b) / (a + b);
    data[at + 3] = brand * (a + b);
  };
  return { write };
}
