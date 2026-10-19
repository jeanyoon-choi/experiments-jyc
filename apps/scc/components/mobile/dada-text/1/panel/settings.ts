import type { Look } from "../drawing/look";
import type { CommandGroup } from "../words/vocabulary";

/**
 * Everything the option panel sets: the words (하이프, dealt in reading order, all six mixed or one word for every cell; or
 * one of the vocabularies by part), whether
 * pictures stand among the grid's word tiles (있음, one after how many; 없음; 자율, each tile turning at random), and how cells are drawn. The whole clone is always
 * replaced, on black.
 */
export type Pictures = "on" | "off" | "auto";

export type Settings = { dealt: boolean; hype: string | null; group: CommandGroup; pictures: Pictures; pictureEvery: number; look: Look };

/** 사진 빈도: a picture after every 1 (most) to this many (fewest) word tiles. */
export const PICTURE_EVERY_MAX = 12;

/** /1 opens on 하이프 mixed, a picture after every four tiles, Didot, no frames, no edge, white letters on black. */
export const defaultSettings: Settings = {
  dealt: true,
  hype: null,
  group: "attention",
  pictures: "on",
  pictureEvery: 4,
  look: { font: "serif", border: 0, ink: "mono", edge: 0 },
};
