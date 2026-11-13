// Decodes media items into square tiles, a few at a time, and hands each tile
// to the renderer as it is ready (the pattern of Goldfishes'
// photo-media-atlas.ts: fetch → createImageBitmap → cover crop on a canvas,
// at most a few decodes in flight). Decoded source images are cached, so the
// tech atlas is decoded once for its 36 tiles and a surface change never
// re-fetches a photo it already has.

import { KEYWORD_FONTS, type KeywordStyle, type MediaItem } from "./catalogue";
import type { SymbolLayer } from "./tech-symbols";

const MAX_CONCURRENT_DECODES = 4;

const decoded = new Map<string, Promise<ImageBitmap>>();

function decode(url: string) {
  let pending = decoded.get(url);
  if (!pending) {
    pending = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`bubble/3 media: ${url} ${response.status}`);
        return response.blob();
      })
      .then((blob) => createImageBitmap(blob));
    pending.catch(() => decoded.delete(url));
    decoded.set(url, pending);
  }
  return pending;
}

/** Draws the source rectangle to cover the whole tile, centred, without stretching. */
function drawCover(context: CanvasRenderingContext2D, image: ImageBitmap, sx: number, sy: number, sw: number, sh: number, tile: number) {
  const scale = Math.max(tile / sw, tile / sh);
  const width = tile / scale;
  const height = tile / scale;
  context.drawImage(image, sx + (sw - width) / 2, sy + (sh - height) / 2, width, height, 0, 0, tile, tile);
}

function drawText(context: CanvasRenderingContext2D, text: string, hex: string | undefined, style: KeywordStyle, tile: number) {
  const font = KEYWORD_FONTS.find((candidate) => candidate.id === style.font) ?? KEYWORD_FONTS[0]!;
  const opacity = Math.max(0, Math.min(1, style.opacity));
  context.fillStyle = "#000000";
  context.fillRect(0, 0, tile, tile);
  // White at the style's opacity on black: at 0.7 a pale grey, so a word sits among the photographs rather than shouting.
  // With 브랜드 (FOMO), 기술-버블's way instead: the brand tint gathering at the rim and the words in a pale
  // version of the colour, as the marks are drawn; the opacity scales the words (0.7 is the marks' strength).
  const rgb = style.brand && hex ? bubbleTint(context, hex, tile) : null;
  const strength = Math.min(1, opacity / 0.7);
  const fills = rgb ? [`rgba(${rgb}, ${0.9 * strength})`, `rgba(255, 255, 255, ${0.35 * strength})`] : [`rgba(255, 255, 255, ${opacity})`];
  if (style.fill === "sphere") {
    drawFilledSphere(context, text, fills, font, style.size, tile);
    return;
  }
  if (style.fill === "flat") {
    drawFilled(context, text, fills, font, style.size, tile);
    return;
  }
  context.textAlign = "center";
  context.textBaseline = "middle";
  const words = text.split(" ");
  if (words.length === 1) {
    // At size 1 the word spans about half the tile (the sphere mapping magnifies the middle); short words stay within a sensible size.
    const size = Math.min(tile * 0.34, (tile * 0.5) / Math.max(1, text.length * 0.62)) * font.scale * style.size;
    context.font = `${font.weight} ${size}px ${font.family}`;
    for (const fill of fills) {
      context.fillStyle = fill;
      context.fillText(text, tile / 2, tile / 2 + size * 0.04);
    }
    return;
  }
  // A phrase (풀네임): one word per line, each line shrunk until it fits the middle of the tile, the block centred.
  const width = tile * 0.56 * style.size;
  let size = tile * 0.13 * font.scale * style.size;
  for (;;) {
    context.font = `${font.weight} ${size}px ${font.family}`;
    const widest = Math.max(...words.map((word) => context.measureText(word).width));
    if (widest <= width || size <= tile * 0.02) break;
    size *= Math.max(0.8, width / widest);
  }
  const lineHeight = size * 1.12;
  const top = tile / 2 - (lineHeight * (words.length - 1)) / 2;
  for (const fill of fills) {
    context.fillStyle = fill;
    words.forEach((word, index) => context.fillText(word, tile / 2, top + lineHeight * index + size * 0.04));
  }
}

