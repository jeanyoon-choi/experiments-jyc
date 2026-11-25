// News (the eighth axis, NOTES 1017), painted: the Today header with its
// date, the red "Top Stories" title, a lead story (a photo above a serif
// headline, sometimes BREAKING), smaller rows with a thumbnail, and an
// Advertisement card. Fictional mastheads, each in its own type.

import { cover, fillRect, glyph, paragraph, paragraphHeight, rrect, SERIF, text, width } from "../../paint/kit";
import type { Ctx, Lang, Mode, Painter } from "../../paint/types";
import { ui } from "../../content/voice";

export type Masthead = { name: string; style: 0 | 1 | 2 | 3 };

export type NewsStory = {
  publisher: Masthead;
  headline: string;
  photo: string;
  minutes: number;
  /** "breaking" | "live" | "": a red label above the headline. */
  flag: "breaking" | "live" | "";
};

export type NewsAd = { org: string; line: string; photo: string; cta: string };

const colors = (mode: Mode) =>
  mode === "dark"
    ? { bg: "#000000", card: "#1c1c1e", fg: "#ffffff", sub: "#8d8d93", line: "#38383a", red: "#ff375f" }
    : { bg: "#f2f2f7", card: "#ffffff", fg: "#000000", sub: "#8a8a8e", line: "#d8d8dc", red: "#fa2d48" };

const M = 16;
const LEAD_PHOTO = 0.62;
const LEAD = { size: 23, weight: 700, line: 28, lines: 4, family: SERIF } as const;
const ROW = { size: 17, weight: 700, line: 21, lines: 4, family: SERIF } as const;
const THUMB = 92;

function masthead(ctx: Ctx, publisher: Masthead, x: number, y: number, color: string, scale = 1) {
  const styles = [
    { size: 15 * scale, weight: 800, family: SERIF, spacing: 0, upper: false },
    { size: 12.5 * scale, weight: 900, family: '"Helvetica Neue", Helvetica, Arial, sans-serif', spacing: 1.2, upper: true },
    { size: 16 * scale, weight: 400, family: '"Didot", "Bodoni 72", Georgia, serif', spacing: 0.3, upper: false },
    { size: 13 * scale, weight: 700, family: '"Avenir Next Condensed", "Arial Narrow", sans-serif', spacing: 0.6, upper: true },
  ] as const;
  const style = styles[publisher.style];
  return text(ctx, style.upper ? publisher.name.toUpperCase() : publisher.name, x, y, { size: style.size, weight: style.weight, family: style.family, spacing: style.spacing, color });
}

const AGO: Record<Lang, (minutes: number) => string> = {
  en: (m) => (m < 1 ? "Just now" : m < 60 ? `${Math.round(m)}m ago` : `${Math.round(m / 60)}h ago`),
  ko: (m) => (m < 1 ? "방금" : m < 60 ? `${Math.round(m)}분 전` : `${Math.round(m / 60)}시간 전`),
  ja: (m) => (m < 1 ? "たった今" : m < 60 ? `${Math.round(m)}分前` : `${Math.round(m / 60)}時間前`),
  es: (m) => (m < 1 ? "Ahora" : m < 60 ? `hace ${Math.round(m)} min` : `hace ${Math.round(m / 60)} h`),
};

function flagLabel(lang: Lang, flag: NewsStory["flag"]) {
  const words = ui(lang);
  return flag === "breaking" ? words.breaking : flag === "live" ? words.live : "";
}

function card(ctx: Ctx, env: { w: number }, h: number, color: string, bg: string) {
  fillRect(ctx, 0, 0, env.w, h, bg);
  fillRect(ctx, M, 0, env.w - M * 2, h - 12, color, 12);
}

function footer(ctx: Ctx, story: NewsStory, lang: Lang, x: number, y: number, right: number, sub: string) {
  text(ctx, AGO[lang](story.minutes), x, y, { size: 13, color: sub });
  glyph(ctx, "more", right - 22, y - 15, 20, sub, { line: 2.8 });
}

