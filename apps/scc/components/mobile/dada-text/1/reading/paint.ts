import type { Sequence } from "../words/sequence";
import type { CommandGroup } from "../words/vocabulary";

/**
 * The contract between reading and drawing. Reading hands over, per element, what its background should hold; drawing turns
 * each cell into an image and the paint into CSS. Nothing here knows a typeface or a colour of ink.
 */

/** One cell: a box of this size holding this word, with the letters kept this far from each side. */
export type CellSpec = {
  width: number;
  height: number;
  word: string | null;
  /** Draw the paper field and the frame inside the image (text cells); element cells get them from CSS instead. */
  framed: boolean;
  /** Letters keep this far from each side: the frame plus a hairline, more inside a rounded shape. */
  insetX: number;
  insetY: number;
  /** The part's own colour for its letters (대표색, 랜덤); without it the letters take the ground's ink. */
  colour?: string | null;
};

/** A cell at a place in the element's background, or filling the whole of it. */
export type Layer = { cell: CellSpec; x: number; y: number; w: number; h: number } | { cell: CellSpec; whole: true };

/** `borders` lists the sides the original draws a border on; they are drawn in the frame colour where they are, so a divider stays one line. */
export type Paint = { fill: boolean; frame: boolean; borders: string[]; layers: Layer[]; local: boolean };

export const emptyPaint = (): Paint => ({ fill: false, frame: false, borders: [], layers: [], local: false });

/** What a reading needs to know of the look: the frame's stroke width (letters keep clear of it) and how letters are coloured. */
export type ReadOptions = {
  group: CommandGroup;
  /** 하이프: when set, every cell's word is dealt from this sequence instead of read from its part. */
  sequence: Sequence | null;
  stroke: number;
  /** 대표색: each part's letters take the colour the part is represented by. */
  coloured: boolean;
  /** 랜덤: each part a hue of its own. */
  random: boolean;
  /** Called when a picture's colour, sampled later, is ready: the page is read again. */
  onColour: () => void;
};