/** The height of a face's capitals as a share of its font size, measured once from "H" (dada-text tabulates this per face). */
const capHeights = new Map<string, number>();
function capHeightOf(context: CanvasRenderingContext2D, font: { family: string; weight: number }) {
  const key = `${font.weight} ${font.family}`;
  let cap = capHeights.get(key);
  if (cap === undefined) {
    context.font = `${font.weight} 100px ${font.family}`;
    cap = Math.max(0.5, context.measureText("H").actualBoundingBoxAscent / 100);
    capHeights.set(key, cap);
  }
  return cap;
}

/**
 * 꽉 채움 · 구면: how far the lettering reaches, as a share of the tile each way (longitude ±WIDTH · π/2, latitude
 * ±REACH · π/2): 78 % puts the slab on 94 % of the radius while the last letters and lines are not yet crushed.
 */
const SPHERE_WIDTH = 0.78;
const SPHERE_REACH = 0.78;
/**
 * How much the lettering is pre-widened towards the rim to undo the ball's foreshortening (x = sin longitude):
 * 0 prints the line evenly on the chart and the end letters squeeze to slivers (user, 2026-10-19: the letters at
 * the sides unreadable), 1 undoes it fully and the line reads as if flat; 0.75 keeps the end letters readable with
 * the ball's curve still felt.
 */
const SPHERE_EASE = 0.75;

/** Between stacked lines, as a share of a line's cap height. */
const FILL_GAP = 0.1;
/** The block's width as a share of the disc, and its height, the two set so the block's corners sit on the rim (w² + h² = 1). */
const BLOCK_WIDTH = 0.82;
const BLOCK_HEIGHT = Math.sqrt(1 - BLOCK_WIDTH * BLOCK_WIDTH);

/**
 * 꽉 채움: mobile/dada-text's lettering set into the bubble's disc (the tile's inscribed circle, laid
 * flat over the bubble edge to edge). One rectangular block of capitals, its corners on the rim, 82 % of the
 * disc wide; the text one word per line, the lines stacked to the block's full height and every line stretched
 * sideways (as SVG's lengthAdjust="spacingAndGlyphs") to the block's full width, so the words make one solid
 * slab of wide letters as lettering fills the bars of an OMA diagram. `size` below 1 shrinks the block about the centre.
 */
function drawFilled(context: CanvasRenderingContext2D, text: string, fills: readonly string[], font: { family: string; weight: number }, size: number, tile: number) {
  const words = text.toUpperCase().split(" ").filter(Boolean);
  if (words.length === 0) return;
  const scale = Math.min(1, Math.max(0, size));
  const width = tile * BLOCK_WIDTH * scale;
  const height = tile * BLOCK_HEIGHT * scale;
  const cap = capHeightOf(context, font);
  const capHeight = height / (words.length + FILL_GAP * (words.length - 1));
  const fontSize = capHeight / cap;
  context.font = `${font.weight} ${fontSize}px ${font.family}`;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  const left = (tile - width) / 2;
  const top = (tile - height) / 2;
  words.forEach((word, index) => {
    const measured = context.measureText(word);
    const ink = measured.actualBoundingBoxLeft + measured.actualBoundingBoxRight;
    if (ink <= 0) return;
    const baseline = top + capHeight * (index * (1 + FILL_GAP) + 1);
    context.save();
    context.translate(left, baseline);
    context.scale(width / ink, 1);
    for (const fill of fills) {
      context.fillStyle = fill;
      context.fillText(word, measured.actualBoundingBoxLeft, 0);
    }
    context.restore();
  });
}

/**
 * 꽉 채움 · 구면: the slab wrapped on the ball. foam.ts's sphere mapping reads the tile as the visible hemisphere's
 * equirectangular chart — u across is longitude −π/2…π/2 (the rim at both sides, for every latitude), v down is
 * latitude, and a point at longitude λ, latitude φ lands on the disc at x = cos φ · sin λ, y = sin φ. So the
 * lines are placed by the disc height they should occupy (equal bands of y, converted to latitude) and come out
 * evenly tall on the screen, and within a line each letter is placed by the disc width it should occupy (its
 * share of the line, converted to longitude, eased by SPHERE_EASE), so the letters at the ends are drawn wider on
 * the chart and the ball's foreshortening brings them back to a readable width. `size` scales the reach.
 */
