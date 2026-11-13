// Netflix (Sloth, NOTES 1017), painted: the bars, the billboard and a row of
// posters (Because you watched, Top 10 with its numerals, New on Netflix).
// Always dark; sizes follow the iOS app at 390 pt.

import { cover, fillRect, glyph, paragraph, rrect, text, width, wrap } from "../../paint/kit";
import type { Ctx, Lang, Painter } from "../../paint/types";
import { ui } from "../../content/voice";

export type NetflixHero = { photo: string; title: string; series: boolean; tags: string[]; rank: number };
export type NetflixPoster = { photo: string; title: string; recent: boolean; top: boolean };
export type NetflixRow = { kind: "because" | "top10" | "new"; title: string; start: number; posters: NetflixPoster[] };

const RED = "#e50914";
const SUB = "#b3b3b3";
const CONDENSED = '"Bebas Neue", "Oswald", "Avenir Next Condensed", "Arial Narrow", Impact, "Apple SD Gothic Neo", "Hiragino Sans", sans-serif';

const WORDS: Record<Lang, { series: string; film: string; play: string; list: string; recent: string; rank: (n: number) => string; chips: string[]; tabs: string[]; title: (name: string) => string }> = {
  en: { series: "SERIES", film: "FILM", play: "Play", list: "My List", recent: "Recently Added", rank: (n) => `#${n} in TV Shows Today`, chips: ["Shows", "Movies", "Categories"], tabs: ["Home", "New & Hot", "My Netflix"], title: (name) => `For ${name}` },
  ko: { series: "시리즈", film: "영화", play: "재생", list: "내가 찜한 리스트", recent: "최신 등록", rank: (n) => `오늘 시리즈 순위 ${n}위`, chips: ["시리즈", "영화", "카테고리"], tabs: ["홈", "NEW & HOT", "나의 넷플릭스"], title: (name) => `${name}님` },
  ja: { series: "シリーズ", film: "映画", play: "再生", list: "マイリスト", recent: "新着", rank: (n) => `今日のシリーズ ${n}位`, chips: ["シリーズ", "映画", "カテゴリー"], tabs: ["ホーム", "NEW & HOT", "マイNetflix"], title: (name) => `${name}さん` },
  es: { series: "SERIE", film: "PELÍCULA", play: "Reproducir", list: "Mi lista", recent: "Recién agregado", rank: (n) => `N.º ${n} en series hoy`, chips: ["Series", "Películas", "Categorías"], tabs: ["Inicio", "Novedades", "Mi Netflix"], title: (name) => `Para ${name}` },
};

/** The N: two red posts and the ribbon between them. */
function mark(ctx: Ctx, x: number, y: number, h: number) {
  const bar = h * 0.27;
  const w = h * 0.55;
  fillRect(ctx, x, y, bar, h, "#b1060f");
  fillRect(ctx, x + w - bar, y, bar, h, "#b1060f");
  ctx.fillStyle = RED;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + bar, y);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x + w - bar, y + h);
  ctx.closePath();
  ctx.fill();
}

function top10(ctx: Ctx, x: number, y: number, size: number) {
  fillRect(ctx, x, y, size, size * 1.15, RED, 2);
  text(ctx, "TOP", x + size / 2, y + size * 0.45, { size: size * 0.32, weight: 800, color: "#fff", align: "center", family: CONDENSED });
  text(ctx, "10", x + size / 2, y + size * 1.0, { size: size * 0.55, weight: 800, color: "#fff", align: "center", family: CONDENSED });
}

const POSTER_W = 110;
const POSTER_H = 157;

function poster(ctx: Ctx, data: NetflixPoster, image: ImageBitmap | null, x: number, y: number, lang: Lang) {
  cover(ctx, image, x, y, POSTER_W, POSTER_H, 4, data.photo);
  ctx.save();
  rrect(ctx, x, y, POSTER_W, POSTER_H, 4);
  ctx.clip();
  const shade = ctx.createLinearGradient(0, y + POSTER_H * 0.45, 0, y + POSTER_H);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.75)");
  ctx.fillStyle = shade;
  ctx.fillRect(x, y + POSTER_H * 0.45, POSTER_W, POSTER_H * 0.55);
  mark(ctx, x + 6, y + 6, 15);
  if (data.top) top10(ctx, x + POSTER_W - 20, y, 20);
  const bottom = data.recent ? y + POSTER_H - 22 : y + POSTER_H - 10;
  const lines = wrap(ctx, data.title.toUpperCase(), POSTER_W - 12, { size: 21, weight: 800, family: CONDENSED }, 2);
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 4;
  lines.forEach((line, index) => text(ctx, line, x + POSTER_W / 2, bottom - (lines.length - 1 - index) * 20, { size: 21, weight: 800, color: "#fff", align: "center", family: CONDENSED, spacing: 0.5 }));
  ctx.shadowBlur = 0;
  if (data.recent) {
    const label = WORDS[lang].recent;
    const lw = Math.min(POSTER_W - 8, width(ctx, label, { size: 10, weight: 600 }) + 12);
    fillRect(ctx, x + (POSTER_W - lw) / 2, y + POSTER_H - 16, lw, 16, RED, 2);
    text(ctx, label, x + POSTER_W / 2, y + POSTER_H - 4.5, { size: 10, weight: 600, color: "#fff", align: "center" });
  }
  ctx.restore();
}

