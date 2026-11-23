// An app, as a phone uses it (main thread). Its look is its painters
// (`<id>/paint.ts`, worker side); this is its grammar: what kind of screen it
// is, how tall its bars are, how a hype event becomes one of its posts, and
// what its notification says. NOTES 1017: the same event in every app, each
// in its own wrapper — "껍데기만 다르고, 구조는 동일하다".

import type { HypeEvent } from "../content/events";
import type { Random } from "../model/random";
import type { Lang, Mode, Os, TileSpec } from "../paint/types";

export type AppId =
  | "instagram"
  | "reels"
  | "tiktok"
  | "x"
  | "facebook"
  | "linkedin"
  | "tinder"
  | "yelp"
  | "netflix"
  | "news"
  | "stocks"
  | "shop"
  | "messages";

/**
 * - feed: a column that scrolls between the bars (posts added below).
 * - pager: one full-screen item at a time, swiped up (short video).
 * - stack: cards swiped aside (dating).
 * - chat: bubbles arriving at the bottom, the thread pushed up.
 */
export type AppKind = "feed" | "pager" | "stack" | "chat";

export type Persona = {
  seed: number;
  os: Os;
  mode: Mode;
  lang: Lang;
  /** Pace of use, ×. */
  tempo: number;
  /** The apps on this phone, most used first. */
  apps: AppId[];
  /** Hue of the wallpaper, 0–360. */
  hue: number;
  /** The goldfish-thumb's palette (bubble/7's FISH_PALETTES id). */
  fish: string;
  /** The owner's own name and picture, for chats and profiles. */
  name: string;
};

export type ItemContext = {
  event: HypeEvent;
  /** The keyword as the screen labels it ("GPU", "AI"). */
  label: string;
  keyword: string;
  rng: Random;
  lang: Lang;
  mode: Mode;
  persona: Persona;
  /** A photograph for the keyword (stock, generated or the screen's object rendered in chrome). */
  photo(kind?: "any" | "object" | "photo" | "portrait"): string;
  /** A face for a fictional poster. */
  face(): string;
  /** A fictional poster's name in the reader's language. */
  person(): { name: string; handle: string };
  /** True when the item is the goldfish's own strike (shown first, marked as new). */
  fresh: boolean;
};

export type ItemSpec = Omit<TileSpec, "mode" | "lang" | "os" | "w"> & { w?: number };

export type AppDef = {
  id: AppId;
  name: string;
  kind: AppKind;
  /** The mode this app shows in for a persona (some are dark whatever the phone). */
  mode(persona: Persona): Mode;
  /** Background under the content, per mode. */
  bg(mode: Mode): string;
  /** Bars, painted as `<id>.top` / `<id>.bottom`, at these heights (pt; top includes the 54 pt status area). */
  top: number;
  bottom: number;
  /** Data for the bars' painters. */
  chrome?(ctx: Omit<ItemContext, "event" | "label" | "keyword" | "fresh">): unknown;
  /** One post (or card, clip, message) about the event. */
  item(ctx: ItemContext): ItemSpec;
  /** What the screen opens on before any post (a stories row, a hero, a chat's header). */
  opening?(ctx: ItemContext): ItemSpec[];
  /** The notification the event sends. */
  notify(ctx: ItemContext): { title: string; body: string };
};
