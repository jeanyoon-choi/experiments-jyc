// LinkedIn (Greed, NOTES 1017), painted: the bars and a post card — a
// humblebrag, a photo, a document carousel, or Promoted — under its
// reaction cluster and its Like / Comment / Repost / Send.

import { avatar, circle, count, cover, fillRect, glyph, paragraph, paragraphHeight, rrect, text, width } from "../../paint/kit";
import type { Ctx, Lang, Painter } from "../../paint/types";
import { ago, ui } from "../../content/voice";

export type LinkedInPost = {
  kind: "text" | "photo" | "document";
  /** "Maya Chen likes this", "celebrates this" — above the card; empty: none. */
  context: string;
  name: string;
  face: string;
  /** The poster's headline: "Founder @ … | Ex-… | Building …". */
  title: string;
  degree: string;
  minutes: number;
  body: string;
  photo: string;
  document: { title: string; pages: number; hue: number } | null;
  promoted: { cta: string; headline: string } | null;
  reactions: number;
  comments: number;
  reposts: number;
  /** 0 like, 1 celebrate, 2 support, 3 love, 4 insightful. */
  faces: number[];
};

const colors = (dark: boolean) =>
  dark
    ? { page: "#000000", bg: "#1b1f23", fg: "rgba(255,255,255,0.9)", sub: "rgba(255,255,255,0.6)", line: "rgba(255,255,255,0.15)", fill: "#38434f", blue: "#71b7fb", strip: "#293138" }
    : { page: "#f4f2ee", bg: "#ffffff", fg: "rgba(0,0,0,0.9)", sub: "rgba(0,0,0,0.6)", line: "rgba(0,0,0,0.12)", fill: "#edf3f8", blue: "#0a66c2", strip: "#eef3f8" };

const GAP = 8;
const CONTEXT = 40;
const HEAD = 70;
const BODY = { size: 14, line: 20, lines: 3 } as const;
const STATS = 34;
const ACTIONS = 56;

const PUBLIC = "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM3 12h18M12 3c2.5 2.6 3.7 5.6 3.7 9s-1.2 6.4-3.7 9c-2.5-2.6-3.7-5.6-3.7-9S9.5 5.6 12 3z";

function mediaHeight(data: LinkedInPost, w: number) {
  if (data.kind === "photo") return Math.round(w * 0.75) + (data.promoted ? 64 : 0);
  if (data.kind === "document") return 40 + Math.round(w * 1.0);
  return 0;
}

const LOCAL: Record<Lang, { more: string; promoted: string; follow: string; send: string; pages: string }> = {
  en: { more: "…more", promoted: "Promoted", follow: "Follow", send: "Send", pages: "pages" },
  ko: { more: "…더보기", promoted: "광고", follow: "팔로우", send: "보내기", pages: "페이지" },
  ja: { more: "…もっと見る", promoted: "プロモーション", follow: "フォロー", send: "送信", pages: "ページ" },
  es: { more: "…más", promoted: "Promocionado", follow: "Seguir", send: "Enviar", pages: "páginas" },
};

function reactionFace(ctx: Ctx, index: number, x: number, y: number, size: number, ring: string) {
  const r = size / 2;
  circle(ctx, x + r, y + r, r + 1.2, ring);
  const fills = ["#378fe9", "#5f9b41", "#c37d16", "#df704d", "#edb541"];
  circle(ctx, x + r, y + r, r, fills[index]!);
  const icons = [
    "thumb",
    "M7 13.5 4.5 11a1.4 1.4 0 0 1 2-2l3 3V5.5a1.4 1.4 0 0 1 2.8 0V11l.5-6a1.4 1.4 0 0 1 2.8.2L15 11.5l1.6-3.7a1.4 1.4 0 0 1 2.6 1L17 16c-.8 3-3 4.5-5.5 4.5S8 19 7 13.5z",
    "M12 21c-5.5-3.5-8.5-6.8-8.5-10.5A4.5 4.5 0 0 1 12 8a4.5 4.5 0 0 1 8.5 2.5C20.5 14.2 17.5 17.5 12 21zM8 12.5h8",
    "heart",
    "M9 17.5h6M9.5 20.5h5M12 2.5a6.5 6.5 0 0 0-4 11.6c.6.5 1 1.2 1 2V17h6v-.9c0-.8.4-1.5 1-2A6.5 6.5 0 0 0 12 2.5z",
  ];
  glyph(ctx, icons[index]!, x + size * 0.2, y + size * 0.2, size * 0.6, "#fff", { fill: index === 0 || index === 3, line: 2.4 });
}

