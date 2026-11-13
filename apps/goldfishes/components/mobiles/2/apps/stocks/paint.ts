// Robinhood (Greed, NOTES 1017), painted: the bars, the portfolio header and
// its jagged line, a ticker row (or card with Buy), a news card, a price
// alert. Mostly dark, neon green up, orange-red down.

import { cover, fillRect, glyph, paragraph, paragraphHeight, rrect, text, width } from "../../paint/kit";
import type { Ctx, Lang, Mode, Painter } from "../../paint/types";
import { ago } from "../../content/voice";

export type StockPortfolio = { value: number; change: number; points: number[]; power: number };
export type StockCard = { symbol: string; name: string; price: number; change: number; points: number[]; shares: number; buy: boolean };
export type StockNews = { source: string; minutes: number; headline: string; photo: string; symbol: string; change: number };
export type StockAlert = { symbol: string; body: string; change: number };

const colors = (mode: Mode) =>
  mode === "dark"
    ? { bg: "#000000", fg: "#ffffff", sub: "#8f8f8f", line: "#1e1e1e", card: "#111111", up: "#00c805", down: "#ff5000", ink: "#000000" }
    : { bg: "#ffffff", fg: "#000000", sub: "#6f6f6f", line: "#ececec", card: "#f5f5f5", up: "#00c805", down: "#ff5000", ink: "#ffffff" };

const WORDS: Record<Lang, { investing: string; today: string; power: string; shares: (n: number) => string; buy: string; alert: string; view: string }> = {
  en: { investing: "Investing", today: "Today", power: "Buying power", shares: (n) => `${n} share${n === 1 ? "" : "s"}`, buy: "Buy", alert: "Price alert", view: "View" },
  ko: { investing: "투자", today: "오늘", power: "매수 가능 금액", shares: (n) => `${n}주`, buy: "매수", alert: "가격 알림", view: "보기" },
  ja: { investing: "投資", today: "今日", power: "買付余力", shares: (n) => `${n}株`, buy: "購入", alert: "価格アラート", view: "表示" },
  es: { investing: "Inversiones", today: "Hoy", power: "Poder de compra", shares: (n) => `${n} acci${n === 1 ? "ón" : "ones"}`, buy: "Comprar", alert: "Alerta de precio", view: "Ver" },
};

/** Dollars in the reader's currency. */
function money(usd: number, lang: Lang) {
  if (lang === "ko") return `₩${Math.round(usd * 1380).toLocaleString("en-US")}`;
  if (lang === "ja") return `¥${Math.round(usd * 152).toLocaleString("en-US")}`;
  const fixed = (lang === "es" ? usd * 0.92 : usd).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return lang === "es" ? `${fixed.replace(/,/g, " ").replace(".", ",").replace(/ /g, ".")} €` : `$${fixed}`;
}

const percent = (change: number) => `${change >= 0 ? "+" : "−"}${(Math.abs(change) * 100).toFixed(2)}%`;

function line(ctx: Ctx, points: number[], x: number, y: number, w: number, h: number, color: string, stroke = 2) {
  const min = Math.min(...points, 1);
  const max = Math.max(...points, 1);
  const span = max - min || 1;
  const at = (value: number) => y + h - ((value - min) / span) * h;
  ctx.setLineDash([1, 4]);
  ctx.strokeStyle = "rgba(143,143,143,0.7)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(x, at(1));
  ctx.lineTo(x + w, at(1));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.strokeStyle = color;
  ctx.lineWidth = stroke;
  ctx.lineJoin = "round";
  ctx.beginPath();
  points.forEach((value, index) => {
    const px = x + (index / (points.length - 1)) * w;
    if (index === 0) ctx.moveTo(px, at(value));
    else ctx.lineTo(px, at(value));
  });
  ctx.stroke();
  return { x: x + w, y: at(points[points.length - 1] ?? 1) };
}

function triangle(ctx: Ctx, x: number, y: number, up: boolean, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (up) {
    ctx.moveTo(x, y);
    ctx.lineTo(x + 5, y - 8);
    ctx.lineTo(x + 10, y);
  } else {
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x + 10, y - 8);
  }
  ctx.closePath();
  ctx.fill();
}

const RANGES = ["1D", "1W", "1M", "3M", "YTD", "1Y", "ALL"];

