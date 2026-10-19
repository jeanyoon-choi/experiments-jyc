/** How every cell is drawn: typeface, frame weights, ground and ink. The option panel sets a `Look`; drawing reads it. */

/**
 * Typefaces for the words. A data-URI SVG image cannot load web fonts, so each is a system face present on iOS and macOS,
 * with fallbacks elsewhere. `cap` is the face's cap height as a share of the em, so capitals fill the cell exactly.
 */
export const fonts = [
  { id: "grotesque", label: "그로테스크", name: "Helvetica", family: "'Helvetica Neue', Helvetica, Arial, sans-serif", weight: 700, cap: 0.716 },
  { id: "condensed", label: "콘덴스드", name: "Avenir Condensed", family: "'Avenir Next Condensed', 'Arial Narrow', 'Roboto Condensed', sans-serif", weight: 800, cap: 0.708 },
  { id: "geometric", label: "지오메트릭", name: "Futura", family: "Futura, 'Century Gothic', 'Avenir Next', sans-serif", weight: 700, cap: 0.7 },
  { id: "serif", label: "세리프", name: "Didot", family: "Didot, 'Bodoni 72', 'Bodoni MT', 'Times New Roman', serif", weight: 700, cap: 0.69 },
  { id: "typewriter", label: "타자", name: "Typewriter", family: "'American Typewriter', 'Courier New', Courier, monospace", weight: 700, cap: 0.66 },
  { id: "mono", label: "모노", name: "Menlo", family: "Menlo, Monaco, Consolas, 'Courier New', monospace", weight: 700, cap: 0.73 },
] as const;

export type FontId = (typeof fonts)[number]["id"];

export const fontOf = (id: FontId) => fonts.find((face) => face.id === id) ?? fonts[0];

/**
 * What colour the letters take: the ink of the ground (black on white, white on black), each part's own representative colour,
 * or a random hue per part at full saturation and half lightness.
 */
export type Ink = "mono" | "colour" | "random";

/**
 * Typeface; frame weight (0 none, 1 hairline, up to 6 heavy; below 1 the hairline fades); dark ground; ink; and `edge`,
 * a frame in the ink along the screen's own edge.
 */
export type Look = { font: FontId; border: number; dark: boolean; ink: Ink; edge: number };

/** The heaviest frame (테두리), in px. */
export const BORDER_MAX = 6;
/** The widest outer frame (바깥 테두리), in px of the screen's own edge. */
export const EDGE_MAX = 12;

/** Ink, paper, and the frame's colour and stroke width for a look. */
export function palette(look: Look) {
  const ink = look.dark ? "#fff" : "#000";
  const paper = look.dark ? "#000" : "#fff";
  const alpha = Math.min(1, Math.max(0, look.border));
  const frame = alpha === 0 ? "transparent" : alpha === 1 ? ink : look.dark ? `rgba(255,255,255,${alpha})` : `rgba(0,0,0,${alpha})`;
  return { ink, paper, frame, stroke: look.border <= 0 ? 0 : Math.max(1, look.border) };
}
