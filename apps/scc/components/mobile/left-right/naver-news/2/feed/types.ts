// Shared shapes for the news feed.

import type { Section } from "./topics/types";

export type { Section };
export type Side = "left" | "right";
export const SIDES: readonly Side[] = ["left", "right"];
/** Whose reading a piece carries; "none" is the level screen's everyday news. */
export type Slant = Side | "none";

/**
 * How far out a piece stands: 0 온건 (a slanted report), 1 강경 (사설·칼럼),
 * 2 극단 (팬덤 매체), 3 선동 (enemy-naming, conspiracy), 4 광란 (all capitals,
 * nothing left of the story but the camp).
 */
export type Tier = 0 | 1 | 2 | 3 | 4;
export const TIERS: readonly Tier[] = [0, 1, 2, 3, 4];
export const TOP: Tier = 4;

export type Article = {
  id: string;
  slant: Slant;
  tier: Tier;
  topic: string;
  /** The tabs that carry the piece; the first is its own. */
  sections: readonly Section[];
  /** Its place among the topic's pieces of the same side and tier. */
  index: number;
  title: string;
  press: string;
  reporter: string;
  photo: string;
  caption: string;
  /** Related pieces behind the headline (the blue pill). */
  cluster: number;
  comments: number;
};

/** One row of the screen: an article and when it arrived. */
export type Slot = {
  /** Stable for as long as the article is on screen. */
  key: number;
  article: Article;
  /** Wall-clock ms the article arrived. */
  since: number;
};
