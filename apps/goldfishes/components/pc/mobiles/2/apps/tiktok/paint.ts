// TikTok (Sloth, NOTES 1017), painted: one full-screen clip — the frame,
// the For You tabs, the right rail with its spinning disc, the caption and
// its sound — and the black tab bar under it. Sizes follow the iOS app at
// 390 × 844 pt.

import { ago, ui } from "../../content/voice";
import { avatar, circle, count, cover, DISPLAY, fillRect, glyph, paragraphHeight, rrect, text, verified, width, wrap } from "../../paint/kit";
import type { Ctx, Lang, Painter } from "../../paint/types";

export type TikTokClip = {
  handle: string;
  face: string;
  photo: string;
  caption: string;
  sound: string;
  likes: number;
  comments: number;
  saves: number;
  shares: number;
  minutes: number;
  verified: boolean;
  ad: boolean;
  live: boolean;
  overlay: string;
  letterbox: boolean;
  progress: number;
};

const BAR = 83;
const RAIL = 356;
const RED = "#fe2c55";
const CYAN = "#25f4ee";

const WORDS: Record<Lang, { forYou: string; learn: string; sound: string; ago: (value: string) => string; tabs: [string, string, string, string] }> = {
  en: { forYou: "For You", learn: "Learn more", sound: "original sound", ago: (v) => `${v} ago`, tabs: ["Home", "Friends", "Inbox", "Profile"] },
  ko: { forYou: "추천", learn: "자세히 알아보기", sound: "오리지널 사운드", ago: (v) => `${v} 전`, tabs: ["홈", "친구", "받은 편지함", "프로필"] },
  ja: { forYou: "おすすめ", learn: "詳しくはこちら", sound: "オリジナル楽曲", ago: (v) => `${v}前`, tabs: ["ホーム", "友達", "受信箱", "プロフィール"] },
  es: { forYou: "Para ti", learn: "Más información", sound: "sonido original", ago: (v) => `hace ${v.trim()}`, tabs: ["Inicio", "Amigos", "Bandeja", "Perfil"] },
};

const ICON = {
  comment: "M12 3C6.5 3 2.5 6.6 2.5 11.1c0 2.6 1.3 4.9 3.4 6.4L5.3 21l4-1.9c.9.2 1.8.3 2.7.3 5.5 0 9.5-3.6 9.5-8.3S17.5 3 12 3z",
  share: "M13.5 4v4.3C7 9.2 3.6 13.6 3 20c2.4-3.4 5.7-5 10.5-5v4.3L21.5 11.6z",
  note: "M9 17.5V5.5l11-2v12M9 17.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0zM20 15.5a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z",
  live: "M3.5 8h17v12h-17zM8.5 3.5 12 7.5l3.5-4",
  friends: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c.5-3.6 3.1-5.5 6.5-5.5s6 1.9 6.5 5.5M16 11a3 3 0 1 0 0-6M17.5 14.6c2.3.5 3.7 2.3 4 5.4",
  inbox: "M4 4.5h16v11.5H10l-4.5 3.5V16H4z",
};

function shadow(ctx: Ctx, on: boolean) {
  const scale = ctx.getTransform().a || 1;
  ctx.shadowColor = on ? "rgba(0,0,0,0.35)" : "transparent";
  ctx.shadowBlur = on ? 4 * scale : 0;
  ctx.shadowOffsetY = on ? 1 * scale : 0;
}

function frame(ctx: Ctx, image: ImageBitmap | null, data: TikTokClip, w: number, h: number) {
  fillRect(ctx, 0, 0, w, h, "#000");
  if (!data.letterbox || !image) {
    cover(ctx, image, 0, 0, w, h - BAR, 0, data.photo);
    return;
  }
  ctx.save();
  ctx.filter = "blur(28px) brightness(0.55)";
  cover(ctx, image, -40, -40, w + 80, h - BAR + 80, 0, data.photo);
  ctx.restore();
  fillRect(ctx, 0, 0, w, h - BAR, "rgba(0,0,0,0.3)");
  const fh = Math.min((w * image.height) / image.width, h - BAR - 220);
  cover(ctx, image, 0, (h - BAR - fh) / 2 - 30, w, fh, 0, data.photo);
}

