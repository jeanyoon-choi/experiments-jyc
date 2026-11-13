// Tinder (Lust, NOTES 1017), painted: the flame wordmark row, a card — the
// portrait, its photo bars, Recently Active, name and age, the job and bio
// that are the hype, interest chips — and the five round buttons over the
// tab bar. Light and dark, as the iOS app at 390 pt.

import { cover, fillRect, font, glyph, paragraph, paragraphHeight, rrect, text, verified, width } from "../../paint/kit";
import type { Ctx, Lang, Mode, Painter } from "../../paint/types";

export type TinderCard = {
  name: string;
  age: number;
  photo: string;
  verified: boolean;
  active: boolean;
  fresh: boolean;
  job: string;
  bio: string;
  distance: number;
  chips: string[];
  pages: number;
  page: number;
};

const PINK = "#fd267a";
const ORANGE = "#ff6036";

const WORDS: Record<Lang, { active: string; fresh: string; away: (n: number) => string }> = {
  en: { active: "Recently Active", fresh: "New here", away: (n) => `${n} miles away` },
  ko: { active: "최근 활동", fresh: "신규", away: (n) => `${n}km 거리에 있음` },
  ja: { active: "最近オンライン", fresh: "新着", away: (n) => `${n}km先` },
  es: { active: "Activo recientemente", fresh: "Nuevo", away: (n) => `a ${n} km` },
};

const ICON = {
  job: "M3.5 7.5h17v12h-17zM9 7.5V5h6v2.5M3.5 12.5h17",
  pin: "M12 21.5s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11zM12 12.5a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  rewind: "M8.5 4.5 4 9l4.5 4.5M4 9h9.5a5.5 5.5 0 0 1 0 11H9",
  boost: "M13.5 2 5 13.5h6L10 22l9-12h-6z",
  shield: "M12 3 4.5 6v6c0 4.5 3.2 8 7.5 9 4.3-1 7.5-4.5 7.5-9V6z",
  sliders: "M4 7h9M17 7h3M4 17h3M11 17h9M15 4.5v5M9 14.5v5",
  explore: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
  likes: "M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4z",
  chat: "M12 3.5c-5 0-9 3.4-9 7.8 0 2.4 1.2 4.5 3.1 6L5.5 21l4.2-2.1c.7.2 1.5.2 2.3.2 5 0 9-3.4 9-7.8S17 3.5 12 3.5z",
};

const colors = (mode: Mode) => (mode === "dark" ? { bg: "#111418", fg: "#ffffff", sub: "#7c8591", line: "#21262e", button: "#1b1f25" } : { bg: "#ffffff", fg: "#21262e", sub: "#7c8591", line: "#e9ebee", button: "#ffffff" });

function brand(ctx: Ctx, x0: number, y0: number, x1: number, y1: number) {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  g.addColorStop(0, PINK);
  g.addColorStop(1, ORANGE);
  return g;
}

function flame(ctx: Ctx, x: number, y: number, size: number, fill: string | CanvasGradient) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.fillStyle = fill;
  ctx.fill(new Path2D("M12 22c4.4 0 7-2.9 7-6.6 0-4.8-4.3-6.8-4.6-11.4-2.6 1.6-4.4 4.6-4 7.6-1.5-.7-2.4-2.1-2.6-3.6C6.3 9.6 5 12 5 15.4 5 19.1 7.6 22 12 22z"));
  ctx.restore();
}