const lead: Painter<NewsStory> = {
  needs: (data) => (data.photo ? [data.photo] : []),
  measure(ctx, data, env) {
    const inner = env.w - M * 2 - 32;
    return Math.round((env.w - M * 2) * LEAD_PHOTO) + 40 + (data.flag ? 20 : 0) + paragraphHeight(ctx, data.headline, inner, LEAD) + 44 + 12;
  },
  paint(ctx, data, env, h) {
    const c = colors(env.mode);
    const cw = env.w - M * 2;
    card(ctx, env, h, c.card, c.bg);
    const ph = Math.round(cw * LEAD_PHOTO);
    ctx.save();
    rrect(ctx, M, 0, cw, h - 12, 12);
    ctx.clip();
    cover(ctx, env.image(data.photo), M, 0, cw, ph, 0, data.photo);
    ctx.restore();
    let y = ph + 30;
    masthead(ctx, data.publisher, M + 16, y, c.fg, 1.1);
    y += 10;
    if (data.flag) {
      text(ctx, flagLabel(env.lang, data.flag), M + 16, y + 16, { size: 13, weight: 800, color: c.red, spacing: 0.4 });
      y += 20;
    }
    y += paragraph(ctx, data.headline, M + 16, y + 24, cw - 32, { ...LEAD, color: c.fg });
    footer(ctx, data, env.lang, M + 16, y + 26, M + cw - 12, c.sub);
  },
  hotspots: (data, env) => [{ x: env.w / 2, y: Math.round((env.w - M * 2) * LEAD_PHOTO) / 2, kind: "open" }, { x: env.w - M - 22, y: Math.round((env.w - M * 2) * LEAD_PHOTO) + 40, kind: "like" }],
};

const story: Painter<NewsStory> = {
  needs: (data) => (data.photo ? [data.photo] : []),
  measure(ctx, data, env) {
    const inner = env.w - M * 2 - 32 - THUMB - 14;
    const body = 34 + (data.flag ? 18 : 0) + paragraphHeight(ctx, data.headline, inner, ROW);
    return Math.max(body, THUMB + 8) + 40 + 12;
  },
  paint(ctx, data, env, h) {
    const c = colors(env.mode);
    const cw = env.w - M * 2;
    const inner = cw - 32 - THUMB - 14;
    card(ctx, env, h, c.card, c.bg);
    let y = 30;
    masthead(ctx, data.publisher, M + 16, y, c.fg);
    if (data.flag) {
      text(ctx, flagLabel(env.lang, data.flag), M + 16, y + 20, { size: 12, weight: 800, color: c.red, spacing: 0.4 });
      y += 18;
    }
    paragraph(ctx, data.headline, M + 16, y + 24, inner, { ...ROW, color: c.fg });
    cover(ctx, env.image(data.photo), M + cw - 16 - THUMB, 18, THUMB, THUMB, 8, data.photo);
    footer(ctx, data, env.lang, M + 16, h - 12 - 18, M + cw - 12, c.sub);
  },
  hotspots: (_data, env, h) => [{ x: env.w - M - 22, y: h - 36, kind: "like" }, { x: env.w / 2, y: (h - 12) / 2, kind: "open" }],
};

const AD: Record<Lang, string> = { en: "Advertisement", ko: "광고", ja: "広告", es: "Publicidad" };

const ad: Painter<NewsAd> = {
  needs: (data) => [data.photo],
  measure: (_ctx, _data, env) => 30 + Math.round((env.w - M * 2) * 0.62) + 92 + 12,
  paint(ctx, data, env, h) {
    const c = colors(env.mode);
    const cw = env.w - M * 2;
    card(ctx, env, h, c.card, c.bg);
    text(ctx, AD[env.lang], env.w / 2, 20, { size: 11, color: c.sub, align: "center" });
    const ph = Math.round(cw * 0.62);
    cover(ctx, env.image(data.photo), M + 12, 30, cw - 24, ph, 6, data.photo);
    const y = 30 + ph;
    text(ctx, data.org, M + 16, y + 28, { size: 15, weight: 700, color: c.fg });
    paragraph(ctx, data.line, M + 16, y + 50, cw - 140, { size: 14, line: 18, lines: 2, color: c.sub });
    const bw = Math.max(90, width(ctx, data.cta, { size: 15, weight: 600 }) + 28);
    fillRect(ctx, M + cw - 16 - bw, y + 26, bw, 36, c.red, 18);
    text(ctx, data.cta, M + cw - 16 - bw / 2, y + 49, { size: 15, weight: 600, color: "#ffffff", align: "center" });
  },
  hotspots: (_data, env, h) => [{ x: env.w - M - 60, y: h - 12 - 48, kind: "button" }],
};