function gradient(ctx: Ctx, y0: number, y1: number, alpha: number, w: number) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, `rgba(0,0,0,${alpha})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, Math.min(y0, y1), w, Math.abs(y1 - y0));
}

function sticker(ctx: Ctx, value: string, cx: number, cy: number) {
  const style = { size: 17, weight: 600, family: DISPLAY };
  const lines = wrap(ctx, value, 270, style, 3);
  const line = 24;
  const top = cy - (lines.length * line) / 2;
  lines.forEach((content, index) => {
    const lw = width(ctx, content, style) + 16;
    fillRect(ctx, cx - lw / 2, top + index * line - 2, lw, line + 4, "#fff", 7);
  });
  lines.forEach((content, index) => text(ctx, content, cx, top + index * line + 17, { ...style, color: "#000", align: "center" }));
}

function disc(ctx: Ctx, image: ImageBitmap | null, name: string, cx: number, cy: number) {
  const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 23);
  g.addColorStop(0, "#3a3a3a");
  g.addColorStop(0.6, "#161616");
  g.addColorStop(1, "#2b2b2b");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, 23, 0, Math.PI * 2);
  ctx.fill();
  avatar(ctx, image, name, cx - 13, cy - 13, 26);
  glyph(ctx, ICON.note, cx - 40, cy - 34, 14, "rgba(255,255,255,0.8)", { line: 2 });
}

function railItem(ctx: Ctx, icon: string, cy: number, size: number, label: string, color = "#fff") {
  shadow(ctx, true);
  glyph(ctx, icon, RAIL - size / 2, cy - size / 2, size, color, { fill: true });
  shadow(ctx, false);
  if (icon === ICON.comment) [-5, 0, 5].forEach((dx) => circle(ctx, RAIL + dx, cy - 1, 1.6, "rgba(0,0,0,0.75)"));
  shadow(ctx, true);
  text(ctx, label, RAIL, cy + size / 2 + 16, { size: 13, weight: 600, color: "#fff", align: "center" });
  shadow(ctx, false);
}

const RAIL_Y = { avatar: 382, like: 462, comment: 532, save: 600, share: 668, disc: 728 };

const clip: Painter<TikTokClip> = {
  needs: (data) => [data.face, data.photo],
  paint(ctx, data, env, h) {
    const words = ui(env.lang);
    const local = WORDS[env.lang];
    const w = env.w;
    const bottom = h - BAR;
    frame(ctx, env.image(data.photo), data, w, h);
    gradient(ctx, 0, 150, 0.4, w);
    gradient(ctx, bottom, bottom - 300, 0.55, w);
    if (data.overlay) sticker(ctx, data.overlay, w / 2, 300);

    shadow(ctx, true);
    glyph(ctx, ICON.live, 16, 64, 26, "#fff", { line: 2 });
    text(ctx, "LIVE", 29, 82, { size: 7, weight: 800, color: "#fff", align: "center" });
    const tabs = [words.following, local.forYou];
    const fw = width(ctx, local.forYou, { size: 17, weight: 700 });
    const gap = 26;
    const total = width(ctx, words.following, { size: 17, weight: 600 }) + gap + fw;
    let tx = w / 2 - total / 2;
    tabs.forEach((tab, index) => {
      const tw = text(ctx, tab, tx, 84, { size: 17, weight: index === 1 ? 700 : 600, color: index === 1 ? "#fff" : "rgba(255,255,255,0.65)" });
      if (index === 1) fillRect(ctx, tx + tw / 2 - 15, 93, 30, 2.5, "#fff", 1.5);
      tx += tw + gap;
    });
    glyph(ctx, "search", w - 42, 63, 26, "#fff", { line: 2.4 });
    shadow(ctx, false);

    const face = env.image(data.face);
    const ay = RAIL_Y.avatar;
    if (data.live) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = RED;
      ctx.beginPath();
      ctx.arc(RAIL, ay, 27, 0, Math.PI * 2);
      ctx.stroke();
    } else circle(ctx, RAIL, ay, 25, "#fff");
    avatar(ctx, face, data.handle, RAIL - 24, ay - 24, 48);
    if (data.live) {
      fillRect(ctx, RAIL - 18, ay + 18, 36, 15, RED, 4);
      text(ctx, words.live, RAIL, ay + 29.5, { size: 9.5, weight: 800, color: "#fff", align: "center" });
    } else if (!data.ad) {
      circle(ctx, RAIL, ay + 24, 10, RED);
      glyph(ctx, "plus", RAIL - 7, ay + 17, 14, "#fff", { line: 3 });
    }
    railItem(ctx, "heart", RAIL_Y.like, 38, count(data.likes, env.lang));
    railItem(ctx, ICON.comment, RAIL_Y.comment, 34, count(data.comments, env.lang));
    railItem(ctx, "bookmark", RAIL_Y.save, 31, count(data.saves, env.lang));
    railItem(ctx, ICON.share, RAIL_Y.share, 32, count(data.shares, env.lang));
    disc(ctx, face, data.handle, RAIL, RAIL_Y.disc);

    const left = 12;
    const max = w - left - 86;
    let y = bottom - 14;
    if (data.ad) {
      y -= 40;
      fillRect(ctx, left, y, max + 20, 40, RED, 4);
      text(ctx, local.learn, left + 14, y + 25.5, { size: 15, weight: 600, color: "#fff" });
      glyph(ctx, "M9 5l7 7-7 7", left + max - 6, y + 9, 22, "#fff", { line: 2.4 });
      y -= 14;
    }
    shadow(ctx, true);
    glyph(ctx, ICON.note, left, y - 13, 15, "#fff", { line: 2 });
    const sound = data.sound.includes(" - ") ? data.sound : `${local.sound} - ${data.sound}`;
    const shown = wrap(ctx, `${sound}   ${sound}`, max - 24, { size: 14 }, 1)[0] ?? sound;
    text(ctx, shown, left + 22, y, { size: 14, color: "#fff" });
    y -= 28;
    const style = { size: 15, line: 20, lines: 2 };
    const lines = wrap(ctx, data.caption, max, style, 2);
    const ch = paragraphHeight(ctx, data.caption, max, style);
    lines.forEach((content, index) => text(ctx, content, left, y - ch + 20 + index * 20, { size: 15, color: "#fff" }));
    y -= ch + 10;
    const nw = text(ctx, data.handle, left, y, { size: 17, weight: 700, color: "#fff" });
    let nx = left + nw + 5;
    if (data.verified) {
      shadow(ctx, false);
      verified(ctx, nx, y - 14, 16, "#20d5ec");
      shadow(ctx, true);
      nx += 20;
    }
    const meta = data.ad ? words.sponsored : data.live ? words.live : `· ${data.minutes < 1 ? words.now : local.ago(ago(env.lang, data.minutes))}`;
    text(ctx, meta, nx + 2, y, { size: 14, color: "rgba(255,255,255,0.75)" });
    shadow(ctx, false);

    fillRect(ctx, 0, bottom - 2, w, 2, "rgba(255,255,255,0.22)");
    fillRect(ctx, 0, bottom - 2, w * data.progress, 2, "rgba(255,255,255,0.9)");
    fillRect(ctx, 0, bottom, w, BAR, "#000");
  },
  hotspots: () => [
    { x: RAIL, y: RAIL_Y.like, kind: "like" },
    { x: RAIL, y: RAIL_Y.avatar + 24, kind: "follow" },
  ],
};

const bottom: Painter<Record<string, never>> = {
  paint(ctx, _data, env, h) {
    const local = WORDS[env.lang];
    fillRect(ctx, 0, 0, env.w, h, "#000");
    fillRect(ctx, 0, 0, env.w, 0.5, "rgba(255,255,255,0.12)");
    const icons = ["home", ICON.friends, "", ICON.inbox, "user"];
    const labels = [local.tabs[0], local.tabs[1], "", local.tabs[2], local.tabs[3]];
    icons.forEach((icon, index) => {
      const cx = env.w * (0.1 + index * 0.2);
      if (!icon) return;
      const color = index === 0 ? "#fff" : "rgba(255,255,255,0.72)";
      glyph(ctx, icon, cx - 12, 7, 24, color, { fill: index === 0, line: 1.8 });
      text(ctx, labels[index]!, cx, 44, { size: 10, weight: index === 0 ? 600 : 500, color, align: "center" });
    });
    const cx = env.w / 2;
    fillRect(ctx, cx - 22 - 3.5, 8, 44, 30, CYAN, 9);
    fillRect(ctx, cx - 22 + 3.5, 8, 44, 30, RED, 9);
    fillRect(ctx, cx - 20, 8, 40, 30, "#fff", 8);
    glyph(ctx, "plus", cx - 9, 14, 18, "#000", { line: 3.2 });
    const badge = env.w * 0.7 + 7;
    rrect(ctx, badge, 3, 19, 15, 7.5);
    ctx.fillStyle = RED;
    ctx.fill();
    text(ctx, "12", badge + 9.5, 14.5, { size: 10, weight: 700, color: "#fff", align: "center" });
    fillRect(ctx, env.w / 2 - 67, h - 13, 134, 5, "#fff", 3);
  },
};

export const TIKTOK_PAINTERS = {
  "tiktok.clip": clip,
  "tiktok.bottom": bottom,
};