function drawFilledSphere(context: CanvasRenderingContext2D, text: string, fills: readonly string[], font: { family: string; weight: number }, size: number, tile: number) {
  const words = text.toUpperCase().split(" ").filter(Boolean);
  if (words.length === 0) return;
  const scale = Math.min(1, Math.max(0, size));
  const longitude = (SPHERE_WIDTH * scale * Math.PI) / 2;
  const reach = Math.sin((SPHERE_REACH * scale * Math.PI) / 2);
  const halfWidth = Math.sin(longitude);
  const cap = capHeightOf(context, font);
  // Band heights on the disc (y, −reach…reach): the lines and the gaps between them.
  const band = (2 * reach) / (words.length + FILL_GAP * (words.length - 1));
  // A share t (0…1) of the line → tile column: evenly along the chart, or evenly across the disc, eased between.
  const column = (t: number) => {
    const chart = (t - 0.5) * 2 * longitude;
    const disc = Math.asin((t - 0.5) * 2 * halfWidth);
    return ((chart + (disc - chart) * SPHERE_EASE) / Math.PI + 0.5) * tile;
  };
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  words.forEach((word, index) => {
    const yTop = -reach + band * index * (1 + FILL_GAP);
    const yBottom = yTop + band;
    // Disc height → latitude → tile row (v = φ/π + 0.5).
    const rowTop = (Math.asin(yTop) / Math.PI + 0.5) * tile;
    const rowBottom = (Math.asin(yBottom) / Math.PI + 0.5) * tile;
    context.font = `${font.weight} ${(rowBottom - rowTop) / cap}px ${font.family}`;
    const glyphs = Array.from(word);
    const advances = glyphs.map((glyph) => context.measureText(glyph).width);
    const total = advances.reduce((sum, advance) => sum + advance, 0);
    if (total <= 0) return;
    let share = 0;
    glyphs.forEach((glyph, position) => {
      const next = share + advances[position] / total;
      const from = column(share);
      const to = column(next);
      share = next;
      context.save();
      context.translate(from, rowBottom);
      context.scale((to - from) / advances[position], 1);
      for (const fill of fills) {
        context.fillStyle = fill;
        context.fillText(glyph, 0, 0);
      }
      context.restore();
    });
  });
}

