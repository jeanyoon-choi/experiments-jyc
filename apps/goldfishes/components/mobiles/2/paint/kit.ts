// Drawing primitives every painter shares: the system face, text that wraps
// (Latin by word, CJK by character), rounded rects, cover-fit photos,
// avatars, counts in the reader's language, and the glyphs every platform
// draws alike (24-unit paths, as the platforms' own icon sets are drawn).

import type { Ctx, Lang, Mode } from "./types";

export const UI = 'system-ui, -apple-system, "SF Pro Text", "Helvetica Neue", "Apple SD Gothic Neo", "Hiragino Sans", sans-serif';
export const DISPLAY = 'system-ui, -apple-system, "SF Pro Display", "Helvetica Neue", "Apple SD Gothic Neo", "Hiragino Sans", sans-serif';
export const SERIF = '"New York", "Iowan Old Style", Georgia, "Apple SD Gothic Neo", serif';
export const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';

export type TextStyle = { size: number; weight?: number; color: string; family?: string; align?: CanvasTextAlign; baseline?: CanvasTextBaseline; spacing?: number };

export function font(ctx: Ctx, { size, weight = 400, family = UI }: Pick<TextStyle, "size" | "weight" | "family">) {
  ctx.font = `${weight} ${size}px ${family}`;
}

export function text(ctx: Ctx, value: string, x: number, y: number, style: TextStyle) {
  font(ctx, style);
  ctx.fillStyle = style.color;
  ctx.textAlign = style.align ?? "left";
  ctx.textBaseline = style.baseline ?? "alphabetic";
  ctx.letterSpacing = `${style.spacing ?? 0}px`;
  ctx.fillText(value, x, y);
  ctx.letterSpacing = "0px";
  return ctx.measureText(value).width;
}

export function width(ctx: Ctx, value: string, style: Pick<TextStyle, "size" | "weight" | "family">) {
  font(ctx, style);
  return ctx.measureText(value).width;
}

const CJK = /[぀-ヿ㐀-鿿가-힯＀-￯]/;

/** Lines of `value` no wider than `max`; the last gets an ellipsis when cut. */
export function wrap(ctx: Ctx, value: string, max: number, style: Pick<TextStyle, "size" | "weight" | "family">, maxLines = 99) {
  font(ctx, style);
  const lines: string[] = [];
  for (const paragraph of value.split("\n")) {
    const tokens = CJK.test(paragraph) ? (paragraph.match(/[぀-ヿ㐀-鿿＀-￯]|[^\s぀-ヿ㐀-鿿＀-￯]+\s*|\s+/g) ?? []) : (paragraph.match(/\S+\s*/g) ?? [""]);
    let line = "";
    for (const token of tokens) {
      const next = line + token;
      if (line && ctx.measureText(next.trimEnd()).width > max) {
        lines.push(line.trimEnd());
        line = token.trimStart();
      } else line = next;
    }
    lines.push(line.trimEnd());
  }
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1]!;
    while (last.length > 1 && ctx.measureText(`${last}…`).width > max) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.trimEnd()}…`;
    return kept;
  }
  return lines;
}

/** Draws wrapped text from its first baseline; returns the height it took. */
export function paragraph(ctx: Ctx, value: string, x: number, y: number, max: number, style: TextStyle & { line?: number; lines?: number }) {
  const lines = wrap(ctx, value, max, style, style.lines);
  const line = style.line ?? style.size * 1.3;
  lines.forEach((content, index) => text(ctx, content, x, y + index * line, style));
  return lines.length * line;
}

export function paragraphHeight(ctx: Ctx, value: string, max: number, style: Pick<TextStyle, "size" | "weight" | "family"> & { line?: number; lines?: number }) {
  return wrap(ctx, value, max, style, style.lines).length * (style.line ?? style.size * 1.3);
}

export function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2));
}

export function fillRect(ctx: Ctx, x: number, y: number, w: number, h: number, color: string, r = 0) {
  ctx.fillStyle = color;
  if (r > 0) {
    rrect(ctx, x, y, w, h, r);
    ctx.fill();
  } else ctx.fillRect(x, y, w, h);
}

export function circle(ctx: Ctx, x: number, y: number, r: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function hashOf(value: string) {
  let h = 2166136261;
  for (let index = 0; index < value.length; index += 1) h = Math.imul(h ^ value.charCodeAt(index), 16777619);
  return h >>> 0;
}

/** A photograph cover-fitted into a rect (clipped, rounded). Without it, a soft gradient keyed to `fallback`. */
export function cover(ctx: Ctx, image: ImageBitmap | null, x: number, y: number, w: number, h: number, r = 0, fallback = "") {
  ctx.save();
  rrect(ctx, x, y, w, h, r);
  ctx.clip();
  if (image) {
    const scale = Math.max(w / image.width, h / image.height);
    const iw = image.width * scale;
    const ih = image.height * scale;
    ctx.drawImage(image, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  } else {
    const hue = hashOf(fallback) % 360;
    const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
    gradient.addColorStop(0, `hsl(${hue} 30% 70%)`);
    gradient.addColorStop(1, `hsl(${(hue + 40) % 360} 35% 45%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, w, h);
  }
  ctx.restore();
}