const HERO_H = 520;

const hero: Painter<NetflixHero> = {
  needs: (data) => [data.photo].filter(Boolean),
  measure: () => HERO_H,
  paint(ctx, data, env, h) {
    const words = WORDS[env.lang];
    fillRect(ctx, 0, 0, env.w, h, "#000");
    const glow = ctx.createLinearGradient(0, 0, 0, h);
    glow.addColorStop(0, "rgba(64,52,48,0.6)");
    glow.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, env.w, h);
    const x = 16;
    const y = 8;
    const cw = env.w - 32;
    const ch = h - 24;
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 24;
    ctx.shadowOffsetY = 8;
    fillRect(ctx, x, y, cw, ch, "#181818", 12);
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    cover(ctx, env.image(data.photo), x, y, cw, ch, 12, data.photo);
    ctx.save();
    rrect(ctx, x, y, cw, ch, 12);
    ctx.clip();
    const shade = ctx.createLinearGradient(0, y + ch * 0.35, 0, y + ch);
    shade.addColorStop(0, "rgba(0,0,0,0)");
    shade.addColorStop(0.6, "rgba(0,0,0,0.55)");
    shade.addColorStop(1, "rgba(0,0,0,0.9)");
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, cw, ch);
    ctx.restore();
    ctx.strokeStyle = "rgba(255,255,255,0.14)";
    ctx.lineWidth = 1;
    rrect(ctx, x + 0.5, y + 0.5, cw - 1, ch - 1, 12);
    ctx.stroke();
    const cx = env.w / 2;
    const kind = data.series ? words.series : words.film;
    const kindWidth = width(ctx, kind, { size: 13, weight: 700 }) + kind.length * 2.5;
    mark(ctx, cx - (kindWidth + 16) / 2, y + ch - 228, 17);
    text(ctx, kind, cx - (kindWidth + 16) / 2 + 16, y + ch - 214, { size: 13, weight: 700, color: SUB, spacing: 2.5 });
    const lines = wrap(ctx, data.title.toUpperCase(), cw - 48, { size: 62, weight: 800, family: CONDENSED }, 2);
    const titleBottom = y + ch - (data.rank ? 128 : 112);
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 10;
    lines.forEach((line, index) => text(ctx, line, cx, titleBottom - (lines.length - 1 - index) * 56, { size: 62, weight: 800, color: "#fff", align: "center", family: CONDENSED, spacing: 1 }));
    ctx.shadowBlur = 0;
    ctx.shadowColor = "transparent";
    if (data.rank) {
      const label = words.rank(data.rank);
      const lw = width(ctx, label, { size: 14, weight: 600 }) + 24;
      top10(ctx, cx - lw / 2, y + ch - 118, 17);
      text(ctx, label, cx - lw / 2 + 24, y + ch - 103, { size: 14, weight: 600, color: "#fff" });
    }
    text(ctx, data.tags.join("  •  "), cx, y + ch - (data.rank ? 80 : 84), { size: 13.5, weight: 500, color: "#fff", align: "center" });
    const bw = (cw - 36) / 2;
    const by = y + ch - 62;
    fillRect(ctx, x + 12, by, bw, 44, "#fff", 4);
    const play = width(ctx, words.play, { size: 17, weight: 600 });
    glyph(ctx, "play", x + 12 + bw / 2 - (play + 28) / 2, by + 10, 24, "#000", { fill: true });
    text(ctx, words.play, x + 12 + bw / 2 - (play + 28) / 2 + 28, by + 28, { size: 17, weight: 600, color: "#000" });
    fillRect(ctx, x + 24 + bw, by, bw, 44, "rgba(109,109,110,0.72)", 4);
    const list = Math.min(bw - 44, width(ctx, words.list, { size: 17, weight: 600 }));
    glyph(ctx, "plus", x + 24 + bw + bw / 2 - (list + 30) / 2, by + 10, 24, "#fff", { line: 2.4 });
    text(ctx, words.list.length > 12 ? `${words.list.slice(0, 11)}…` : words.list, x + 24 + bw + bw / 2 - (list + 30) / 2 + 30, by + 28, { size: 17, weight: 600, color: "#fff" });
  },
  hotspots: (_data, env, h) => [
    { x: 16 + 12 + (env.w - 68) / 4, y: h - 24 - 62 + 8 + 22, kind: "button" },
    { x: 16 + 24 + ((env.w - 68) * 3) / 4, y: h - 24 - 62 + 8 + 22, kind: "like" },
  ],
};

