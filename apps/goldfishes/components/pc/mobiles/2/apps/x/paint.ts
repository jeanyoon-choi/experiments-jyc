// X (Wrath, NOTES 1017), painted: the bars and a post — a rant, a ratio, a
// quote-post, with or without a picture.

import { avatar, count, cover, fillRect, glyph, paragraph, paragraphHeight, rrect, text, verified, width } from "../../paint/kit";
import type { Painter } from "../../paint/types";
import { ago, ui } from "../../content/voice";

export type XPost = {
  name: string;
  handle: string;
  face: string;
  body: string;
  photo: string;
  replies: number;
  reposts: number;
  likes: number;
  views: number;
  minutes: number;
  verified: boolean;
  quote: { name: string; handle: string; body: string } | null;
  ad: boolean;
};

const colors = (dark: boolean) => (dark ? { bg: "#000", fg: "#e7e9ea", sub: "#71767b", line: "#2f3336" } : { bg: "#fff", fg: "#0f1419", sub: "#536471", line: "#eff3f4" });

const MEDIA_H = 220;

const post: Painter<XPost> = {
  needs: (data) => [data.face, ...(data.photo ? [data.photo] : [])],
  measure(ctx, data, env) {
    const inner = env.w - 76;
    let h = 36 + paragraphHeight(ctx, data.body, inner, { size: 15, line: 20, lines: 7 });
    if (data.quote) h += 20 + 26 + paragraphHeight(ctx, data.quote.body, inner - 24, { size: 15, line: 20, lines: 3 });
    if (data.photo) h += MEDIA_H + 12;
    return h + 46;
  },
  paint(ctx, data, env, h) {
    const c = colors(env.mode === "dark");
    const inner = env.w - 76;
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    avatar(ctx, env.image(data.face), data.name, 12, 12, 42);
    let x = 64;
    const nameWidth = text(ctx, data.name.length > 18 ? `${data.name.slice(0, 17)}…` : data.name, x, 29, { size: 15, weight: 700, color: c.fg });
    x += nameWidth + 4;
    if (data.verified) {
      verified(ctx, x, 16, 17, "#1d9bf0");
      x += 21;
    }
    const meta = data.ad ? `@${data.handle}` : `@${data.handle} · ${ago(env.lang, data.minutes)}`;
    text(ctx, meta.length > 26 ? `${meta.slice(0, 25)}…` : meta, x, 29, { size: 15, color: c.sub });
    glyph(ctx, "more", env.w - 34, 13, 20, c.sub, { line: 2.6 });
    let y = 52;
    y += paragraph(ctx, data.body, 64, y, inner, { size: 15, line: 20, lines: 7, color: c.fg }) - 6;
    if (data.quote) {
      const qh = 26 + paragraphHeight(ctx, data.quote.body, inner - 24, { size: 15, line: 20, lines: 3 }) + 10;
      ctx.strokeStyle = c.line;
      ctx.lineWidth = 1;
      rrect(ctx, 64, y + 10, inner, qh, 16);
      ctx.stroke();
      text(ctx, `${data.quote.name}  @${data.quote.handle}`, 76, y + 32, { size: 14, weight: 700, color: c.fg });
      paragraph(ctx, data.quote.body, 76, y + 54, inner - 24, { size: 15, line: 20, lines: 3, color: c.fg });
      y += qh + 10;
    }
    if (data.photo) {
      cover(ctx, env.image(data.photo), 64, y + 10, inner, MEDIA_H, 16, data.photo);
      ctx.strokeStyle = c.line;
      rrect(ctx, 64, y + 10, inner, MEDIA_H, 16);
      ctx.stroke();
      y += MEDIA_H + 12;
    }
    const row = h - 22;
    const stats: [string, number][] = [
      ["comment", data.replies],
      ["repost", data.reposts],
      ["heart", data.likes],
      [data.ad ? "M3 3h18v18H3z" : "chart", data.views],
    ];
    stats.forEach(([name, value], index) => {
      const sx = 64 + index * ((env.w - 110) / 4);
      glyph(ctx, name, sx, row - 14, 18, c.sub, { line: 1.8 });
      text(ctx, count(value, env.lang), sx + 23, row, { size: 13, color: c.sub });
    });
    glyph(ctx, "share", env.w - 34, row - 15, 18, c.sub, { line: 1.8 });
    if (data.ad) {
      const words = ui(env.lang);
      const w = width(ctx, words.ad, { size: 13 });
      glyph(ctx, "M7 17 17 7M9 7h8v8", env.w - 56 - w, row - 14, 16, c.sub);
      text(ctx, words.ad, env.w - 44 - w, row, { size: 13, color: c.sub });
    }
    fillRect(ctx, 0, h - 0.5, env.w, 0.5, c.line);
  },
  hotspots: (_data, env, h) => [{ x: 64 + 2 * ((env.w - 110) / 4) + 9, y: h - 28, kind: "like" }],
};

const top: Painter<{ face: string }> = {
  needs: (data) => [data.face],
  paint(ctx, data, env, h) {
    const c = colors(env.mode === "dark");
    const words = ui(env.lang);
    fillRect(ctx, 0, 0, env.w, h, env.mode === "dark" ? "rgba(0,0,0,0.92)" : "rgba(255,255,255,0.94)");
    avatar(ctx, env.image(data.face), "me", 16, 60, 32);
    ctx.strokeStyle = c.fg;
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(env.w / 2 - 11, 64);
    ctx.lineTo(env.w / 2 + 11, 88);
    ctx.moveTo(env.w / 2 + 11, 64);
    ctx.lineTo(env.w / 2 - 11, 88);
    ctx.stroke();
    const tabs = [words.forYou, words.following];
    tabs.forEach((tab, index) => {
      const cx = env.w * (0.25 + index * 0.5);
      text(ctx, tab, cx, h - 16, { size: 15, weight: index === 0 ? 700 : 500, color: index === 0 ? c.fg : c.sub, align: "center" });
      if (index === 0) fillRect(ctx, cx - width(ctx, tab, { size: 15, weight: 700 }) / 2, h - 4, width(ctx, tab, { size: 15, weight: 700 }), 4, "#1d9bf0", 2);
    });
    fillRect(ctx, 0, h - 0.5, env.w, 0.5, c.line);
  },
};

const bottom: Painter<Record<string, never>> = {
  paint(ctx, _data, env, h) {
    const c = colors(env.mode === "dark");
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    fillRect(ctx, 0, 0, env.w, 0.5, c.line);
    ["home", "search", "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", "bell", "M3.5 5.5h17v13h-17zM3.5 6l8.5 6.5L20.5 6"].forEach((name, index) => {
      glyph(ctx, name, env.w * (0.1 + index * 0.2) - 13, 12, 26, c.fg, { fill: index === 0 });
    });
    fillRect(ctx, env.w / 2 - 67, h - 13, 134, 5, c.fg, 3);
  },
};

export const X_PAINTERS = {
  "x.post": post,
  "x.top": top,
  "x.bottom": bottom,
};