function talkLine(lang: Lang, comments: number, reposts: number) {
  const c = count(comments, lang);
  const r = count(reposts, lang);
  if (lang === "ko") return `댓글 ${c} · 퍼감 ${r}`;
  if (lang === "ja") return `コメント${c}件 · 再投稿${r}件`;
  if (lang === "es") return `${c} comentarios · ${r} veces compartido`;
  return `${c} comments · ${r} reposts`;
}

const post: Painter<LinkedInPost> = {
  needs: (data) => [data.face, ...(data.photo ? [data.photo] : [])],
  measure(ctx, data, env) {
    return (data.context ? CONTEXT : 0) + HEAD + paragraphHeight(ctx, data.body, env.w - 32, BODY) + 12 + mediaHeight(data, env.w) + STATS + ACTIONS + GAP;
  },
  paint(ctx, data, env, h) {
    const c = colors(env.mode === "dark");
    const words = ui(env.lang);
    const local = LOCAL[env.lang];
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    let y = 0;
    if (data.context) {
      text(ctx, data.context, 16, 25, { size: 13, color: c.sub });
      glyph(ctx, "more", env.w - 66, 9, 22, c.sub, { line: 2.8 });
      glyph(ctx, "close", env.w - 34, 10, 20, c.sub, { line: 2 });
      fillRect(ctx, 16, CONTEXT - 0.5, env.w - 32, 0.5, c.line);
      y = CONTEXT;
    }
    if (data.promoted) {
      cover(ctx, env.image(data.face), 16, y + 12, 48, 48, 4, data.name);
      if (!env.image(data.face)) text(ctx, data.name[0] ?? "", 40, y + 45, { size: 22, weight: 700, color: "#fff", align: "center" });
    } else avatar(ctx, env.image(data.face), data.name, 16, y + 12, 48);
    const right = data.context ? env.w - 16 : env.w - 100;
    const nameStyle = { size: 14, weight: 600 } as const;
    let name = data.name;
    while (name.length > 3 && width(ctx, name, nameStyle) > right - 72 - 40) name = name.slice(0, -1);
    const nameWidth = text(ctx, name === data.name ? name : `${name}…`, 72, y + 27, { ...nameStyle, color: c.fg });
    if (data.degree) text(ctx, ` • ${data.degree}`, 72 + nameWidth, y + 27, { size: 14, color: c.sub });
    let title = data.title;
    while (title.length > 3 && width(ctx, title, { size: 12 }) > right - 72) title = title.slice(0, -1);
    text(ctx, title === data.title ? title : `${title.trimEnd()}…`, 72, y + 44, { size: 12, color: c.sub });
    const meta = data.promoted ? local.promoted : `${ago(env.lang, data.minutes)} • `;
    const metaWidth = text(ctx, meta, 72, y + 61, { size: 12, color: c.sub });
    if (!data.promoted) glyph(ctx, PUBLIC, 72 + metaWidth, y + 51.5, 12, c.sub, { line: 2 });
    if (!data.context) {
      const label = `+ ${local.follow}`;
      text(ctx, label, env.w - 16, y + 28, { size: 15, weight: 600, color: c.blue, align: "right" });
    }
    y += HEAD;
    const used = paragraph(ctx, data.body, 16, y + 12, env.w - 32, { ...BODY, color: c.fg });
    if (paragraphHeight(ctx, data.body, env.w - 32, { size: 14, line: 20 }) > used) {
      const last = y + 12 + used - 20;
      const lw = width(ctx, local.more, { size: 14 });
      fillRect(ctx, env.w - 16 - lw - 6, last - 15, lw + 6, 20, c.bg);
      text(ctx, local.more, env.w - 16 - lw, last, { size: 14, color: c.sub });
    }
    y += used + 12;
    const mh = mediaHeight(data, env.w);
    if (data.kind === "photo") {
      const ph = Math.round(env.w * 0.75);
      cover(ctx, env.image(data.photo), 0, y, env.w, ph, 0, data.photo);
      if (data.promoted) {
        fillRect(ctx, 0, y + ph, env.w, 64, c.strip);
        paragraph(ctx, data.promoted.headline, 16, y + ph + 26, env.w - 150, { size: 14, weight: 600, line: 18, lines: 2, color: c.fg });
        const bw = Math.max(96, width(ctx, data.promoted.cta, { size: 15, weight: 600 }) + 32);
        ctx.strokeStyle = c.blue;
        ctx.lineWidth = 1;
        rrect(ctx, env.w - 16 - bw, y + ph + 16, bw, 32, 16);
        ctx.stroke();
        text(ctx, data.promoted.cta, env.w - 16 - bw / 2, y + ph + 37, { size: 15, weight: 600, color: c.blue, align: "center" });
      }
    }
    if (data.kind === "document" && data.document) {
      const doc = data.document;
      fillRect(ctx, 0, y, env.w, 40, c.strip);
      let label = `${doc.title} • ${doc.pages} ${local.pages}`;
      while (label.length > 4 && width(ctx, label, { size: 13, weight: 600 }) > env.w - 32) label = label.slice(0, -1);
      text(ctx, label, 16, y + 25, { size: 13, weight: 600, color: c.fg });
      const sy = y + 40;
      const sh = mh - 40;
      const gradient = ctx.createLinearGradient(0, sy, env.w, sy + sh);
      gradient.addColorStop(0, `hsl(${doc.hue} 60% 18%)`);
      gradient.addColorStop(1, `hsl(${(doc.hue + 30) % 360} 70% 32%)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, sy, env.w, sh);
      fillRect(ctx, 32, sy + 40, 44, 6, `hsl(${(doc.hue + 180) % 360} 90% 65%)`, 3);
      paragraph(ctx, doc.title, 32, sy + 98, env.w - 64, { size: 34, weight: 800, line: 40, lines: 5, color: "#ffffff" });
      text(ctx, env.lang === "en" ? "Swipe →" : env.lang === "ko" ? "넘겨 보기 →" : env.lang === "ja" ? "スワイプ →" : "Desliza →", 32, sy + sh - 36, { size: 16, weight: 600, color: "rgba(255,255,255,0.75)" });
      fillRect(ctx, env.w - 70, sy + 14, 56, 24, "rgba(0,0,0,0.55)", 12);
      text(ctx, `1 / ${doc.pages}`, env.w - 42, sy + 31, { size: 12, weight: 600, color: "#fff", align: "center" });
      circle(ctx, env.w - 30, sy + sh / 2, 18, "rgba(0,0,0,0.55)");
      glyph(ctx, "M10 6.5 15.5 12 10 17.5", env.w - 42, sy + sh / 2 - 12, 24, "#fff", { line: 2.4 });
    }
    y += mh;
    const shown = data.faces.slice(0, 3);
    for (let index = shown.length - 1; index >= 0; index -= 1) reactionFace(ctx, shown[index]!, 16 + index * 12, y + 9, 16, c.bg);
    text(ctx, count(data.reactions, env.lang), 16 + shown.length * 12 + 10, y + 22, { size: 12, color: c.sub });
    text(ctx, talkLine(env.lang, data.comments, data.reposts), env.w - 16, y + 22, { size: 12, color: c.sub, align: "right" });
    fillRect(ctx, 16, y + STATS - 0.5, env.w - 32, 0.5, c.line);
    y += STATS;
    const actions: [string, string][] = [
      ["thumb", words.like],
      ["M20.5 4.5h-17v12h4V21l4.5-4.5h8.5z", words.comment],
      ["repost", words.repost],
      ["send", local.send],
    ];
    actions.forEach(([icon, label], index) => {
      const cx = env.w * (index * 2 + 1) / 8;
      glyph(ctx, icon, cx - 11, y + 8, 22, c.sub, { line: 1.8 });
      text(ctx, label, cx, y + 45, { size: 12, weight: 600, color: c.sub, align: "center" });
    });
    fillRect(ctx, 0, h - GAP, env.w, GAP, c.page);
  },
  hotspots: (data, env, h) => [
    { x: env.w / 8, y: h - GAP - ACTIONS / 2, kind: "like" },
    ...(data.context ? [] : [{ x: env.w - 50, y: 22, kind: "follow" as const }]),
    ...(mediaHeight(data, env.w) ? [{ x: env.w / 2, y: h - GAP - ACTIONS - STATS - mediaHeight(data, env.w) / 2, kind: "open" as const }] : []),
  ],
};

const SEARCH: Record<Lang, string> = { en: "Search", ko: "검색", ja: "検索", es: "Buscar" };

const top: Painter<{ face: string }> = {
  needs: (data) => [data.face],
  paint(ctx, data, env, h) {
    const c = colors(env.mode === "dark");
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    avatar(ctx, env.image(data.face), "me", 16, h - 40, 32);
    fillRect(ctx, 60, h - 40, env.w - 60 - 56, 32, c.fill, 4);
    glyph(ctx, "search", 70, h - 33, 18, c.fg, { line: 2.2 });
    text(ctx, SEARCH[env.lang], 96, h - 19, { size: 15, color: c.sub });
    glyph(ctx, "M3.5 6.5h17v11h-17zM3.5 7l8.5 6 8.5-6", env.w - 40, h - 37, 26, c.sub, { line: 1.8 });
    fillRect(ctx, env.w - 22, h - 42, 16, 16, "#cb112d", 8);
    text(ctx, "3", env.w - 14, h - 30, { size: 11, weight: 700, color: "#fff", align: "center" });
    fillRect(ctx, 0, h - 0.5, env.w, 0.5, c.line);
  },
};

const TABS: Record<Lang, string[]> = {
  en: ["Home", "My Network", "Post", "Notifications", "Jobs"],
  ko: ["홈", "인맥", "게시", "알림", "채용공고"],
  ja: ["ホーム", "ネットワーク", "投稿", "お知らせ", "求人"],
  es: ["Inicio", "Mi red", "Publicar", "Notificaciones", "Empleos"],
};

const bottom: Painter<{ face: string }> = {
  paint(ctx, _data, env, h) {
    const c = colors(env.mode === "dark");
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    fillRect(ctx, 0, 0, env.w, 0.5, c.line);
    const icons = [
      "home",
      "M8.5 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20c.6-3.8 3.2-6 6.5-6s5.9 2.2 6.5 6M16 11a3 3 0 1 0 0-6M17.5 14.3c2.3.6 3.8 2.6 4.3 5.7",
      "M4 4h16v16H4zM12 8v8M8 12h8",
      "bell",
      "M3 8h18v12H3zM8.5 8V5.5h7V8M3 13h18",
    ];
    const step = env.w / 5;
    TABS[env.lang].forEach((label, index) => {
      const cx = step * (index + 0.5);
      const active = index === 0;
      const color = active ? c.fg : c.sub;
      glyph(ctx, icons[index]!, cx - 12, 8, 24, color, { fill: active, line: 1.8 });
      if (index === 3) {
        fillRect(ctx, cx + 4, 4, 18, 16, "#cb112d", 8);
        text(ctx, "12", cx + 13, 16, { size: 10.5, weight: 700, color: "#fff", align: "center" });
      }
      text(ctx, label, cx, 45, { size: 10.5, weight: active ? 600 : 400, color, align: "center" });
    });
    fillRect(ctx, env.w / 2 - 67, h - 13, 134, 5, env.mode === "dark" ? "#ffffff" : "#000000", 3);
  },
};

export const LINKEDIN_PAINTERS = {
  "linkedin.post": post,
  "linkedin.top": top,
  "linkedin.bottom": bottom,
};