export function avatar(ctx: Ctx, image: ImageBitmap | null, name: string, x: number, y: number, size: number, ring?: string) {
  if (ring) {
    ctx.lineWidth = 2;
    ctx.strokeStyle = ring;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2 + 2.5, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (image) cover(ctx, image, x, y, size, size, size / 2);
  else {
    const hue = hashOf(name) % 360;
    circle(ctx, x + size / 2, y + size / 2, size / 2, `hsl(${hue} 45% 55%)`);
    text(ctx, (name.trim()[0] ?? "?").toUpperCase(), x + size / 2, y + size / 2 + size * 0.17, { size: size * 0.46, weight: 600, color: "#fff", align: "center" });
  }
}

/** 1,234 → 1.2K / 1.2천 / 1,234 ; 12,345 → 12K / 1.2만 / 1.2万 */
export function count(value: number, lang: Lang) {
  const round = (n: number) => (n >= 100 ? Math.round(n).toString() : (Math.round(n * 10) / 10).toString());
  if (lang === "ko" || lang === "ja") {
    const man = lang === "ko" ? "만" : "万";
    const eok = lang === "ko" ? "억" : "億";
    if (value >= 1e8) return `${round(value / 1e8)}${eok}`;
    if (value >= 1e4) return `${round(value / 1e4)}${man}`;
    if (value >= 1e3 && lang === "ko") return `${round(value / 1e3)}천`;
    return value.toLocaleString("en-US");
  }
  const sep = lang === "es" ? " mil" : "K";
  if (value >= 1e6) return `${round(value / 1e6)}${lang === "es" ? " M" : "M"}`;
  if (value >= 1e4) return `${round(value / 1e3)}${sep}`;
  if (value >= 1e3) return lang === "es" ? `${round(value / 1e3)} mil` : `${round(value / 1e3)}K`;
  return String(value);
}

export type Theme = { bg: string; fg: string; sub: string; line: string; card: string; fill: string };

export function theme(mode: Mode): Theme {
  return mode === "dark"
    ? { bg: "#000000", fg: "#f5f5f5", sub: "#8e8e93", line: "#262626", card: "#121212", fill: "#1c1c1e" }
    : { bg: "#ffffff", fg: "#0f0f0f", sub: "#737373", line: "#dbdbdb", card: "#ffffff", fill: "#efefef" };
}

/** 24-unit glyphs, stroked unless `fill`. */
export const GLYPH = {
  heart: "M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.3 4.5 6.9 4.5c2.2 0 3.6 1.2 5.1 3 1.5-1.8 2.9-3 5.1-3 3.6 0 5.5 3.5 4.2 6.8C19.5 15.9 12 20.5 12 20.5z",
  comment: "M20.7 16.9A9.5 9.5 0 1 0 17 20.6L21.5 21.5z",
  send: "M22 3 9.2 10.2M22 3l-7 18-3.8-8.8L2.5 8.7z",
  bookmark: "M19.5 21 12 14.6 4.5 21V3.5h15z",
  repost: "M4 9.5V7.5a3 3 0 0 1 3-3h12.5M16.5 1.5l3 3-3 3M20 14.5v2a3 3 0 0 1-3 3H4.5M7.5 22.5l-3-3 3-3",
  share: "M12 3v12M7.5 7.5 12 3l4.5 4.5M5 12v7.5a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V12",
  more: "M5 12h.01M12 12h.01M19 12h.01",
  home: "M3 10.5 12 3l9 7.5V21h-6v-6.5H9V21H3z",
  search: "M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15zM16 16l5.5 5.5",
  plus: "M12 5v14M5 12h14",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l1.8 2.2H4.2zM10 21h4",
  user: "M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zM3.5 21.5c.8-4.2 4.2-6.5 8.5-6.5s7.7 2.3 8.5 6.5",
  play: "M7 4.5v15l12.5-7.5z",
  reels: "M3.5 3.5h17v17h-17zM3.5 8.5h17M9 3.5l2.5 5M15 3.5l2.5 5M10 12v5.5l4.5-2.75z",
  star: "M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4L2.8 9.5l6.4-.8z",
  check: "M5 12.5l4.5 4.5L19 7.5",
  close: "M6 6l12 12M18 6 6 18",
  back: "M15 4.5 7.5 12l7.5 7.5",
  thumb: "M7 10.5V21H4V10.5zM7 10.5l4.5-8c1.7 0 2.7 1.2 2.4 2.9L13.3 9h6.1c1.3 0 2.2 1.2 1.9 2.4l-2 7.5c-.3 1.2-1.3 2.1-2.5 2.1H7",
  chart: "M3 20.5h18M5.5 16.5l4.5-5 3.5 3 6-7.5",
  bag: "M5 7.5h14l-1 13.5H6zM9 7.5V6a3 3 0 0 1 6 0v1.5",
  fire: "M12 22c4.4 0 7-2.9 7-6.6 0-4.8-4.3-6.8-4.6-11.4-2.6 1.6-4.4 4.6-4 7.6-1.5-.7-2.4-2.1-2.6-3.6C6.3 9.6 5 12 5 15.4 5 19.1 7.6 22 12 22z",
  verified: "M12 1.8l2.3 1.7 2.8-.2.9 2.7 2.4 1.5-.6 2.8 1.2 2.6-2 2 .1 2.8-2.7.8-1.4 2.5-2.8-.5L12 22.2l-2.2-1.7-2.8.5-1.4-2.5-2.7-.8.1-2.8-2-2 1.2-2.6-.6-2.8 2.4-1.5.9-2.7 2.8.2z",
} as const;

const paths = new Map<string, Path2D>();
function path(d: string) {
  let value = paths.get(d);
  if (!value) paths.set(d, (value = new Path2D(d)));
  return value;
}

export function glyph(ctx: Ctx, name: keyof typeof GLYPH | string, x: number, y: number, size: number, color: string, { fill = false, line = 1.9 } = {}) {
  const d = name in GLYPH ? GLYPH[name as keyof typeof GLYPH] : name;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  if (fill) {
    ctx.fillStyle = color;
    ctx.fill(path(d));
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = line;
    ctx.stroke(path(d));
  }
  ctx.restore();
}

/** The blue verified seal with its white check. */
export function verified(ctx: Ctx, x: number, y: number, size: number, color = "#0095f6") {
  glyph(ctx, "verified", x, y, size, color, { fill: true });
  glyph(ctx, "M7.5 12.3l3 3 6-6.3", x, y, size, "#fff", { line: 2.6 });
}
