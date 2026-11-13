// Facebook (Envy, NOTES 1017), painted: the bars, the composer, the stories
// row, and a post — a photo, a shared link, an aunt's coloured-background
// status, or Sponsored — under its reactions and its Like / Comment / Share.

import { avatar, circle, count, cover, fillRect, glyph, paragraph, paragraphHeight, rrect, text, width } from "../../paint/kit";
import type { Ctx, Lang, Painter } from "../../paint/types";
import { ago, ui } from "../../content/voice";

export type FacebookPost = {
  kind: "photo" | "link" | "aunt" | "text";
  name: string;
  face: string;
  /** "is feeling blessed.", "shared a post." — after the name. */
  doing: string;
  minutes: number;
  body: string;
  photo: string;
  link: { domain: string; title: string } | null;
  sponsored: boolean;
  cta: string;
  reactions: number;
  comments: number;
  shares: number;
  /** Which faces the reaction cluster shows: 0 like, 1 love, 2 haha, 3 wow, 4 care. */
  faces: number[];
  reactor: string;
  /** Hue of an aunt's background. */
  hue: number;
};

const colors = (dark: boolean) =>
  dark
    ? { bg: "#242526", band: "#18191a", fg: "#e4e6eb", sub: "#b0b3b8", line: "#3e4042", fill: "#3a3b3c", link: "#3a3b3c", blue: "#2d88ff", word: "#e4e6eb" }
    : { bg: "#ffffff", band: "#c9ccd1", fg: "#050505", sub: "#65676b", line: "#ced0d4", fill: "#e4e6eb", link: "#f0f2f5", blue: "#0866ff", word: "#0866ff" };

const BAND = 6;
const HEAD = 62;
const BODY = { size: 15, line: 20, lines: 4 } as const;
const STATS = 40;
const ACTIONS = 44;

const PUBLIC = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z";
const MESSENGER = "M12 2.8c-5.2 0-9.2 3.8-9.2 8.9 0 2.7 1.1 5 2.9 6.6v3.1l2.9-1.6c1 .3 2.2.5 3.4.5 5.2 0 9.2-3.8 9.2-8.9S17.2 2.8 12 2.8zM6.8 14.6l3-4.6 2.6 2 3.8-2.3-3 4.6-2.6-2z";

function mediaHeight(data: FacebookPost, w: number) {
  if (data.kind === "photo") return Math.round(w * 1.05);
  if (data.kind === "link") return Math.round(w * 0.52) + (data.sponsored ? 74 : 66);
  if (data.kind === "aunt") return 330;
  return 0;
}

const hasBody = (data: FacebookPost) => data.kind !== "aunt" && data.body.length > 0;

