// Shared shapes for the news feed.

export type Side = "left" | "right";
export const SIDES: readonly Side[] = ["left", "right"];
/** Whose reading a piece carries; "none" is the level screen's everyday news. */
export type Slant = Side | "none";

/** 0 온건 (a slanted report), 1 강경 (사설·칼럼), 2 극단 (팬덤 매체·유튜브 문법). */
export type Tier = 0 | 1 | 2;

export type Article = {
  id: string;
  slant: Slant;
  tier: Tier;
  topic: string;
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