const portfolio: Painter<StockPortfolio> = {
  measure: () => 412,
  paint(ctx, data, env, h) {
    const c = colors(env.mode);
    const words = WORDS[env.lang];
    const color = data.change >= 0 ? c.up : c.down;
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    text(ctx, words.investing, 24, 22, { size: 15, weight: 500, color: c.fg });
    text(ctx, money(data.value, env.lang), 24, 64, { size: 36, weight: 600, color: c.fg });
    const delta = (data.value * data.change) / (1 + data.change);
    triangle(ctx, 24, 90, data.change >= 0, color);
    const tw = text(ctx, `${money(Math.abs(delta), env.lang)} (${percent(data.change).slice(1)})`, 40, 91, { size: 15, weight: 500, color });
    text(ctx, words.today, 46 + tw, 91, { size: 15, color: c.sub });
    const end = line(ctx, data.points, 0, 124, env.w - 4, 196, color);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.arc(end.x - 2, end.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.arc(end.x - 2, end.y, 4, 0, Math.PI * 2);
    ctx.fill();
    const step = (env.w - 32) / RANGES.length;
    RANGES.forEach((range, index) => {
      const cx = 16 + step * (index + 0.5);
      if (index === 0) fillRect(ctx, cx - 22, 334, 44, 28, color, 6);
      text(ctx, range, cx, 353, { size: 13, weight: 700, color: index === 0 ? c.ink : color, align: "center" });
    });
    fillRect(ctx, 0, 372, env.w, 1, c.line);
    text(ctx, words.power, 24, 398, { size: 15, color: c.fg });
    text(ctx, money(data.power, env.lang), env.w - 24, 398, { size: 15, color: c.fg, align: "right" });
  },
};

const ROW_H = 76;
const CARD_H = 292;

const card: Painter<StockCard> = {
  measure: (_ctx, data) => (data.buy ? CARD_H : ROW_H),
  paint(ctx, data, env, h) {
    const c = colors(env.mode);
    const words = WORDS[env.lang];
    const color = data.change >= 0 ? c.up : c.down;
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    if (!data.buy) {
      text(ctx, data.symbol, 24, 32, { size: 16, weight: 600, color: c.fg });
      paragraph(ctx, data.shares ? words.shares(data.shares) : data.name, 24, 53, 140, { size: 13, color: c.sub, lines: 1 });
      line(ctx, data.points, 170, 20, 96, 36, color, 1.6);
      fillRect(ctx, env.w - 108, 22, 84, 32, color, 6);
      text(ctx, percent(data.change), env.w - 66, 43, { size: 14, weight: 600, color: c.ink, align: "center" });
      fillRect(ctx, 24, h - 1, env.w - 48, 1, c.line);
      return;
    }
    text(ctx, `$${data.symbol}`, 24, 38, { size: 24, weight: 700, color: c.fg });
    paragraph(ctx, data.name, 24, 60, env.w - 48, { size: 14, color: c.sub, lines: 1 });
    text(ctx, money(data.price, env.lang), 24, 100, { size: 28, weight: 600, color: c.fg });
    triangle(ctx, 24, 122, data.change >= 0, color);
    const delta = money(Math.abs((data.price * data.change) / (1 + data.change)), env.lang);
    const tw = text(ctx, `${delta} (${percent(data.change).slice(1)})`, 40, 123, { size: 14, weight: 500, color });
    text(ctx, words.today, 46 + tw, 123, { size: 14, color: c.sub });
    line(ctx, data.points, 24, 140, env.w - 48, 70, color, 2);
    fillRect(ctx, 24, 226, env.w - 48, 48, color, 24);
    text(ctx, words.buy, env.w / 2, 256, { size: 17, weight: 700, color: c.ink, align: "center" });
    fillRect(ctx, 0, h - 1, env.w, 1, c.line);
  },
  hotspots: (data, env) => (data.buy ? [{ x: env.w / 2, y: 250, kind: "button" }] : [{ x: env.w - 66, y: 38, kind: "like" }]),
};

const NEWS_THUMB = 72;

const news: Painter<StockNews> = {
  needs: (data) => [data.photo].filter(Boolean),
  measure(ctx, data, env) {
    return Math.max(46 + paragraphHeight(ctx, data.headline, env.w - 48 - NEWS_THUMB - 12, { size: 16, weight: 600, line: 21, lines: 3 }), 22 + NEWS_THUMB) + 50;
  },
  paint(ctx, data, env, h) {
    const c = colors(env.mode);
    const color = data.change >= 0 ? c.up : c.down;
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    const sw = text(ctx, data.source, 24, 30, { size: 13, weight: 600, color: c.fg });
    text(ctx, `· ${ago(env.lang, data.minutes)}`, 30 + sw, 30, { size: 13, color: c.sub });
    paragraph(ctx, data.headline, 24, 54, env.w - 48 - NEWS_THUMB - 12, { size: 16, weight: 600, line: 21, lines: 3, color: c.fg });
    cover(ctx, env.image(data.photo), env.w - 24 - NEWS_THUMB, 18, NEWS_THUMB, NEWS_THUMB, 8, data.photo);
    const label = `${data.symbol}  ${percent(data.change)}`;
    const lw = width(ctx, label, { size: 13, weight: 600 }) + 20;
    ctx.strokeStyle = c.line;
    ctx.lineWidth = 1.5;
    rrect(ctx, 24, h - 46, lw, 28, 14);
    ctx.stroke();
    text(ctx, data.symbol, 34, h - 27, { size: 13, weight: 600, color: c.fg });
    text(ctx, percent(data.change), 34 + width(ctx, `${data.symbol}  `, { size: 13, weight: 600 }), h - 27, { size: 13, weight: 600, color });
    fillRect(ctx, 24, h - 1, env.w - 48, 1, c.line);
  },
  hotspots: (_data, _env, h) => [{ x: 60, y: h - 32, kind: "like" }],
};

const alert: Painter<StockAlert> = {
  measure: () => 108,
  paint(ctx, data, env, h) {
    const c = colors(env.mode);
    const words = WORDS[env.lang];
    const color = data.change >= 0 ? c.up : c.down;
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    fillRect(ctx, 16, 12, env.w - 32, h - 24, c.card, 14);
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(52, h / 2, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    glyph(ctx, "bell", 41, h / 2 - 11, 22, color, { line: 2 });
    text(ctx, words.alert, 84, h / 2 - 6, { size: 13, color: c.sub });
    paragraph(ctx, data.body, 84, h / 2 + 15, env.w - 84 - 110, { size: 15, weight: 600, color: c.fg, lines: 1 });
    const vw = width(ctx, words.view, { size: 14, weight: 600 }) + 28;
    fillRect(ctx, env.w - 32 - vw, h / 2 - 16, vw, 32, color, 16);
    text(ctx, words.view, env.w - 32 - vw / 2, h / 2 + 5, { size: 14, weight: 600, color: c.ink, align: "center" });
  },
  hotspots: (_data, env, h) => [{ x: env.w - 60, y: h / 2, kind: "button" }],
};

const top: Painter<Record<string, never>> = {
  paint(ctx, _data, env, h) {
    const c = colors(env.mode);
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    glyph(ctx, "search", env.w - 84, 64, 24, c.fg);
    glyph(ctx, "bell", env.w - 44, 64, 24, c.fg);
  },
};

const bottom: Painter<Record<string, never>> = {
  paint(ctx, _data, env, h) {
    const c = colors(env.mode);
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    fillRect(ctx, 0, 0, env.w, 0.5, c.line);
    [
      "chart",
      "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM9.5 8h3.5a2 2 0 0 1 0 4H9.5zM9.5 12H14a2 2 0 0 1 0 4H9.5zM9.5 8v8M11 6.5V8M11 16v1.5",
      "M3 12a9 9 0 0 1 18 0zM12 12v6.5a2 2 0 0 1-4 0",
      "search",
      "user",
    ].forEach((name, index) => glyph(ctx, name, env.w * (0.1 + index * 0.2) - 13, 12, 26, index === 0 ? c.fg : c.sub, { line: 2 }));
    fillRect(ctx, env.w / 2 - 67, h - 13, 134, 5, c.fg, 3);
  },
};

export const STOCKS_PAINTERS = {
  "stocks.portfolio": portfolio,
  "stocks.card": card,
  "stocks.news": news,
  "stocks.alert": alert,
  "stocks.top": top,
  "stocks.bottom": bottom,
};