function pill(ctx: Ctx, label: string, x: number, y: number, bg: string, dot?: string) {
  const style = { size: 13, weight: 600 };
  const w = width(ctx, label, style) + (dot ? 30 : 22);
  fillRect(ctx, x, y, w, 26, bg, 13);
  if (dot) {
    ctx.fillStyle = dot;
    ctx.beginPath();
    ctx.arc(x + 13, y + 13, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  text(ctx, label, x + (dot ? 22 : 11), y + 17.5, { ...style, color: "#fff" });
  return w;
}

const card: Painter<TinderCard> = {
  needs: (data) => [data.photo],
  paint(ctx, data, env, h) {
    const local = WORDS[env.lang];
    const w = env.w;
    ctx.save();
    rrect(ctx, 0, 0, w, h, 12);
    ctx.clip();
    cover(ctx, env.image(data.photo), 0, 0, w, h, 0, data.photo);
    const top = ctx.createLinearGradient(0, 0, 0, 60);
    top.addColorStop(0, "rgba(0,0,0,0.25)");
    top.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = top;
    ctx.fillRect(0, 0, w, 60);
    const shade = ctx.createLinearGradient(0, h * 0.45, 0, h);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(0.55, "rgba(0,0,0,0.55)");
    shade.addColorStop(1, "rgba(0,0,0,0.9)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, h * 0.45, w, h * 0.55);
    ctx.restore();

    const gap = 4;
    const bw = (w - 16 - gap * (data.pages - 1)) / data.pages;
    for (let index = 0; index < data.pages; index += 1) fillRect(ctx, 8 + index * (bw + gap), 8, bw, 4, index === data.page ? "#fff" : "rgba(255,255,255,0.35)", 2);

    const left = 16;
    const max = w - 32;
    let y = h - 22 - 26;
    let x = left;
    for (const chip of data.chips) {
      const cw = width(ctx, chip, { size: 13, weight: 600 }) + 22;
      if (x + cw > left + max) break;
      x += pill(ctx, chip, x, y, "rgba(255,255,255,0.22)") + 8;
    }
    const bioStyle = { size: 16, line: 21, lines: 2 };
    const bh = paragraphHeight(ctx, data.bio, max, bioStyle);
    y -= bh + 8;
    paragraph(ctx, data.bio, left, y + 16, max, { ...bioStyle, color: "#fff" });
    y -= 26;
    glyph(ctx, ICON.pin, left, y + 3, 17, "#fff", { line: 2 });
    text(ctx, local.away(data.distance), left + 24, y + 16, { size: 15, color: "#fff" });
    y -= 26;
    glyph(ctx, ICON.job, left, y + 3, 17, "#fff", { line: 2 });
    const job = data.job.length > 34 ? `${data.job.slice(0, 33)}…` : data.job;
    text(ctx, job, left + 24, y + 16, { size: 15, color: "#fff" });
    y -= 14;
    const nw = text(ctx, data.name, left, y, { size: 32, weight: 800, color: "#fff" });
    const aw = text(ctx, String(data.age), left + nw + 10, y, { size: 28, weight: 400, color: "#fff" });
    if (data.verified) verified(ctx, left + nw + aw + 16, y - 24, 24, "#1786ff");
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.beginPath();
    ctx.arc(w - 34, y - 11, 14, 0, Math.PI * 2);
    ctx.stroke();
    glyph(ctx, "M12 18V7M7.5 11.5 12 7l4.5 4.5", w - 46, y - 23, 24, "#fff", { line: 2.4 });
    y -= 54;
    let cx = left;
    if (data.fresh) cx += pill(ctx, local.fresh, cx, y, PINK) + 8;
    if (data.active) pill(ctx, local.active, cx, y, "rgba(30,180,110,0.9)", "#7dffb8");
  },
  hotspots: (_data, env, h) => [{ x: env.w / 2, y: h / 2, kind: "like" }],
};

const top: Painter<Record<string, never>> = {
  paint(ctx, _data, env, h) {
    const c = colors(env.mode);
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    flame(ctx, 14, h - 40, 30, brand(ctx, 14, h - 10, 44, h - 40));
    font(ctx, { size: 30, weight: 800 });
    ctx.fillStyle = brand(ctx, 46, 0, 140, 0);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.letterSpacing = "-1px";
    ctx.fillText("tinder", 46, h - 15);
    ctx.letterSpacing = "0px";
    glyph(ctx, ICON.shield, env.w - 86, h - 40, 26, c.sub, { line: 2 });
    glyph(ctx, ICON.sliders, env.w - 46, h - 40, 26, c.sub, { line: 2.2 });
  },
};

const BUTTONS = [
  { icon: ICON.rewind, color: "#f7b32b", r: 22, size: 22, fill: false },
  { icon: "close", color: "#ff4458", r: 30, size: 30, fill: false },
  { icon: "star", color: "#3da6ff", r: 22, size: 24, fill: true },
  { icon: "heart", color: "#16d88b", r: 30, size: 32, fill: true },
  { icon: ICON.boost, color: "#b667f1", r: 22, size: 22, fill: true },
] as const;

const bottom: Painter<Record<string, never>> = {
  paint(ctx, _data, env, h) {
    const c = colors(env.mode);
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    const cy = 38;
    const xs = [0.14, 0.32, 0.5, 0.68, 0.86].map((k) => env.w * k);
    const scale = ctx.getTransform().a || 1;
    BUTTONS.forEach((button, index) => {
      const cx = xs[index]!;
      ctx.save();
      if (env.mode === "light") {
        ctx.shadowColor = "rgba(0,0,0,0.12)";
        ctx.shadowBlur = 10 * scale;
        ctx.shadowOffsetY = 2 * scale;
      }
      ctx.fillStyle = c.button;
      ctx.beginPath();
      ctx.arc(cx, cy, button.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = button.color;
      ctx.beginPath();
      ctx.arc(cx, cy, button.r - 0.75, 0, Math.PI * 2);
      ctx.stroke();
      glyph(ctx, button.icon, cx - button.size / 2, cy - button.size / 2, button.size, button.color, { fill: button.fill, line: button.icon === "close" ? 3.2 : 2.6 });
    });
    const bar = 80;
    fillRect(ctx, 0, bar, env.w, 0.5, c.line);
    [0.1, 0.3, 0.5, 0.7, 0.9].forEach((k, index) => {
      const x = env.w * k - 13;
      if (index === 0) flame(ctx, x, bar + 6, 26, brand(ctx, x, bar + 32, x + 26, bar + 6));
      else glyph(ctx, [ICON.explore, ICON.likes, ICON.chat, "user"][index - 1]!, x, bar + 6, 26, c.sub, { line: 2 });
    });
    fillRect(ctx, env.w * 0.5 + 8, bar + 4, 9, 9, "#d4af37", 4.5);
    fillRect(ctx, env.w / 2 - 67, h - 13, 134, 5, c.fg, 3);
  },
};

export const TINDER_PAINTERS = {
  "tinder.card": card,
  "tinder.top": top,
  "tinder.bottom": bottom,
};
