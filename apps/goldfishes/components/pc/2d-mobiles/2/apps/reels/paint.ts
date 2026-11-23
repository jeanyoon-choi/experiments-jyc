// Instagram Reels (Sloth, NOTES 1017), painted: one full-screen reel — the
// frame, the Reels title, the outlined right rail ending in the audio tile,
// the poster's row with Follow, the caption, its audio — and Instagram's
// tab bar in dark. Sizes follow the iOS app at 390 × 844 pt.

import { ui } from "../../content/voice";
import { avatar, count, cover, DISPLAY, fillRect, glyph, rrect, text, verified, width, wrap } from "../../paint/kit";
import type { Ctx, Lang, Painter } from "../../paint/types";

export type ReelsClip = {
  handle: string;
  face: string;
  photo: string;
  caption: string;
  sound: string;
  likes: number;
  comments: number;
  reposts: number;
  shares: number;
  verified: boolean;
  ad: boolean;
  followed: boolean;
  progress: number;
};

const BAR = 83;
const RAIL = 360;
const RAIL_Y = { like: 452, comment: 518, repost: 584, share: 650, more: 704, audio: 738 };

const WORDS: Record<Lang, { audio: string; learn: string }> = {
  en: { audio: "Original audio", learn: "Learn more" },
  ko: { audio: "오리지널 오디오", learn: "더 알아보기" },
  ja: { audio: "オリジナル音源", learn: "詳しくはこちら" },
  es: { audio: "Audio original", learn: "Más información" },
};

const CAMERA = "M3 8h3.5L8 5.5h8L17.5 8H21v11.5H3zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z";
const NOTE = "M9 17.5V5.5l11-2v12M9 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM20 15.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z";

function shadow(ctx: Ctx, on: boolean) {
  const scale = ctx.getTransform().a || 1;
  ctx.shadowColor = on ? "rgba(0,0,0,0.3)" : "transparent";
  ctx.shadowBlur = on ? 4 * scale : 0;
  ctx.shadowOffsetY = 0;
}

function fade(ctx: Ctx, y0: number, y1: number, alpha: number, w: number) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, Math.min(y0, y1), w, Math.abs(y1 - y0));
}

function rail(ctx: Ctx, icon: string, cy: number, label: string) {
  glyph(ctx, icon, RAIL - 14, cy - 16, 28, "#fff", { line: 2 });
  if (label) text(ctx, label, RAIL, cy + 25, { size: 12.5, weight: 600, color: "#fff", align: "center" });
}

