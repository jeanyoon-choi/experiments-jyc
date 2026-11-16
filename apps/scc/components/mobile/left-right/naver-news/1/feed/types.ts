// Shared shapes for the news feed.

export type Side = "left" | "right";
export const SIDES: readonly Side[] = ["left", "right"];
/** Whose reading a piece carries; "none" is the level screen's everyday news. */
export type Slant = Side | "none";

/** 0 온건 (a slanted report), 1 강경 (사설·칼럼), 2 극단 (팬덤 매체·유튜브 문법). */
export type Tier = 0 | 1 | 2;

export type Topic = {
  id: string;
  /** What happened, as verified in the research timeline; opens every body. */
  fact: string;
  /** Each side's reading, as a body paragraph per tier. */
  say: Record<Side, readonly [string, string, string]>;
  /** Photo keys (public/images/left-right/naver-news/<key>.jpg), any side. */
  photos: readonly string[];
  /** Photos only one side's pieces use. */
  only?: Partial<Record<Side, readonly string[]>>;
};

export type Article = {
  id: string;
  slant: Slant;
  tier: Tier;
  topic: string;
  title: string;
  lede: string;
  press: string;
  reporter: string;
  photo: string;
  caption: string;
  /** Related pieces behind the headline (the blue pill). */
  cluster: number;
  comments: number;
};

/** One row of the screen. The key stays while the article in it turns over. */
export type Slot = {
  key: number;
  article: Article;
  /** Wall-clock ms the article took this row. */
  since: number;
  /** How many times the row has turned; drives the cross-fade. */
  turns: number;
};
