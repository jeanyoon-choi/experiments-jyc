import type { Line } from "./model";
import type { Mark } from "./scene";
import { BADGE_R, INK } from "./style";

// Names and badges as bitmaps, rasterised at the current device scale
// (device px per map unit) rounded up to a third of an octave, so a bitmap is only
// ever drawn at 79–100% of its own resolution: no upscaling blur, and glyphs
// are rasterised once per scale step instead of every frame of a pinch. The
// bitmaps of one scale share a few atlas pages, so a frame draws names from a
// handful of textures instead of hundreds.

const STEP = 3; // buckets per octave
const MAX_NEW_PER_FRAME = 6;
const MAX_CACHE = 2400;

export const bucketOf = (scale: number) => Math.pow(2, Math.ceil(Math.log2(scale) * STEP - 1e-6) / STEP);

const PAGE = 1024;
/** Scales whose bitmaps are kept; older ones are dropped to bound memory. */
const KEEP_SCALES = 3;

export type Sprite = {
  canvas: HTMLCanvasElement;
  /** Source rectangle in the page, device px. */
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  /** Box in map units relative to the anchor. */
  x: number;
  y: number;
  w: number;
  h: number;
  k: number;
};

type Page = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D; x: number; y: number; row: number };

type Fonts = { family: string };

const font = (weight: number, size: number, family: string) => `${weight} ${size}px ${family}`;

export class LabelCache {
  private sprites = new Map<string, Sprite>();
  private best = new Map<string, Sprite>();
  private made = 0;
  /** Names drawn this frame from another scale or left out, awaiting their bitmap. */
  missing = 0;
  /** While the zoom is changing: reuse bitmaps of other scales instead of rasterising. */
  frozen = false;
  private measure: CanvasRenderingContext2D;
  private pages = new Map<number, Page[]>();
  private recent: number[] = [];

  constructor(private fonts: Fonts) {
    this.measure = document.createElement("canvas").getContext("2d")!;
  }

  /** Call once per frame before drawing. */
  frame() {
    this.made = 0;
    this.missing = 0;
    if (this.sprites.size > MAX_CACHE) this.clear();
  }

  clear() {
    this.sprites.clear();
    this.best.clear();
    this.pages.clear();
    this.recent = [];
  }

  /** Marks scale k as in use and drops the bitmaps of the least recent scales. */
  private use(k: number) {
    if (this.recent[this.recent.length - 1] === k) return;
    this.recent = [...this.recent.filter((x) => x !== k), k];
    while (this.recent.length > KEEP_SCALES) {
      const old = this.recent.shift()!;
      this.pages.delete(old);
      for (const [key, sp] of this.sprites) if (sp.k === old) this.sprites.delete(key);
      for (const [id, sp] of this.best) if (sp.k === old) this.best.delete(id);
    }
  }

  /**
   * A w × h (map units) cell at scale k whose painter draws in map units with
   * (x0, y0) at the cell's top-left.
   */
  private cell(k: number, x0: number, y0: number, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): Sprite {
    const sw = Math.max(1, Math.ceil(w * k));
    const sh = Math.max(1, Math.ceil(h * k));
    let page: Page | undefined;
    if (sw <= PAGE && sh <= PAGE) {
      const list = this.pages.get(k) ?? [];
      this.pages.set(k, list);
      page = list[list.length - 1];
      if (page && page.x + sw > PAGE) {
        page.x = 0;
        page.y += page.row + 1;
        page.row = 0;
      }
      if (!page || page.y + sh > PAGE) {
        const canvas = document.createElement("canvas");
        canvas.width = PAGE;
        canvas.height = PAGE;
        page = { canvas, ctx: canvas.getContext("2d")!, x: 0, y: 0, row: 0 };
        list.push(page);
      }
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = sw;
      canvas.height = sh;
      page = { canvas, ctx: canvas.getContext("2d")!, x: 0, y: 0, row: 0 };
    }
    const sx = page.x;
    const sy = page.y;
    const ctx = page.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(sx, sy, sw, sh);
    ctx.clip();
    ctx.translate(sx, sy);
    ctx.scale(k, k);
    ctx.translate(-x0, -y0);
    paint(ctx);
    ctx.restore();
    page.x += sw + 1;
    page.row = Math.max(page.row, sh);
    return { canvas: page.canvas, sx, sy, sw, sh, x: x0, y: y0, w: sw / k, h: sh / k, k };
  }

  /** The station name at device scale `scale`; may return a sprite of another scale while the budget is spent. */
  name(m: Mark, scale: number): Sprite | null {
    const k = bucketOf(scale);
    if (!this.frozen) this.use(k);
    const key = `${m.id}@${k}`;
    const hit = this.sprites.get(key);
    if (hit) return hit;
    const near = this.best.get(m.id);
    if (this.frozen && near) {
      this.missing += 1;
      return near;
    }
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
    this.use(k);
    const key = `badge:${line.id}@${k}`;
    const hit = this.sprites.get(key);
    if (hit) return hit;
    const r = BADGE_R;
    const family = this.fonts.family;
    const sprite = this.cell(k, -r - 0.5, -r - 0.5, 2 * r + 1, 2 * r + 1, (ctx) => {
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
      ctx.font = font(800, size, family);
      rows.forEach((row, i) => ctx.fillText(row, 0, (i - (rows.length - 1) / 2) * size * 1.02 + size * 0.06));
    });
    this.sprites.set(key, sprite);
    return sprite;
  }

  private paintName(m: Mark, k: number): Sprite {
    const family = this.fonts.family;
    const ctx0 = this.measure;
    // Bounding box in map units around every row (ascent 0.95, descent 0.3 em).
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const [text, x, y, size, weight] of m.rows) {
      ctx0.font = font(weight, size, family);
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x + ctx0.measureText(text).width);
      y0 = Math.min(y0, y - size * 0.95);
      y1 = Math.max(y1, y + size * 0.3);
    }
    const pad = 1;
    x0 -= pad;
    y0 -= pad;
    x1 += pad;
    y1 += pad;
    return this.cell(k, x0, y0, x1 - x0, y1 - y0, (ctx) => {
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = INK;
      for (const [text, x, y, size, weight] of m.rows) {
        ctx.font = font(weight, size, family);
        ctx.fillText(text, x, y);
      }
    });
  }
}
