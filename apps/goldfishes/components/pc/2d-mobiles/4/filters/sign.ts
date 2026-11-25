// 치환 (pc/2d-mobiles/4): what a tile is, and the word its cell reads.
// A tile is one layer of a glass: an app's bar, a post, a banner, an ad, a
// pay sheet. Under 치환 the compositor draws it as a cell: a ground, a frame,
// and one word stretched to fill it (SCC's /mobiles/2, substitution/3). The
// word is chosen here, three ways:
// - keyword: what circulates. A layer that carries a keyword of the main
//   screen reads it ("AI", "GPU"); a layer that carries none reads its wrapper.
// - layer: the wrapper. The same event in every app, each in its own wrapper
//   (NOTES 1017): the bars read their app, the rest what kind of layer it is.
// - command: SCC's reading (its 규율 vocabulary), by layer and by app.

import { APP_NAMES } from "../apps/icons";
import { APPS } from "../apps/registry";
import type { AppId, AppKind } from "../apps/types";
import type { TileSpec } from "../paint/types";

export type Layer = "chrome" | "content" | "ad" | "notification" | "pay" | "home" | "lock" | "limit";

export type Sign = { layer: Layer; app: AppId | null; keyword: string | null };

const SYSTEM: Record<string, Layer> = { banner: "notification", live: "notification", ad: "ad", sheet: "pay", home: "home", lock: "lock", limit: "limit" };

/** The layer a tile is, or null for what is no layer of the interface (the goldfish, a heart, the status bar's text). */
export function signOf(spec: TileSpec): Sign | null {
  const [owner, part] = spec.painter.split(".") as [string, string];
  const keyword = spec.keyword ?? null;
  if (owner === "system") {
    const layer = SYSTEM[part];
    if (!layer) return null;
    const app = (spec.data as { app?: AppId } | null)?.app ?? null;
    return { layer, app, keyword };
  }
  if (!(owner in APPS)) return null;
  const app = owner as AppId;
  if (part === "top" || part === "bottom") return { layer: "chrome", app, keyword: null };
  const sponsored = (spec.data as { sponsored?: boolean } | null)?.sponsored === true;
  return { layer: sponsored ? "ad" : "content", app, keyword };
}

/** Content is what the reader came for: a post, a clip, a card, a message, sponsored or not. */
export const isContent = (sign: Sign) => sign.layer === "content" || sign.layer === "ad";

const CONTENT_BY_KIND: Record<AppKind, string> = { feed: "POST", pager: "CLIP", stack: "CARD", chat: "MESSAGE" };
const LAYER_WORDS: Record<Exclude<Layer, "chrome" | "content">, string> = { ad: "AD", notification: "NOTIFICATION", pay: "PAY", home: "HOME", lock: "LOCK", limit: "LIMIT" };

// SCC substitution's 규율 words. Its own four platforms keep its reading of their prominent media
// (Instagram PERFORM, TikTok and YouTube REPEAT, X REPORT); the other apps are read the same way here.
const COMMAND_BY_APP: Record<AppId, string> = {
  instagram: "PERFORM",
  reels: "REPEAT",
  tiktok: "REPEAT",
  x: "REPORT",
  facebook: "CONFORM",
  linkedin: "PERFORM",
  tinder: "CONFORM",
  yelp: "VERIFY",
  netflix: "REPEAT",
  news: "REPORT",
  stocks: "TRACK",
  shop: "OPTIMIZE",
  messages: "REPORT",
};
const COMMAND_BY_LAYER: Record<Exclude<Layer, "content">, string> = { chrome: "RETURN", ad: "OBEY", notification: "COMPLY", pay: "COMPLY", home: "PLAN", lock: "SCHEDULE", limit: "OBEY" };

export const WORDS = { keyword: 0, layer: 1, command: 2 } as const;

/** The word a cell reads; "" for an empty cell. `label` gives a keyword as the screen names it. */
export function wordOf(sign: Sign, words: number, label: (keyword: string) => string) {
  if (words === WORDS.command) {
    if (sign.layer === "content") return sign.app ? COMMAND_BY_APP[sign.app] : "CONFORM";
    return COMMAND_BY_LAYER[sign.layer];
  }
  // A layer that carries no keyword (an app's bars above all) reads its wrapper instead: an empty cell
  // read as a margin above and below the keywords (artist, 2026-11-25).
  if (words === WORDS.keyword && sign.keyword) return label(sign.keyword).toUpperCase();
  if (sign.layer === "chrome") return sign.app ? APP_NAMES[sign.app].toUpperCase() : "";
  if (sign.layer === "content") return sign.app ? CONTENT_BY_KIND[APPS[sign.app].kind] : "POST";
  return LAYER_WORDS[sign.layer];
}

/** A keyword's colour, as a hue 0–1: the same keyword is the same colour on every glass, so its spread can be followed. */
export function hueOf(keyword: string) {
  let h = 2166136261;
  for (let index = 0; index < keyword.length; index += 1) h = Math.imul(h ^ keyword.charCodeAt(index), 16777619);
  // Golden-ratio steps keep neighbouring hashes far apart on the wheel.
  return (((h >>> 0) % 4096) * 0.61803398875) % 1;
}

/**
 * The word's own tile: white capitals on nothing, stretched to fill it; the compositor stretches it again over its cell.
 * Cells are mostly tall (a post, a clip), so the tile is as tall as it is wide, up to 512 px (`scale`: tile px per pt):
 * a 390 × 130 pt tile blurred visibly when stretched down a post (2026-11-25).
 */
export function wordSpec(word: string, scale: number, face = 0): TileSpec {
  return { painter: "sub.word", w: 390, h: Math.max(60, Math.round(Math.min(390, 512 / scale))), mode: "dark", lang: "en", data: { word, face } };
}