const EMOJI_FAMILY = `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
const EMOJI_PROBE = 120;
let emojiFace: { size: number; x: number; y: number } | null = null;

/**
 * The face circle every round emoji shares, measured from 🙂's drawn pixels at
 * EMOJI_PROBE px (measureText reports the em box, about 12 % larger than the ink):
 * its diameter and its centre's offset from the centred, middle-aligned origin.
 */
function measureEmojiFace() {
  if (emojiFace) return emojiFace;
  const side = EMOJI_PROBE * 2;
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  let face = { size: EMOJI_PROBE * 0.9, x: 0, y: 0 };
  if (context) {
    context.font = `${EMOJI_PROBE}px ${EMOJI_FAMILY}`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("🙂", side / 2, side / 2);
    const alpha = context.getImageData(0, 0, side, side).data;
    let left = side, right = -1, top = side, bottom = -1;
    for (let y = 0; y < side; y += 1) {
      for (let x = 0; x < side; x += 1) {
        if (alpha[(y * side + x) * 4 + 3]! < 40) continue;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    if (right > left && bottom > top) {
      face = { size: Math.max(right - left + 1, bottom - top + 1), x: (left + right + 1) / 2 - side / 2, y: (top + bottom + 1) / 2 - side / 2 };
    }
  }
  emojiFace = face;
  return face;
}

/**
 * One round emoji face filling the tile edge to edge on black (the keyword style does not apply):
 * the bubble becomes this tile as a ball, so the face's outline is the ball's rim. A tongue or
 * tear past the circle is cut at the tile's edge.
 */
function drawEmoji(context: CanvasRenderingContext2D, glyph: string, tile: number) {
  const face = measureEmojiFace();
  const scale = tile / face.size;
  context.fillStyle = "#000000";
  context.fillRect(0, 0, tile, tile);
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = `${EMOJI_PROBE * scale}px ${EMOJI_FAMILY}`;
  context.fillText(glyph, tile / 2 - face.x * scale, tile / 2 - face.y * scale);
}

/**
 * A tech mark on a ball of its brand colour, filling the tile (the ball's rim is the tile's
 * inscribed circle): the mark at about half the ball's width, white, or near-black on a pale
 * brand colour; a near-black brand (OpenAI, Apple, Ethereum) turns to a white ball with a dark mark.
 */
function brandLuminance(hex: string) {
  const value = Number.parseInt(hex, 16);
  const channel = (shift: number) => {
    const c = ((value >> shift) & 255) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(16) + 0.7152 * channel(8) + 0.0722 * channel(0);
}

function drawMark(context: CanvasRenderingContext2D, path: string, hex: string, tile: number) {
  const luminance = brandLuminance(hex);
  const dark = luminance < 0.03;
  context.fillStyle = dark ? "#f2f2f2" : `#${hex}`;
  context.fillRect(0, 0, tile, tile);
  // The ball's own volume, drawn into it as the emoji faces carry theirs: paler towards the
  // upper left, darker towards the rim. No highlight — light effects belong to the film.
  const half = tile / 2;
  const body = context.createRadialGradient(tile * 0.36, tile * 0.3, 0, tile * 0.36, tile * 0.3, tile * 0.75);
  body.addColorStop(0, "rgba(255, 255, 255, 0.22)");
  body.addColorStop(1, "rgba(255, 255, 255, 0)");
  context.fillStyle = body;
  context.fillRect(0, 0, tile, tile);
  const rim = context.createRadialGradient(half, half, tile * 0.3, half, half, half);
  rim.addColorStop(0, "rgba(0, 0, 0, 0)");
  rim.addColorStop(1, "rgba(0, 0, 0, 0.3)");
  context.fillStyle = rim;
  context.fillRect(0, 0, tile, tile);
  context.fillStyle = dark ? `#${hex}` : luminance > 0.5 ? "#141414" : "#ffffff";
  const size = tile * 0.5;
  context.save();
  context.translate((tile - size) / 2, (tile - size) / 2);
  context.scale(size / 24, size / 24);
  context.fill(new Path2D(path));
  context.restore();
}

/**
 * 기술-버블: a tech mark as a soap bubble, for the film to lie over. The picture is added to
 * the film, so black is clear: the middle stays nearly clear, the brand colour gathers towards
 * the rim as a thick film's colour does, and the mark floats in the middle, paler than the
 * colour (a near-black brand is a grey bubble with a pale mark).
 */
function drawMarkBubble(context: CanvasRenderingContext2D, path: string, hex: string, tile: number) {
  context.fillStyle = "#000000";
  context.fillRect(0, 0, tile, tile);
  const rgb = bubbleTint(context, hex, tile);
  const size = tile * 0.46;
  context.save();
  context.translate((tile - size) / 2, (tile - size) / 2);
  context.scale(size / 24, size / 24);
  context.fillStyle = `rgba(${rgb}, 0.9)`;
  context.fill(new Path2D(path));
  context.fillStyle = "rgba(255, 255, 255, 0.35)";
  context.fill(new Path2D(path));
  context.restore();
}

/**
 * 기술-상징: a technology's mark in 기술-버블's treatment. The layers are drawn in order into a
 * mask (fills even-odd, strokes round-capped, cuts erase), which is then coloured as the marks
 * are, so shapes that overlap never double the colour.
 */
