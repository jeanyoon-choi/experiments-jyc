import type { Kind } from "./model";

// The 2026 서울 지하철 노선도's drawing, measured on the published image in
// map units (one unit = one pixel of the 2555-px map).

export const GROUND = "#F7F7F7";
export const SEOUL = "#FFFFFF";
export const RIVER = "#DCEEFA";
export const INK = "#231F20";
export const RING = "#231F20";

/** Stroke width per line kind. */
export const WIDTH: Record<Kind, number> = { metro: 7.0, double: 5.6, dashed: 5.6, light: 4.0 };
/** Double lines: two strokes of the line colour around a pale tint of it. */
export const DOUBLE = { stroke: 1.35, tint: 0.32 };
/** Dashed lines: white dashes along the core. */
export const DASH = { width: 1.9, on: 6.5, off: 4.5 };

/** Ordinary stations on solid lines: a white dot inside the stroke. */
export const DOT_R = 2.2;
/** Ordinary stations on double and dashed lines: a white dot ringed in the line colour. */
export const RING_DOT = { r: 3.6, stroke: 1.2 };
/** Where a line branches: a larger ringed dot. */
export const BRANCH_DOT = { r: 4.6, stroke: 1.9 };

/** Interchanges: coloured discs, each wrapped in white and a dark ring that merge like an "8". */
export const DISC = { r: 5.0, white: 3.0, ring: 2.2 };

/** Terminus badges. */
export const BADGE_R = 14;

/** Names in 서울알림체, sizes in map units; tracking in em. */
export const NAME = {
  transfer: { size: 14.2, weight: 800, tracking: 0.03 },
  plain: { size: 11.5, weight: 700, tracking: 0.03 },
  enTransfer: { size: 9.5, weight: 700, tracking: 0 },
  en: { size: 7.0, weight: 500, tracking: 0 },
  /** Line height of a Korean name set in two lines, in em. */
  leading: 1.25,
};

/** A pale tint of a line colour, as on the double lines' core. */
export function tint(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(255 - (255 - c) * amount);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}