const clip: Painter<ReelsClip> = {
  needs: (data) => [data.face, data.photo],
  paint(ctx, data, env, h) {
    const words = ui(env.lang);
    const local = WORDS[env.lang];
    const w = env.w;
    const bottom = h - BAR;
    const photo = env.image(data.photo);
    const face = env.image(data.face);
    fillRect(ctx, 0, 0, w, h, "#000");
    cover(ctx, photo, 0, 0, w, bottom, 0, data.photo);
    fade(ctx, 0, 140, 0.35, w);
    fade(ctx, bottom, bottom - 280, 0.6, w);

    shadow(ctx, true);
    const tw = text(ctx, "Reels", 16, 90, { size: 24, weight: 700, color: "#fff", family: DISPLAY });
    glyph(ctx, "M6 9.5l6 6 6-6", 22 + tw, 74, 18, "#fff", { line: 2.6 });
    glyph(ctx, CAMERA, w - 44, 66, 28, "#fff", { line: 2 });

    rail(ctx, "heart", RAIL_Y.like, count(data.likes, env.lang));
    rail(ctx, "comment", RAIL_Y.comment, count(data.comments, env.lang));
    rail(ctx, "repost", RAIL_Y.repost, count(data.reposts, env.lang));
    rail(ctx, "send", RAIL_Y.share, count(data.shares, env.lang));
    glyph(ctx, "more", RAIL - 12, RAIL_Y.more - 12, 24, "#fff", { line: 3 });
    shadow(ctx, false);
    cover(ctx, face, RAIL - 14, RAIL_Y.audio - 14, 28, 28, 7, data.face);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    rrect(ctx, RAIL - 14, RAIL_Y.audio - 14, 28, 28, 7);
    ctx.stroke();

    const left = 16;
    const max = w - left - 72;
    let y = bottom - 18;
    shadow(ctx, true);
    glyph(ctx, NOTE, left, y - 11, 13, "#fff", { line: 2.2 });
    const sound = data.sound || `${data.handle} · ${local.audio}`;
    text(ctx, wrap(ctx, sound, max - 20, { size: 13 }, 1)[0] ?? sound, left + 19, y, { size: 13, color: "#fff" });
    shadow(ctx, false);
    y -= 24;
    if (data.ad) {
      y -= 38;
      fillRect(ctx, left, y, max, 38, "#0095f6", 8);
      text(ctx, local.learn, left + 12, y + 24, { size: 14, weight: 600, color: "#fff" });
      glyph(ctx, "M9 5l7 7-7 7", left + max - 30, y + 8, 22, "#fff", { line: 2.4 });
      y -= 14;
    }
    shadow(ctx, true);
    const line = wrap(ctx, data.caption, max - 40, { size: 14 }, 1)[0] ?? "";
    const cw = text(ctx, line, left, y, { size: 14, color: "#fff" });
    if (line.endsWith("…")) text(ctx, words.seeMore, left + cw + 4, y, { size: 14, color: "rgba(255,255,255,0.7)" });
    y -= 30;
    shadow(ctx, false);
    avatar(ctx, face, data.handle, left, y - 22, 32);
    shadow(ctx, true);
    const ny = data.ad ? y - 9 : y - 1;
    const short = data.handle.length > 18 ? `${data.handle.slice(0, 17)}…` : data.handle;
    let nx = left + 42 + text(ctx, short, left + 42, ny, { size: 14, weight: 600, color: "#fff" });
    if (data.ad) text(ctx, words.sponsored, left + 42, y + 8, { size: 12, color: "#fff" });
    shadow(ctx, false);
    if (data.verified) {
      verified(ctx, nx + 4, ny - 11.5, 13);
      nx += 17;
    }
    if (!data.followed) {
      const fw = width(ctx, words.follow, { size: 13, weight: 600 }) + 20;
      ctx.strokeStyle = "rgba(255,255,255,0.75)";
      ctx.lineWidth = 1;
      rrect(ctx, nx + 10, y - 20, fw, 28, 8);
      ctx.stroke();
      text(ctx, words.follow, nx + 10 + fw / 2, y - 1, { size: 13, weight: 600, color: "#fff", align: "center" });
    }

    fillRect(ctx, 0, bottom - 2, w, 2, "rgba(255,255,255,0.25)");
    fillRect(ctx, 0, bottom - 2, w * data.progress, 2, "#fff");
    fillRect(ctx, 0, bottom, w, BAR, "#000");
  },
  hotspots: () => [{ x: RAIL, y: RAIL_Y.like - 2, kind: "like" }],
};

const bottom: Painter<{ face: string }> = {
  needs: (data) => [data.face],
  paint(ctx, data, env, h) {
    fillRect(ctx, 0, 0, env.w, h, "#000");
    fillRect(ctx, 0, 0, env.w, 0.5, "#262626");
    const xs = [0.1, 0.3, 0.5, 0.7, 0.9].map((k) => env.w * k - 13);
    glyph(ctx, "home", xs[0]!, 12, 26, "#f5f5f5");
    glyph(ctx, "search", xs[1]!, 12, 26, "#f5f5f5");
    glyph(ctx, "M4 4h16v16H4zM12 8v8M8 12h8", xs[2]!, 12, 26, "#f5f5f5");
    glyph(ctx, "reels", xs[3]!, 12, 26, "#f5f5f5", { line: 2.8 });
    avatar(ctx, env.image(data.face), "me", xs[4]! - 1, 11, 28);
    fillRect(ctx, env.w / 2 - 67, h - 13, 134, 5, "#f5f5f5", 3);
  },
};

export const REELS_PAINTERS = {
  "reels.clip": clip,
  "reels.bottom": bottom,
};