let symbolMask: HTMLCanvasElement | null = null;
function drawSymbolBubble(context: CanvasRenderingContext2D, layers: readonly SymbolLayer[], hex: string, tile: number) {
  context.fillStyle = "#000000";
  context.fillRect(0, 0, tile, tile);
  const rgb = bubbleTint(context, hex, tile);
  symbolMask ??= document.createElement("canvas");
  if (symbolMask.width !== tile) symbolMask.width = symbolMask.height = tile;
  const mask = symbolMask.getContext("2d");
  if (!mask) return;
  const size = tile * 0.5;
  mask.clearRect(0, 0, tile, tile);
  mask.save();
  mask.translate((tile - size) / 2, (tile - size) / 2);
  mask.scale(size / 24, size / 24);
  mask.lineCap = "round";
  mask.lineJoin = "round";
  mask.fillStyle = mask.strokeStyle = "#ffffff";
  for (const layer of layers) {
    const path = new Path2D(layer.d);
    mask.globalCompositeOperation = layer.mode === "cut" || layer.mode === "cutStroke" ? "destination-out" : "source-over";
    mask.lineWidth = layer.width ?? 1;
    if (layer.mode === "fill" || layer.mode === "cut") mask.fill(path, "evenodd");
    else mask.stroke(path);
  }
  mask.restore();
  mask.globalCompositeOperation = "source-in";
  mask.fillStyle = `rgba(${rgb}, 0.9)`;
  mask.fillRect(0, 0, tile, tile);
  mask.globalCompositeOperation = "source-atop";
  mask.fillStyle = "rgba(255, 255, 255, 0.35)";
  mask.fillRect(0, 0, tile, tile);
  mask.globalCompositeOperation = "source-over";
  context.drawImage(symbolMask, 0, 0);
}

/** 기술-버블's tint over a black tile: the brand colour gathering towards the rim. Returns the colour as "r, g, b". */
function bubbleTint(context: CanvasRenderingContext2D, hex: string, tile: number) {
  const dark = brandLuminance(hex) < 0.03;
  const value = Number.parseInt(dark ? "9a9a9a" : hex, 16);
  const rgb = `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`;
  const half = tile / 2;
  const tint = context.createRadialGradient(half, half, 0, half, half, half);
  tint.addColorStop(0, `rgba(${rgb}, 0.08)`);
  tint.addColorStop(0.6, `rgba(${rgb}, 0.18)`);
  tint.addColorStop(0.9, `rgba(${rgb}, 0.55)`);
  tint.addColorStop(1, `rgba(${rgb}, 0.75)`);
  context.fillStyle = tint;
  context.fillRect(0, 0, tile, tile);
  return rgb;
}

export type MediaLoad = { cancel(): void; done: Promise<void> };

/**
 * Decodes every item into a `tile`-square canvas and calls `onTile(index, canvas)` as each is
 * drawn; the canvas is reused, so the callback must upload it before returning. `onBatch`
 * is called after every few tiles and once at the end (for mipmaps).
 */
export function loadMediaTiles(
  items: readonly MediaItem[],
  onTile: (index: number, tile: HTMLCanvasElement) => void,
  onBatch: () => void,
  style: KeywordStyle,
  tile: number,
): MediaLoad {
  const canvas = document.createElement("canvas");
  canvas.width = tile;
  canvas.height = tile;
  const context = canvas.getContext("2d");
  let cancelled = false;
  let next = 0;
  let sinceBatch = 0;
  const batch = () => {
    if (sinceBatch === 0) return;
    sinceBatch = 0;
    onBatch();
  };
  const one = async (index: number) => {
    const item = items[index]!;
    if (!context) return;
    if (item.kind === "text") {
      drawText(context, item.text, item.hex, style, tile);
    } else if (item.kind === "emoji") {
      drawEmoji(context, item.glyph, tile);
    } else if (item.kind === "mark") {
      if (item.bubble) drawMarkBubble(context, item.path, item.hex, tile);
      else drawMark(context, item.path, item.hex, tile);
    } else if (item.kind === "symbol") {
      drawSymbolBubble(context, item.layers, item.hex, tile);
    } else {
      const image = await decode(item.url);
      if (cancelled) return;
      context.clearRect(0, 0, tile, tile);
      if (item.kind === "image") drawCover(context, image, 0, 0, image.width, image.height, tile);
      else {
        const width = image.width / item.columns;
        const height = image.height / item.rows;
        drawCover(context, image, item.column * width, item.row * height, width, height, tile);
      }
    }
    if (cancelled) return;
    onTile(index, canvas);
    sinceBatch += 1;
    if (sinceBatch >= 12) batch();
  };
  const worker = async () => {
    while (!cancelled && next < items.length) {
      const index = next;
      next += 1;
      try {
        await one(index);
      } catch (error) {
        console.warn("bubble/3 media tile failed.", items[index]?.id, error);
      }
    }
  };
  const done = Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_DECODES, items.length) }, worker)).then(() => {
    if (!cancelled) batch();
  });
  return {
    cancel: () => {
      cancelled = true;
    },
    done,
  };
}
