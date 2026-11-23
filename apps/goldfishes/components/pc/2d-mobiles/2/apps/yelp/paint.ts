// Yelp (Gluttony, NOTES 1017), painted: the search bar with its category
// chips, a section title, a venue card (photos, red star tiles, "Open now",
// Sponsored) and a review (Elite badge, photos, Helpful / Thanks / Love this).

import { avatar, count, cover, fillRect, glyph, paragraph, paragraphHeight, rrect, text, width } from "../../paint/kit";
import type { Ctx, Lang, Mode, Painter } from "../../paint/types";
import { ui } from "../../content/voice";

export type YelpVenue = {
  rank: number;
  name: string;
  photos: string[];
  rating: number;
  reviews: number;
  price: string;
  category: string;
  distance: string;
  closes: string;
  quote: string;
  quoter: string;
  quoterFace: string;
  sponsored: boolean;
  cta: string;
};

export type YelpReview = {
  name: string;
  face: string;
  friends: number;
  reviews: number;
  photosCount: number;
  elite: boolean;
  venue: string;
  rating: number;
  days: number;
  body: string;
  photos: string[];
  helpful: number;
};

const colors = (mode: Mode) =>
  mode === "dark"
    ? { bg: "#121212", fg: "#f1f1f1", sub: "#a6a6a6", line: "#2e2e2e", fill: "#262626", empty: "#3a3a3a", red: "#ff4d4d", green: "#3fbf6b", chip: "#1f1f1f" }
    : { bg: "#ffffff", fg: "#2d2e2f", sub: "#6e7072", line: "#ebebeb", fill: "#f5f5f5", empty: "#e6e6e6", red: "#d32323", green: "#008055", chip: "#ffffff" };

const STAR_COLORS = ["#ffcc4b", "#ffad48", "#ff8742", "#ff643d", "#fb433c"];

/** Yelp's five square tiles, a white star in each, filled to the rating (halves split). */
function stars(ctx: Ctx, x: number, y: number, size: number, rating: number, empty: string) {
  const full = STAR_COLORS[Math.max(0, Math.min(4, Math.ceil(rating) - 1))]!;
  for (let index = 0; index < 5; index += 1) {
    const tx = x + index * (size + 2);
    const part = Math.max(0, Math.min(1, rating - index));
    fillRect(ctx, tx, y, size, size, empty, size * 0.18);
    if (part > 0) {
      ctx.save();
      rrect(ctx, tx, y, size, size, size * 0.18);
      ctx.clip();
      ctx.fillStyle = full;
      ctx.fillRect(tx, y, size * (part >= 0.75 ? 1 : 0.5), size);
      ctx.restore();
    }
    glyph(ctx, "star", tx + size * 0.14, y + size * 0.12, size * 0.72, "#ffffff", { fill: true });
  }
  return 5 * (size + 2);
}

const LOCAL: Record<Lang, { until: string; more: string; elite: string; helpful: string; thanks: string; love: string; ohno: string; days: string; sponsored: string; result: string }> = {
  en: { until: "until", more: "more", elite: "Elite '26", helpful: "Helpful", thanks: "Thanks", love: "Love this", ohno: "Oh no", days: "days ago", sponsored: "Sponsored", result: "Sponsored result" },
  ko: { until: "마감", more: "더 보기", elite: "Elite '26", helpful: "유용해요", thanks: "고마워요", love: "좋아요", ohno: "아쉬워요", days: "일 전", sponsored: "광고", result: "광고 결과" },
  ja: { until: "まで", more: "もっと見る", elite: "Elite '26", helpful: "役に立った", thanks: "ありがとう", love: "いいね", ohno: "残念", days: "日前", sponsored: "広告", result: "広告" },
  es: { until: "hasta las", more: "más", elite: "Elite '26", helpful: "Útil", thanks: "Gracias", love: "Me encanta", ohno: "Ay no", days: "días", sponsored: "Patrocinado", result: "Resultado patrocinado" },
};

const PHOTOS_H = 168;
const QUOTE = { size: 14, line: 19, lines: 2 } as const;

