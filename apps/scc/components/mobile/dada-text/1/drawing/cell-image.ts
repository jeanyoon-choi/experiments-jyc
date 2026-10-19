import type { CellSpec } from "../reading/paint";
import { fontOf, palette, type Look } from "./look";

/**
 * A cell drawn as an SVG image at its exact CSS-pixel size: the command's capitals stretched to fill it edge to edge,
 * as lettering fills the bars of an OMA diagram. Vector, so it stays sharp at any device pixel ratio.
 */

/** Below this height there is no room for letters; the cell is drawn as a frame alone. */
export const MIN_LETTER_HEIGHT = 5;
/** The gap between the lines of a word written over several (a space breaks it), as a share of the letters' height. */
const LINE_GAP = 0.03;

const round = (value: number) => Math.round(value * 100) / 100;

type Ink = { ascent: number; descent: number };
const inks = new Map<string, Ink>();
let measurer: CanvasRenderingContext2D | null | undefined;

/**
 * How far a line's own letters reach above and below the baseline, per em, measured once per face and line. A fixed cap
 * height lets round letters (C, O, S) overshoot it and be cut at the cell's top; the measured ink fits the cell exactly.
 */
function inkOf(font: ReturnType<typeof fontOf>, line: string): Ink {
  const key = `${font.id}|${line}`;
  let ink = inks.get(key);
  if (ink) return ink;
  if (measurer === undefined) measurer = typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
  ink = { ascent: font.cap, descent: 0 };
  if (measurer) {
    measurer.font = `${font.weight} 100px ${font.family}`;
    const metrics = measurer.measureText(line);
    const ascent = metrics.actualBoundingBoxAscent / 100;
    const descent = Math.max(0, metrics.actualBoundingBoxDescent / 100);
    if (ascent > 0) ink = { ascent, descent };
  }
  inks.set(key, ink);
  return ink;
}

export function cellSvg({ width, height, word, framed, insetX, insetY, colour }: CellSpec, look: Look) {
  const w = round(width);
  const h = round(height);
  const { ink: mono, paper, frame, stroke } = palette(look);
  const ink = colour || mono;
  const font = fontOf(look.font);
  let body = "";
  if (framed) {
    const half = stroke / 2;
    body = stroke
      ? `<rect x="${round(half)}" y="${round(half)}" width="${round(Math.max(0, w - stroke))}" height="${round(Math.max(0, h - stroke))}" fill="${paper}" stroke="${frame}" stroke-width="${round(stroke)}"/>`
      : `<rect width="${w}" height="${h}" fill="${paper}"/>`;
  }
  const capHeight = h - insetY * 2;
  const length = w - insetX * 2;
  if (word && capHeight >= MIN_LETTER_HEIGHT && length >= 4) {
    // A word with a space is set as one line per part, each filling the width; where the lines would be too short for
    // letters, it is set whole on one line instead.
    const parts = word.split(" ");
    const lineHeight = (capHeight * (1 - LINE_GAP * (parts.length - 1))) / parts.length;
    const lines = parts.length > 1 && lineHeight >= MIN_LETTER_HEIGHT ? parts : [parts.join("")];
    const band = lines.length > 1 ? lineHeight : capHeight;
    const step = band + capHeight * LINE_GAP;
    // Each line's ink, top of its highest letter to the foot of its lowest, fills its band exactly.
    lines.forEach((line, index) => {
      const { ascent, descent } = inkOf(font, line);
      const fontSize = band / (ascent + descent);
      body += `<text x="${round(insetX)}" y="${round(insetY + step * index + ascent * fontSize)}" font-family="${font.family}" font-weight="${font.weight}" font-size="${round(fontSize)}" textLength="${round(length)}" lengthAdjust="spacingAndGlyphs" fill="${ink}">${line}</text>`;
    });
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

const urls = new Map<string, string>();

/** The image as a CSS `url()`; `#` and quotes must be escaped inside a data URI. Repeated cells reuse the same string. */
export function cellUrl(cell: CellSpec, look: Look) {
  const key = `${round(cell.width)}|${round(cell.height)}|${cell.word}|${cell.framed}|${round(cell.insetX)}|${round(cell.insetY)}|${look.font}|${look.border}|${cell.colour ?? ""}`;
  let url = urls.get(key);
  if (!url) {
    if (urls.size > 4000) urls.clear();
    urls.set(key, (url = `url("data:image/svg+xml,${encodeURIComponent(cellSvg(cell, look))}")`));
  }
  return url;
}
