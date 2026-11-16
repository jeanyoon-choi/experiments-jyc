import type { Kind } from "./model";

// The 2026 서울 지하철 노선도's drawing, measured on the published image in
// map units (one unit = one pixel of the 2555-px map).

export const GROUND = "#F7F7F7";
export const SEOUL = "#FFFFFF";
export const WATER = "#E9F5FD";
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
/** Ordinary stations on double, dashed and light-rail lines: the same white dot, ringed in the line colour. */
export const RING_DOT = { r: 2.9, stroke: 1.3 };

/** Interchanges: coloured discs, each wrapped in white and a dark ring that merge like an "8". */
export const DISC = { r: 5.0, white: 3.0, ring: 2.2 };

/** Terminus badges. */
export const BADGE_R = 14;

/**
 * Names in 서울알림체, as measured on the 7089-px map: interchange names
 * ExtraBold 14.6 with Bold 10.0 English, other names Bold 12.7 with Bold 6.9
 * English, no tracking. Each row carries its own size; these two are the
 * Korean sizes, for deciding when names are too small to draw.
 */
export const NAME = { transfer: 14.6, plain: 12.7 };

/** A pale tint of a line colour, as on the double lines' core. */
export function tint(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(255 - (255 - c) * amount);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}