function clip(ctx: Ctx, value: string, max: number, style: { size: number; weight?: number }) {
  if (width(ctx, value, style) <= max) return value;
  let cut = value;
  while (cut.length > 2 && width(ctx, `${cut}…`, style) > max) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

const venue: Painter<YelpVenue> = {
  needs: (data) => [...data.photos, data.quoterFace].filter(Boolean),
  measure(ctx, data, env) {
    return (data.sponsored ? 28 : 12) + PHOTOS_H + 112 + paragraphHeight(ctx, `“${data.quote}”`, env.w - 72, QUOTE) + (data.sponsored ? 58 : 14) + 8;
  },
  paint(ctx, data, env, h) {
    const c = colors(env.mode);
    const words = ui(env.lang);
    const local = LOCAL[env.lang];
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    let y = 12;
    if (data.sponsored) {
      text(ctx, local.result, 16, 22, { size: 12, weight: 600, color: c.sub });
      glyph(ctx, "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5.5M12 7.5h.01", 16 + width(ctx, local.result, { size: 12, weight: 600 }) + 4, 11.5, 13, c.sub, { line: 2.2 });
      y = 28;
    }
    const big = Math.round((env.w - 32) * 0.58);
    const small = env.w - 32 - big - 4;
    ctx.save();
    rrect(ctx, 16, y, env.w - 32, PHOTOS_H, 8);
    ctx.clip();
    cover(ctx, env.image(data.photos[0] ?? ""), 16, y, big, PHOTOS_H, 0, `${data.name}0`);
    cover(ctx, env.image(data.photos[1] ?? ""), 16 + big + 4, y, small, PHOTOS_H / 2 - 2, 0, `${data.name}1`);
    cover(ctx, env.image(data.photos[2] ?? ""), 16 + big + 4, y + PHOTOS_H / 2 + 2, small, PHOTOS_H / 2 - 2, 0, `${data.name}2`);
    ctx.restore();
    fillRect(ctx, env.w - 52, y + 8, 30, 30, "rgba(0,0,0,0.45)", 15);
    glyph(ctx, "bookmark", env.w - 46, y + 14, 18, "#ffffff", { line: 2 });
    y += PHOTOS_H;
    const title = data.sponsored ? data.name : `${data.rank}. ${data.name}`;
    text(ctx, clip(ctx, title, env.w - 32, { size: 19, weight: 700 }), 16, y + 30, { size: 19, weight: 700, color: c.fg });
    const sw = stars(ctx, 16, y + 42, 18, data.rating, c.empty);
    text(ctx, `${data.rating.toFixed(1)} (${count(data.reviews, env.lang)} ${words.reviews})`, 16 + sw + 6, y + 56, { size: 14, color: c.sub });
    text(ctx, clip(ctx, `${data.price} · ${data.category} · ${data.distance}`, env.w - 32, { size: 14 }), 16, y + 80, { size: 14, color: c.sub });
    const ow = text(ctx, words.open, 16, y + 102, { size: 14, weight: 700, color: c.green });
    text(ctx, ` ${local.until} ${data.closes}`, 16 + ow, y + 102, { size: 14, color: c.sub });
    y += 112;
    avatar(ctx, env.image(data.quoterFace), data.quoter, 16, y + 4, 28);
    const qh = paragraph(ctx, `“${data.quote}”`, 52, y + 17, env.w - 72, { ...QUOTE, color: c.fg });
    const last = y + 17 + qh - QUOTE.line;
    const lw = width(ctx, ` ${local.more}`, { size: 14, weight: 600 });
    fillRect(ctx, env.w - 20 - lw - 4, last - 14, lw + 4, QUOTE.line, c.bg);
    text(ctx, ` ${local.more}`, env.w - 20 - lw, last, { size: 14, weight: 600, color: c.sub });
    y += qh + 14;
    if (data.sponsored) {
      fillRect(ctx, 16, y, env.w - 32, 44, c.red, 6);
      text(ctx, data.cta, env.w / 2, y + 28, { size: 16, weight: 700, color: "#ffffff", align: "center" });
    }
    fillRect(ctx, 0, h - 8, env.w, 8, c.fill);
  },
  hotspots: (data, env, h) => {
    const y = data.sponsored ? 28 : 12;
    return [
      { x: env.w - 37, y: y + 23, kind: "like" },
      { x: env.w / 2, y: y + PHOTOS_H / 2, kind: "open" },
      ...(data.sponsored ? [{ x: env.w / 2, y: h - 8 - 36, kind: "button" as const }] : []),
    ];
  },
};

const REVIEW = { size: 15, line: 21, lines: 6 } as const;
const REVIEW_PHOTO = 150;

const review: Painter<YelpReview> = {
  needs: (data) => [data.face, ...data.photos].filter(Boolean),
  measure(ctx, data, env) {
    return 16 + 48 + 40 + paragraphHeight(ctx, data.body, env.w - 32, REVIEW) + 10 + (data.photos.length ? REVIEW_PHOTO + 14 : 0) + 56 + 8;
  },
  paint(ctx, data, env, h) {
    const c = colors(env.mode);
    const local = LOCAL[env.lang];
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    avatar(ctx, env.image(data.face), data.name, 16, 16, 48);
    const nw = text(ctx, clip(ctx, data.name, env.w - 200, { size: 16, weight: 700 }), 74, 34, { size: 16, weight: 700, color: c.fg });
    if (data.elite) {
      const ew = width(ctx, local.elite, { size: 11, weight: 700 }) + 10;
      fillRect(ctx, 80 + nw, 21, ew, 17, c.red, 3);
      text(ctx, local.elite, 85 + nw, 33.5, { size: 11, weight: 700, color: "#ffffff" });
    }
    const stats: [string, number][] = [
      ["user", data.friends],
      ["star", data.reviews],
      ["M3.5 7h4l2-2.5h5l2 2.5h4v12.5h-17zM12 17a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z", data.photosCount],
    ];
    let sx = 74;
    stats.forEach(([icon, value]) => {
      glyph(ctx, icon, sx, 43, 14, c.sub, { line: 2, fill: icon === "star" });
      sx += 18 + text(ctx, count(value, env.lang), sx + 18, 55, { size: 13, color: c.sub }) + 12;
    });
    glyph(ctx, "more", env.w - 40, 22, 22, c.sub, { line: 2.8 });
    let y = 16 + 48 + 10;
    const sw = stars(ctx, 16, y, 18, data.rating, c.empty);
    text(ctx, env.lang === "en" ? `${data.days} ${local.days}` : env.lang === "es" ? `hace ${data.days} ${local.days}` : `${data.days}${local.days}`, 16 + sw + 8, y + 14, { size: 13, color: c.sub });
    text(ctx, clip(ctx, data.venue, env.w - 32, { size: 13, weight: 600 }), 16, y + 34, { size: 13, weight: 600, color: c.fg });
    y += 40;
    y += paragraph(ctx, data.body, 16, y + 16, env.w - 32, { ...REVIEW, color: c.fg }) + 10;
    if (data.photos.length) {
      const n = Math.min(3, data.photos.length);
      const pw = (env.w - 32 - (n - 1) * 4) / n;
      data.photos.slice(0, n).forEach((photo, index) => cover(ctx, env.image(photo), 16 + index * (pw + 4), y, pw, REVIEW_PHOTO, 6, photo));
      y += REVIEW_PHOTO + 14;
    }
    const buttons: [string, string, number][] = [
      ["M9 17.5h6M9.5 20.5h5M12 2.5a6.5 6.5 0 0 0-4 11.6c.6.5 1 1.2 1 2V17h6v-.9c0-.8.4-1.5 1-2A6.5 6.5 0 0 0 12 2.5z", local.helpful, data.helpful],
      ["M7 11.5 11 3c1.5 0 2.4 1 2.1 2.6L12.5 9h6c1.3 0 2.2 1.2 1.9 2.4l-1.8 7c-.3 1.2-1.3 2-2.5 2H7zM3.5 11.5H7v9H3.5z", local.thanks, Math.round(data.helpful / 3)],
      ["heart", local.love, Math.round(data.helpful / 2)],
      ["M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM8.5 16c1-1.3 2.1-2 3.5-2s2.5.7 3.5 2M9 10h.01M15 10h.01", local.ohno, Math.round(data.helpful / 9)],
    ];
    const bw = (env.w - 32 - 3 * 6) / 4;
    buttons.forEach(([icon, label, value], index) => {
      const bx = 16 + index * (bw + 6);
      ctx.strokeStyle = c.line;
      ctx.lineWidth = 1;
      rrect(ctx, bx + 0.5, y + 0.5, bw - 1, 42, 6);
      ctx.stroke();
      glyph(ctx, icon, bx + bw / 2 - 9, y + 4, 18, c.fg, { line: 1.8 });
      text(ctx, clip(ctx, value ? `${label} ${value}` : label, bw - 6, { size: 11 }), bx + bw / 2, y + 36, { size: 11, color: c.fg, align: "center" });
    });
    fillRect(ctx, 0, h - 8, env.w, 8, c.fill);
  },
  hotspots: (data, env, h) => [
    { x: 16 + (env.w - 32 - 18) / 8, y: h - 8 - 35, kind: "like" },
    ...(data.photos.length ? [{ x: env.w / 2, y: h - 8 - 56 - 14 - REVIEW_PHOTO / 2, kind: "open" as const }] : []),
  ],
};

const section: Painter<{ title: string; sub: string }> = {
  measure: () => 64,
  paint(ctx, data, env, h) {
    const c = colors(env.mode);
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    text(ctx, data.title, 16, 32, { size: 22, weight: 800, color: c.fg, family: '"Poppins", system-ui, -apple-system, sans-serif' });
    text(ctx, data.sub, 16, 52, { size: 14, color: c.sub });
  },
};

const SEARCH: Record<Lang, string> = { en: "Search for burgers, delivery, barbers…", ko: "버거, 배달, 미용실 검색…", ja: "バーガー、デリバリー、美容院を検索…", es: "Busca hamburguesas, delivery, barberías…" };
const CHIPS: Record<Lang, string[]> = {
  en: ["Restaurants", "Takeout", "Delivery", "Coffee", "Bars"],
  ko: ["음식점", "포장", "배달", "카페", "바"],
  ja: ["レストラン", "テイクアウト", "デリバリー", "カフェ", "バー"],
  es: ["Restaurantes", "Para llevar", "Delivery", "Café", "Bares"],
};

const top: Painter<Record<string, never>> = {
  paint(ctx, _data, env, h) {
    const c = colors(env.mode);
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    const sy = 60;
    fillRect(ctx, 16, sy, env.w - 32, 44, c.fill, 22);
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 1;
    rrect(ctx, 16.5, sy + 0.5, env.w - 33, 43, 22);
    ctx.stroke();
    glyph(ctx, "search", 30, sy + 12, 20, c.fg, { line: 2.2 });
    text(ctx, clip(ctx, SEARCH[env.lang], env.w - 120, { size: 15 }), 60, sy + 28, { size: 15, color: c.sub });
    fillRect(ctx, env.w - 64, sy + 10, 1, 24, c.line);
    glyph(ctx, "M12 21.5s6.5-6.3 6.5-11.5a6.5 6.5 0 0 0-13 0c0 5.2 6.5 11.5 6.5 11.5zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z", env.w - 50, sy + 10, 24, c.fg, { line: 2 });
    let x = 16;
    const cy = sy + 54;
    CHIPS[env.lang].forEach((chip) => {
      const cw = width(ctx, chip, { size: 14, weight: 600 }) + 28;
      if (x + cw > env.w + 40) return;
      ctx.strokeStyle = c.line;
      ctx.lineWidth = 1;
      fillRect(ctx, x, cy, cw, 34, c.chip, 17);
      rrect(ctx, x + 0.5, cy + 0.5, cw - 1, 33, 17);
      ctx.stroke();
      text(ctx, chip, x + 14, cy + 22, { size: 14, weight: 600, color: c.fg });
      x += cw + 8;
    });
    fillRect(ctx, 0, h - 0.5, env.w, 0.5, c.line);
  },
};

const TABS: Record<Lang, string[]> = {
  en: ["Search", "Projects", "Me", "Collections", "More"],
  ko: ["검색", "프로젝트", "내 정보", "컬렉션", "더 보기"],
  ja: ["検索", "プロジェクト", "マイページ", "コレクション", "その他"],
  es: ["Buscar", "Proyectos", "Yo", "Colecciones", "Más"],
};

const bottom: Painter<Record<string, never>> = {
  paint(ctx, _data, env, h) {
    const c = colors(env.mode);
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    fillRect(ctx, 0, 0, env.w, 0.5, c.line);
    const icons = ["search", "M4 8h16v12H4zM9 8V5h6v3M4 13h16", "user", "bookmark", "more"];
    const step = env.w / 5;
    TABS[env.lang].forEach((label, index) => {
      const cx = step * (index + 0.5);
      const active = index === 0;
      const color = active ? c.red : c.sub;
      glyph(ctx, icons[index]!, cx - 12, 8, 24, color, { line: index === 4 ? 3 : active ? 2.4 : 1.8 });
      text(ctx, label, cx, 45, { size: 10.5, weight: active ? 700 : 500, color, align: "center" });
    });
    fillRect(ctx, env.w / 2 - 67, h - 13, 134, 5, c.fg, 3);
  },
};

export const YELP_PAINTERS = {
  "yelp.venue": venue,
  "yelp.review": review,
  "yelp.section": section,
  "yelp.top": top,
  "yelp.bottom": bottom,
};
