import type { Line } from "./model";
import type { Mark } from "./scene";
import { BADGE_R, INK, NAME } from "./style";

// Names and badges as small bitmaps, rasterised at the current device scale
// (device px per map unit) rounded up to a quarter-octave, so a bitmap is only
// ever drawn at 84–100% of its own resolution: no upscaling blur, and glyphs
// are rasterised once per scale step instead of every frame of a pinch.

const STEP = 4; // buckets per octave
const MAX_NEW_PER_FRAME = 12;
const MAX_CACHE = 2400;

export const bucketOf = (scale: number) => Math.pow(2, Math.ceil(Math.log2(scale) * STEP - 1e-6) / STEP);

type Sprite = { canvas: HTMLCanvasElement; /** Box in map units relative to the anchor. */ x: number; y: number; w: number; h: number; k: number };

type Fonts = { family: string };

const font = (weight: number, size: number, family: string) => `${weight} ${size}px ${family}`;

function setTracking(ctx: CanvasRenderingContext2D, em: number, size: number) {
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${em * size}px`;
}
const tracks = (ctx: CanvasRenderingContext2D) => "letterSpacing" in ctx;

/** Width of text with tracking, in px at the context's current font. */
function width(ctx: CanvasRenderingContext2D, text: string, em: number, size: number) {
  if (tracks(ctx)) {
    setTracking(ctx, em, size);
    return ctx.measureText(text).width;
  }
  return ctx.measureText(text).width + em * size * Math.max(0, [...text].length - 1);
}

function fill(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, em: number, size: number) {
  if (tracks(ctx)) {
    setTracking(ctx, em, size);
    ctx.fillText(text, x, y);
    return;
  }
  // Safari without canvas letterSpacing: glyph by glyph.
  let at = x;
  for (const ch of text) {
    ctx.fillText(ch, at, y);
    at += ctx.measureText(ch).width + em * size;
  }
}

export class LabelCache {
  private sprites = new Map<string, Sprite>();
  private best = new Map<string, Sprite>();
  private made = 0;
  /** Names drawn this frame from another scale or left out, awaiting their bitmap. */
  missing = 0;
  private measure: CanvasRenderingContext2D;

  constructor(private fonts: Fonts) {
    this.measure = document.createElement("canvas").getContext("2d")!;
  }

  /** Call once per frame before drawing. */
  frame() {
    this.made = 0;
    this.missing = 0;
    if (this.sprites.size > MAX_CACHE) {
      this.sprites.clear();
      this.best.clear();
    }
  }

  clear() {
    this.sprites.clear();
    this.best.clear();
  }

  /** The station name at device scale `scale`; may return a sprite of another scale while the budget is spent. */
  name(m: Mark, scale: number): Sprite | null {
    const k = bucketOf(scale);
    const key = `${m.id}@${k}`;
    const hit = this.sprites.get(key);
    if (hit) return hit;
    if (this.made >= MAX_NEW_PER_FRAME) {
      this.missing += 1;
      return this.best.get(m.id) ?? null;
    }
    this.made += 1;
    const sprite = this.paintName(m, k);
    this.sprites.set(key, sprite);
    const prev = this.best.get(m.id);
    if (!prev || Math.abs(Math.log(prev.k / scale)) > Math.abs(Math.log(k / scale))) this.best.set(m.id, sprite);
    return sprite;
  }

  badge(line: Line, scale: number): Sprite {
    const k = bucketOf(scale);
    const key = `badge:${line.id}@${k}`;
    const hit = this.sprites.get(key);
    if (hit) return hit;
    const r = BADGE_R;
    const canvas = document.createElement("canvas");
    const px = Math.ceil(2 * r * k) + 2;
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext("2d")!;
    ctx.translate(px / 2, px / 2);
    ctx.scale(k, k);
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = line.colour;
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const rows = line.badge;
    const longest = Math.max(...rows.map((row) => [...row].length));
    const size = rows.length === 1 ? (longest === 1 ? r * 1.25 : longest === 2 ? r * 0.82 : r * 0.62) : longest > 2 ? r * 0.5 : r * 0.64;
    ctx.font = font(800, size, this.fonts.family);
    rows.forEach((row, i) => ctx.fillText(row, 0, (i - (rows.length - 1) / 2) * size * 1.02 + size * 0.06));
    const sprite = { canvas, x: -px / 2 / k, y: -px / 2 / k, w: px / k, h: px / k, k };
    this.sprites.set(key, sprite);
    return sprite;
  }

  private paintName(m: Mark, k: number): Sprite {
    const family = this.fonts.family;
    const label = m.label;
    const kr = { ...(m.transfer ? NAME.transfer : NAME.plain), size: label.ks, tracking: label.kt };
    const en = { ...(m.transfer ? NAME.enTransfer : NAME.en), size: label.es, tracking: label.et };
    const ctx0 = this.measure;
    // Korean lines: text and pen origin relative to the station.
    ctx0.font = font(kr.weight, kr.size, family);
    const rows: { text: string; x: number; y: number; w: number }[] = [];
    if (label.split) {
      const [at, align] = label.split;
      const parts = [m.name.slice(0, at), m.name.slice(at)];
      const widths = parts.map((t) => width(ctx0, t, kr.tracking, kr.size));
      const block = Math.max(...widths);
      parts.forEach((t, i) => {
        const off = align === "left" ? 0 : align === "center" ? (block - widths[i]) / 2 : block - widths[i];
        // The match reports the first line's origin; centre/right blocks are measured from their widest line.
        const first = align === "left" ? 0 : align === "center" ? (block - widths[0]) / 2 : block - widths[0];
        rows.push({ text: t, x: label.kx - first + off, y: label.ky + i * kr.size * NAME.leading, w: widths[i] });
      });
    } else {
      rows.push({ text: m.name, x: label.kx, y: label.ky, w: width(ctx0, m.name, kr.tracking, kr.size) });
    }
    ctx0.font = font(en.weight, en.size, family);
    const wEn = m.en ? width(ctx0, m.en, en.tracking, en.size) : 0;
    // Bounding box in map units around every pen run (ascent 0.95, descent 0.25 em).
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const r of rows) {
      x0 = Math.min(x0, r.x);
      x1 = Math.max(x1, r.x + r.w);
      y0 = Math.min(y0, r.y - kr.size * 0.95);
      y1 = Math.max(y1, r.y + kr.size * 0.25);
    }
    if (m.en) {
      x0 = Math.min(x0, label.ex);
      x1 = Math.max(x1, label.ex + wEn);
      y0 = Math.min(y0, label.ey - en.size * 0.95);
      y1 = Math.max(y1, label.ey + en.size * 0.3);
    }
    const pad = 1;
    x0 -= pad;
    y0 -= pad;
    x1 += pad;
    y1 += pad;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.ceil((x1 - x0) * k));
    canvas.height = Math.max(1, Math.ceil((y1 - y0) * k));
    const ctx = canvas.getContext("2d")!;
    ctx.scale(k, k);
    ctx.translate(-x0, -y0);
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = INK;
    ctx.font = font(kr.weight, kr.size, family);
    for (const r of rows) fill(ctx, r.text, r.x, r.y, kr.tracking, kr.size);
    if (m.en) {
      ctx.font = font(en.weight, en.size, family);
      fill(ctx, m.en, label.ex, label.ey, en.tracking, en.size);
    }
    return { canvas, x: x0, y: y0, w: canvas.width / k, h: canvas.height / k, k };
  }
}