const section: Painter<{ title: string }> = {
  measure: () => 52,
  paint(ctx, data, env, h) {
    const c = colors(env.mode);
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    const tw = text(ctx, data.title, M + 2, 34, { size: 22, weight: 800, color: c.red });
    glyph(ctx, "M9 5.5 15.5 12 9 18.5", M + tw + 6, 17, 20, c.red, { line: 3 });
  },
};

const top: Painter<{ date: string }> = {
  paint(ctx, data, env, h) {
    const c = colors(env.mode);
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    text(ctx, data.date.toUpperCase(), M + 2, 74, { size: 13, weight: 600, color: c.sub, spacing: 0.2 });
    text(ctx, "News", M, h - 12, { size: 34, weight: 800, color: c.fg, spacing: -0.6 });
    const r = 18;
    ctx.fillStyle = env.mode === "dark" ? "#2c2c2e" : "#e3e3e8";
    ctx.beginPath();
    ctx.arc(env.w - M - r, h - 24, r, 0, Math.PI * 2);
    ctx.fill();
    glyph(ctx, "user", env.w - M - r - 11, h - 35, 22, c.sub, { line: 2 });
  },
};

const TABS: Record<Lang, string[]> = {
  en: ["Today", "News+", "Sports", "Audio", "Following"],
  ko: ["오늘", "News+", "스포츠", "오디오", "팔로우 중"],
  ja: ["Today", "News+", "スポーツ", "オーディオ", "フォロー中"],
  es: ["Hoy", "News+", "Deportes", "Audio", "Siguiendo"],
};

const bottom: Painter<Record<string, never>> = {
  paint(ctx, _data, env, h) {
    const c = colors(env.mode);
    fillRect(ctx, 0, 0, env.w, h, env.mode === "dark" ? "rgba(22,22,24,0.94)" : "rgba(249,249,249,0.94)");
    fillRect(ctx, 0, 0, env.w, 0.5, c.line);
    const icons = [
      "M4 4.5h16v15H4zM7.5 8.5h9M7.5 12h9M7.5 15.5h5",
      "M3.5 6.5h17v11h-17zM9 9.5v5M6.5 12h5M14 10.5h4M14 13.5h4",
      "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM5 6.5c2.5 2 3.8 3.9 3.8 5.5S7.5 15.5 5 17.5M19 6.5c-2.5 2-3.8 3.9-3.8 5.5s1.3 3.5 3.8 5.5",
      "M4 14.5V12a8 8 0 0 1 16 0v2.5M4 14h3v6H4zM17 14h3v6h-3z",
      "M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.3 4.5 6.9 4.5c2.2 0 3.6 1.2 5.1 3 1.5-1.8 2.9-3 5.1-3 3.6 0 5.5 3.5 4.2 6.8C19.5 15.9 12 20.5 12 20.5z",
    ];
    const step = env.w / 5;
    TABS[env.lang].forEach((label, index) => {
      const cx = step * (index + 0.5);
      const active = index === 0;
      const color = active ? c.red : c.sub;
      glyph(ctx, icons[index]!, cx - 13, 6, 26, color, { line: active ? 2.2 : 1.8 });
      text(ctx, label, cx, 44, { size: 10, weight: 500, color, align: "center" });
    });
    fillRect(ctx, env.w / 2 - 67, h - 13, 134, 5, c.fg, 3);
  },
};

export const NEWS_PAINTERS = {
  "news.lead": lead,
  "news.story": story,
  "news.ad": ad,
  "news.section": section,
  "news.top": top,
  "news.bottom": bottom,
};