const ROW_TOP = 42;
const SLOT_TOP10 = 158;

const row: Painter<NetflixRow> = {
  needs: (data) => data.posters.map((item) => item.photo).filter(Boolean),
  measure: () => ROW_TOP + POSTER_H + 22,
  paint(ctx, data, env, h) {
    fillRect(ctx, 0, 0, env.w, h, "#000");
    const title = data.kind === "top10" ? ui(env.lang).topTen : data.title;
    paragraph(ctx, title, 12, 28, env.w - 24, { size: 19, weight: 700, color: "#fff", lines: 1 });
    if (data.kind === "top10") {
      data.posters.slice(0, 3).forEach((item, index) => {
        const sx = 6 + index * SLOT_TOP10;
        const rank = String(data.start + index);
        ctx.font = `800 ${POSTER_H * 1.02}px ${CONDENSED}`;
        ctx.textAlign = "right";
        ctx.textBaseline = "alphabetic";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#8c8c8c";
        ctx.strokeText(rank, sx + 62, ROW_TOP + POSTER_H + 4);
        ctx.fillStyle = "#000";
        ctx.fillText(rank, sx + 62, ROW_TOP + POSTER_H + 4);
        poster(ctx, item, env.image(item.photo), sx + 46, ROW_TOP, env.lang);
      });
      return;
    }
    data.posters.forEach((item, index) => poster(ctx, item, env.image(item.photo), 12 + index * (POSTER_W + 8), ROW_TOP, env.lang));
  },
  hotspots: (data) => {
    const x = data.kind === "top10" ? 6 + 46 + POSTER_W / 2 : 12 + POSTER_W / 2;
    return [
      { x, y: ROW_TOP + POSTER_H / 2, kind: "like" },
      { x: x + (data.kind === "top10" ? SLOT_TOP10 : POSTER_W + 8), y: ROW_TOP + POSTER_H / 2, kind: "open" },
    ];
  },
};

const top: Painter<{ name: string; face: string }> = {
  paint(ctx, data, env, h) {
    const words = WORDS[env.lang];
    const shade = ctx.createLinearGradient(0, 0, 0, h);
    shade.addColorStop(0, "rgba(40,32,30,0.96)");
    shade.addColorStop(1, "rgba(0,0,0,0.92)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, env.w, h);
    paragraph(ctx, words.title(data.name), 16, 86, env.w - 120, { size: 24, weight: 700, color: "#fff", lines: 1 });
    glyph(ctx, "M4 6.5h16v10H13M4 13.5a6 6 0 0 1 6 6M4 16.5a3 3 0 0 1 3 3M4 19.5h.01", env.w - 120, 66, 25, "#fff");
    glyph(ctx, "M12 3.5v11M7.5 10 12 14.5 16.5 10M5 20h14", env.w - 80, 66, 25, "#fff");
    glyph(ctx, "search", env.w - 40, 66, 25, "#fff");
    let x = 16;
    words.chips.forEach((chip, index) => {
      const cw = width(ctx, chip, { size: 14, weight: 500 }) + (index === 2 ? 46 : 30);
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 1;
      rrect(ctx, x + 0.5, 104.5, cw - 1, 31, 16);
      ctx.stroke();
      text(ctx, chip, x + 15, 125, { size: 14, weight: 500, color: "#fff" });
      if (index === 2) glyph(ctx, "M7 10l5 5 5-5", x + cw - 28, 110, 18, "#fff", { line: 2.2 });
      x += cw + 8;
    });
  },
};

const bottom: Painter<{ name: string; face: string }> = {
  needs: (data) => [data.face].filter(Boolean),
  paint(ctx, data, env, h) {
    const words = WORDS[env.lang];
    fillRect(ctx, 0, 0, env.w, h, "rgba(18,18,18,0.97)");
    const xs = [env.w / 6, env.w / 2, (env.w * 5) / 6];
    glyph(ctx, "home", xs[0]! - 12, 8, 24, "#fff", { fill: true });
    glyph(ctx, "M3.5 6h17v12.5h-17zM7 3h10M10 9.5v6l5-3z", xs[1]! - 12, 8, 24, SUB);
    cover(ctx, env.image(data.face), xs[2]! - 12, 8, 24, 24, 4, data.name);
    words.tabs.forEach((tab, index) => text(ctx, tab, xs[index]!, 47, { size: 10, weight: 500, color: index === 0 ? "#fff" : SUB, align: "center" }));
    fillRect(ctx, env.w / 2 - 67, h - 13, 134, 5, "#fff", 3);
  },
};

export const NETFLIX_PAINTERS = {
  "netflix.hero": hero,
  "netflix.row": row,
  "netflix.top": top,
  "netflix.bottom": bottom,
};
