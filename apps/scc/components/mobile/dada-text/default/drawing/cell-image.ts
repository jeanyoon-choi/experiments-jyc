import type { CellSpec } from "../reading/paint";
import { fontOf, palette, type Look } from "./look";

/**
 * A cell drawn as an SVG image at its exact CSS-pixel size: the command's capitals stretched to fill it edge to edge,
 * as lettering fills the bars of an OMA diagram. Vector, so it stays sharp at any device pixel ratio.
 */

/** Below this height there is no room for letters; the cell is drawn as a frame alone. */
export const MIN_LETTER_HEIGHT = 5;

const round = (value: number) => Math.round(value * 100) / 100;

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
    const fontSize = round(capHeight / font.cap);
    body += `<text x="${round(insetX)}" y="${round(insetY + capHeight)}" font-family="${font.family}" font-weight="${font.weight}" font-size="${fontSize}" textLength="${round(length)}" lengthAdjust="spacingAndGlyphs" fill="${ink}">${word}</text>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`;
}

const urls = new Map<string, string>();

/** The image as a CSS `url()`; `#` and quotes must be escaped inside a data URI. Repeated cells reuse the same string. */
export function cellUrl(cell: CellSpec, look: Look) {
  const key = `${round(cell.width)}|${round(cell.height)}|${cell.word}|${cell.framed}|${round(cell.insetX)}|${round(cell.insetY)}|${look.font}|${look.border}|${look.dark}|${cell.colour ?? ""}`;
  let url = urls.get(key);
  if (!url) {
    if (urls.size > 4000) urls.clear();
    urls.set(key, (url = `url("data:image/svg+xml,${encodeURIComponent(cellSvg(cell, look))}")`));
  }
  return url;
}