function reactionFace(ctx: Ctx, index: number, x: number, y: number, size: number, ring: string) {
  const r = size / 2;
  circle(ctx, x + r, y + r, r + 1.5, ring);
  const fills = ["#0866ff", "#f33e58", "#f7b125", "#f7b125", "#f7b125"];
  if (index === 0) {
    const gradient = ctx.createLinearGradient(x, y, x, y + size);
    gradient.addColorStop(0, "#18afff");
    gradient.addColorStop(1, "#0062df");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
    ctx.fill();
    glyph(ctx, "thumb", x + size * 0.2, y + size * 0.18, size * 0.6, "#fff", { fill: true });
    return;
  }
  circle(ctx, x + r, y + r, r, fills[index]!);
  if (index === 1) {
    glyph(ctx, "heart", x + size * 0.2, y + size * 0.22, size * 0.6, "#fff", { fill: true });
    return;
  }
  ctx.fillStyle = "#65390a";
  ctx.beginPath();
  ctx.arc(x + r * 0.65, y + r * 0.78, r * 0.13, 0, Math.PI * 2);
  ctx.arc(x + r * 1.35, y + r * 0.78, r * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  if (index === 3) ctx.ellipse(x + r, y + r * 1.38, r * 0.2, r * 0.28, 0, 0, Math.PI * 2);
  else ctx.arc(x + r, y + r * 1.1, r * 0.48, 0, Math.PI);
  ctx.fill();
  if (index === 4) glyph(ctx, "heart", x + size * 0.3, y + size * 0.48, size * 0.42, "#f33e58", { fill: true });
}

const ACTION_WORDS: Record<Lang, { more: string; learn: string }> = {
  en: { more: "See more", learn: "Learn more" },
  ko: { more: "더 보기", learn: "더 알아보기" },
  ja: { more: "続きを読む", learn: "詳しくはこちら" },
  es: { more: "Ver más", learn: "Más información" },
};

function statsLine(lang: Lang, reactor: string, reactions: number) {
  const rest = count(Math.max(1, reactions - 1), lang);
  if (lang === "ko") return `${reactor}님 외 ${rest}명`;
  if (lang === "ja") return `${reactor}さん、他${rest}人`;
  if (lang === "es") return `${reactor} y ${rest} personas más`;
  return `${reactor} and ${rest} others`;
}

function talkLine(lang: Lang, comments: number, shares: number) {
  const c = count(comments, lang);
  const s = count(shares, lang);
  if (lang === "ko") return `댓글 ${c}개  공유 ${s}회`;
  if (lang === "ja") return `コメント${c}件  シェア${s}件`;
  if (lang === "es") return `${c} comentarios  ${s} veces compartido`;
  return `${c} comments  ${s} shares`;
}

const post: Painter<FacebookPost> = {
  needs: (data) => [data.face, ...(data.photo ? [data.photo] : [])],
  measure(ctx, data, env) {
    const body = hasBody(data) ? paragraphHeight(ctx, data.body, env.w - 24, BODY) + 10 : 0;
    return HEAD + body + mediaHeight(data, env.w) + STATS + ACTIONS + BAND;
  },
  paint(ctx, data, env, h) {
    const c = colors(env.mode === "dark");
    const words = ui(env.lang);
    const local = ACTION_WORDS[env.lang];
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    avatar(ctx, env.image(data.face), data.name, 12, 12, 40);
    const nameWidth = text(ctx, data.name, 62, 30, { size: 15, weight: 600, color: c.fg });
    if (data.doing) {
      const room = env.w - 62 - nameWidth - 86;
      let doing = data.doing;
      while (doing.length > 2 && width(ctx, doing, { size: 15 }) > room) doing = doing.slice(0, -1);
      text(ctx, doing === data.doing ? doing : `${doing.trimEnd()}…`, 62 + nameWidth + (/^[님さ]/.test(doing) ? 0 : 4), 30, { size: 15, color: c.fg });
    }
    const meta = data.sponsored ? words.sponsored : ago(env.lang, data.minutes);
    const metaWidth = text(ctx, `${meta} · `, 62, 48, { size: 13, color: c.sub });
    glyph(ctx, PUBLIC, 62 + metaWidth, 37.5, 12, c.sub, { line: 2 });
    glyph(ctx, "more", env.w - 74, 14, 22, c.sub, { line: 2.8 });
    glyph(ctx, "close", env.w - 38, 15, 20, c.sub, { line: 2.2 });
    let y = HEAD;
    if (hasBody(data)) {
      const used = paragraph(ctx, data.body, 12, y + 14, env.w - 24, { ...BODY, color: c.fg });
      if (paragraphHeight(ctx, data.body, env.w - 24, { size: 15, line: 20 }) > used) {
        const last = y + 14 + used - 20;
        const label = `… ${local.more}`;
        const lw = width(ctx, label, { size: 15, weight: 600 });
        fillRect(ctx, env.w - 12 - lw - 4, last - 16, lw + 4, 20, c.bg);
        text(ctx, label, env.w - 12 - lw, last, { size: 15, weight: 600, color: c.sub });
      }
      y += used + 10;
    }
    const mh = mediaHeight(data, env.w);
    if (data.kind === "photo") cover(ctx, env.image(data.photo), 0, y, env.w, mh, 0, data.photo);
    if (data.kind === "link" && data.link) {
      const ih = Math.round(env.w * 0.52);
      cover(ctx, env.image(data.photo), 0, y, env.w, ih, 0, data.photo);
      fillRect(ctx, 0, y + ih, env.w, mh - ih, c.link);
      const room = data.sponsored ? env.w - 150 : env.w - 24;
      text(ctx, data.link.domain.toUpperCase(), 12, y + ih + 22, { size: 12, color: c.sub });
      paragraph(ctx, data.link.title, 12, y + ih + 42, room, { size: 15, weight: 600, line: 19, lines: data.sponsored ? 1 : 2, color: c.fg });
      if (data.sponsored) {
        const label = data.cta || local.learn;
        const bw = Math.max(104, width(ctx, label, { size: 15, weight: 600 }) + 28);
        fillRect(ctx, env.w - 12 - bw, y + ih + 18, bw, 36, c.fill, 6);
        text(ctx, label, env.w - 12 - bw / 2, y + ih + 41, { size: 15, weight: 600, color: c.fg, align: "center" });
      }
    }
    if (data.kind === "aunt") {
      const gradient = ctx.createLinearGradient(0, y, env.w, y + mh);
      gradient.addColorStop(0, `hsl(${data.hue} 85% 58%)`);
      gradient.addColorStop(1, `hsl(${(data.hue + 50) % 360} 80% 46%)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, y, env.w, mh);
      const style = { size: 26, weight: 700, line: 33, lines: 6, color: "#ffffff", align: "center" as const };
      const th = paragraphHeight(ctx, data.body, env.w - 64, style);
      paragraph(ctx, data.body, env.w / 2, y + (mh - th) / 2 + 25, env.w - 64, style);
    }
    y += mh;
    const shown = data.faces.slice(0, 3);
    for (let index = shown.length - 1; index >= 0; index -= 1) reactionFace(ctx, shown[index]!, 12 + index * 15, y + 11, 18, c.bg);
    const left = 12 + shown.length * 15 + 9;
    const talk = talkLine(env.lang, data.comments, data.shares);
    const talkWidth = width(ctx, talk, { size: 14 });
    let who = statsLine(env.lang, data.reactor, data.reactions);
    while (who.length > 3 && width(ctx, who, { size: 14 }) > env.w - left - talkWidth - 24) who = who.slice(0, -1);
    text(ctx, who, left, y + 25, { size: 14, color: c.sub });
    text(ctx, talk, env.w - 12, y + 25, { size: 14, color: c.sub, align: "right" });
    fillRect(ctx, 12, y + STATS - 0.5, env.w - 24, 0.5, c.line);
    y += STATS;
    const actions: [string, string][] = [
      ["thumb", words.like],
      ["comment", words.comment],
      ["M14 4.5 21.5 11 14 17.5v-4C8.5 13.5 5 15.5 2.5 20c.5-6.5 4.5-10.5 11.5-11z", words.share],
    ];
    actions.forEach(([icon, label], index) => {
      const cx = env.w * (index * 2 + 1) / 6;
      const lw = width(ctx, label, { size: 14, weight: 600 });
      glyph(ctx, icon, cx - (lw + 26) / 2, y + 12, 20, c.sub, { line: 1.8 });
      text(ctx, label, cx - (lw + 26) / 2 + 26, y + 27, { size: 14, weight: 600, color: c.sub });
    });
    fillRect(ctx, 0, h - BAND, env.w, BAND, c.band);
  },
  hotspots: (data, env, h) => [
    { x: env.w / 6, y: h - BAND - ACTIONS / 2, kind: "like" },
    ...(mediaHeight(data, env.w) ? [{ x: env.w / 2, y: h - BAND - ACTIONS - STATS - mediaHeight(data, env.w) / 2, kind: "open" as const }] : []),
  ],
};

const MIND: Record<Lang, string> = { en: "What's on your mind?", ko: "무슨 생각을 하고 계신가요?", ja: "その気持ち、シェアしよう", es: "¿Qué estás pensando?" };

const composer: Painter<{ face: string }> = {
  needs: (data) => [data.face],
  measure: () => 64 + BAND,
  paint(ctx, data, env, h) {
    const c = colors(env.mode === "dark");
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    avatar(ctx, env.image(data.face), "me", 12, 12, 40);
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 1;
    rrect(ctx, 62, 14, env.w - 62 - 52, 36, 18);
    ctx.stroke();
    text(ctx, MIND[env.lang], 76, 37, { size: 15, color: c.fg });
    glyph(ctx, "M3.5 5h17v14h-17zM3.5 15.5l5-5 4 4 3-3 5 5M15.5 9.5h.01", env.w - 38, 20, 24, "#45bd62", { line: 2 });
    fillRect(ctx, 0, h - BAND, env.w, BAND, c.band);
  },
};

type Stories = { own: string; faces: string[]; photos: string[]; names: string[] };

const CREATE: Record<Lang, string> = { en: "Create story", ko: "스토리 만들기", ja: "ストーリーズを作成", es: "Crear historia" };

const stories: Painter<Stories> = {
  needs: (data) => [data.own, ...data.faces, ...data.photos],
  measure: () => 196 + BAND,
  paint(ctx, data, env, h) {
    const c = colors(env.mode === "dark");
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    const cw = 108;
    const ch = 176;
    const y = 10;
    ctx.save();
    rrect(ctx, 12, y, cw, ch, 12);
    ctx.clip();
    fillRect(ctx, 12, y, cw, ch, env.mode === "dark" ? "#3a3b3c" : "#ffffff");
    cover(ctx, env.image(data.own), 12, y, cw, 122, 0, data.own);
    ctx.restore();
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 0.75;
    rrect(ctx, 12, y, cw, ch, 12);
    ctx.stroke();
    circle(ctx, 12 + cw / 2, y + 122, 18, env.mode === "dark" ? "#3a3b3c" : "#ffffff");
    circle(ctx, 12 + cw / 2, y + 122, 15, c.blue);
    glyph(ctx, "plus", 12 + cw / 2 - 10, y + 112, 20, "#fff", { line: 3 });
    paragraph(ctx, CREATE[env.lang], 12 + cw / 2, y + 156, cw - 12, { size: 13, weight: 600, line: 16, lines: 2, color: c.fg, align: "center" });
    data.photos.slice(0, 3).forEach((photo, index) => {
      const x = 12 + (cw + 8) * (index + 1);
      cover(ctx, env.image(photo), x, y, cw, ch, 12, photo);
      const shade = ctx.createLinearGradient(0, y + ch * 0.55, 0, y + ch);
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(0,0,0,0.6)");
      ctx.save();
      rrect(ctx, x, y, cw, ch, 12);
      ctx.clip();
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, cw, ch);
      ctx.restore();
      circle(ctx, x + 24, y + 24, 18, c.blue);
      avatar(ctx, env.image(data.faces[index] ?? ""), data.names[index] ?? "", x + 9, y + 9, 30, undefined);
      paragraph(ctx, data.names[index] ?? "", x + 9, y + ch - 26, cw - 18, { size: 13, weight: 600, line: 16, lines: 2, color: "#fff" });
    });
    fillRect(ctx, 0, h - BAND, env.w, BAND, c.band);
  },
};

const top: Painter<Record<string, never>> = {
  paint(ctx, _data, env, h) {
    const c = colors(env.mode === "dark");
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    text(ctx, "facebook", 14, h - 13, { size: 30, weight: 800, color: c.word, family: '"Helvetica Neue", Helvetica, Arial, sans-serif', spacing: -1.2 });
    ["plus", "search", MESSENGER].forEach((icon, index) => {
      const cx = env.w - 32 - (2 - index) * 46;
      circle(ctx, cx, h - 23, 18, c.fill);
      glyph(ctx, icon, cx - 11, h - 34, 22, c.fg, { line: index === 0 ? 2.6 : 2.1 });
    });
    fillRect(ctx, 0, h - 0.5, env.w, 0.5, c.line);
  },
};

const TABS: Record<Lang, string[]> = {
  en: ["Home", "Video", "Friends", "Marketplace", "Notifications", "Menu"],
  ko: ["홈", "동영상", "친구", "Marketplace", "알림", "메뉴"],
  ja: ["ホーム", "動画", "友達", "Marketplace", "お知らせ", "メニュー"],
  es: ["Inicio", "Video", "Amigos", "Marketplace", "Notificaciones", "Menú"],
};

const bottom: Painter<{ face: string }> = {
  needs: (data) => [data.face],
  paint(ctx, data, env, h) {
    const c = colors(env.mode === "dark");
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    fillRect(ctx, 0, 0, env.w, 0.5, c.line);
    const icons = ["home", "M3.5 6h17v12h-17zM10 9.5v5l4.5-2.5z", "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 19.5c.6-3.6 3.2-5.5 6.5-5.5s5.9 1.9 6.5 5.5M16 4.5a3.3 3.3 0 0 1 0 6.3M18 14.2c2 .7 3.2 2.5 3.5 5.3", "M4 9.5V20h16V9.5M3 9.5 4.5 4h15L21 9.5c0 1.6-1.3 2.5-2.7 2.5s-2.7-.9-2.7-2.5c0 1.6-1.3 2.5-2.8 2.5s-2.8-.9-2.8-2.5c0 1.6-1.3 2.5-2.7 2.5S3 11.1 3 9.5zM9.5 20v-5h5v5", "bell"];
    const step = env.w / 6;
    TABS[env.lang].forEach((label, index) => {
      const cx = step * (index + 0.5);
      const active = index === 0;
      const color = active ? c.blue : c.sub;
      if (index < 5) glyph(ctx, icons[index]!, cx - 13, 7, 26, color, { fill: active, line: 1.9 });
      else {
        avatar(ctx, env.image(data.face), "me", cx - 13, 7, 26);
        circle(ctx, cx + 11, 28, 7.5, c.bg);
        circle(ctx, cx + 11, 28, 6.5, c.fill);
        glyph(ctx, "M8 9h8M8 12h8M8 15h8", cx + 4.5, 21.5, 13, c.fg, { line: 2.4 });
      }
      if (index === 4) {
        fillRect(ctx, cx + 3, 3, 20, 16, "#e41e3f", 8);
        text(ctx, "9+", cx + 13, 15, { size: 10.5, weight: 700, color: "#fff", align: "center" });
      }
      const lw = width(ctx, label, { size: 10.5, weight: active ? 600 : 400 });
      text(ctx, lw > step - 2 ? `${label.slice(0, Math.max(3, Math.floor(label.length * ((step - 6) / lw))))}…` : label, cx, 45, { size: 10.5, weight: active ? 600 : 400, color, align: "center" });
    });
    fillRect(ctx, env.w / 2 - 67, h - 13, 134, 5, c.fg, 3);
  },
};

export const FACEBOOK_PAINTERS = {
  "facebook.post": post,
  "facebook.composer": composer,
  "facebook.stories": stories,
  "facebook.top": top,
  "facebook.bottom": bottom,
};
