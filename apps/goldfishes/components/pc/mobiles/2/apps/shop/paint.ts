// The deals app (Gluttony, NOTES 1017), painted: the bars, the flash-sale
// banner with its countdown, and a two-up product grid tile — photo, price,
// the crossed-out price, % off, "sold", stars. Temu's orange.

import { count, cover, fillRect, glyph, paragraph, rrect, text, width } from "../../paint/kit";
import type { Ctx, Lang, Mode, Painter } from "../../paint/types";
import { ui } from "../../content/voice";

export type ShopProduct = {
  photo: string;
  title: string;
  price: number;
  was: number;
  sold: number;
  rating: number;
  reviews: number;
  badge: "" | "lightning" | "local" | "almost";
  sponsored: boolean;
};
export type ShopGrid = { products: ShopProduct[] };
export type ShopFlash = { seconds: number; products: { photo: string; price: number; was: number; claimed: number }[] };

const ORANGE = "#fb7701";
const BOLT = "M13.5 2 4.5 13.5h6.5L9.5 22l9-11.5H12z";

const colors = (mode: Mode) =>
  mode === "dark"
    ? { bg: "#121212", fg: "#f1f1f1", sub: "#9a9a9a", line: "#2a2a2a", fill: "#1f1f1f", star: "#f1f1f1" }
    : { bg: "#ffffff", fg: "#222222", sub: "#777777", line: "#ececec", fill: "#f4f4f4", star: "#222222" };

const WORDS: Record<Lang, { lightning: string; local: string; almost: string; claimed: string; tabs: string[]; nav: string[] }> = {
  en: { lightning: "Lightning deal", local: "Local", almost: "Almost sold out", claimed: "claimed", tabs: ["All", "Women", "Home", "Men", "Electronics", "Toys"], nav: ["Home", "Categories", "You", "Cart"] },
  ko: { lightning: "번개 특가", local: "국내 배송", almost: "품절 임박", claimed: "판매됨", tabs: ["전체", "여성", "홈", "남성", "전자기기", "완구"], nav: ["홈", "카테고리", "MY", "장바구니"] },
  ja: { lightning: "稲妻セール", local: "国内倉庫", almost: "残りわずか", claimed: "販売済み", tabs: ["すべて", "レディース", "ホーム", "メンズ", "家電", "おもちゃ"], nav: ["ホーム", "カテゴリー", "マイページ", "カート"] },
  es: { lightning: "Oferta relámpago", local: "Almacén local", almost: "Casi agotado", claimed: "vendido", tabs: ["Todo", "Mujer", "Hogar", "Hombre", "Electrónica", "Juguetes"], nav: ["Inicio", "Categorías", "Tú", "Carrito"] },
};

/** Dollars in the reader's currency, as a deals app rounds them. */
function money(usd: number, lang: Lang) {
  if (lang === "ko") return `₩${(Math.round((usd * 1380) / 100) * 100).toLocaleString("en-US")}`;
  if (lang === "ja") return `¥${(Math.round((usd * 152) / 10) * 10).toLocaleString("en-US")}`;
  if (lang === "es") return `${(usd * 0.92).toFixed(2).replace(".", ",")} €`;
  return `$${usd.toFixed(2)}`;
}

const off = (item: { price: number; was: number }) => Math.round((1 - item.price / item.was) * 100);

function stars(ctx: Ctx, x: number, y: number, rating: number, color: string) {
  for (let index = 0; index < 5; index += 1) {
    const fill = Math.max(0, Math.min(1, rating - index));
    glyph(ctx, "star", x + index * 12, y, 11, color, { line: 1.6 });
    if (fill > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + index * 12, y, 11 * fill, 11);
      ctx.clip();
      glyph(ctx, "star", x + index * 12, y, 11, color, { fill: true });
      ctx.restore();
    }
  }
}

const GAP = 8;
const PAD = 8;
const GRID_H = 300;

function tile(ctx: Ctx, item: ShopProduct, image: ImageBitmap | null, x: number, cw: number, lang: Lang, mode: Mode) {
  const c = colors(mode);
  const words = WORDS[lang];
  cover(ctx, image, x, 4, cw, cw, 6, item.photo);
  if (item.badge === "lightning" || item.badge === "local") {
    const label = item.badge === "lightning" ? words.lightning : words.local;
    const bw = width(ctx, label, { size: 11, weight: 700 }) + (item.badge === "lightning" ? 26 : 14);
    ctx.save();
    rrect(ctx, x, 4, cw, cw, 6);
    ctx.clip();
    fillRect(ctx, x, 4 + cw - 22, bw, 22, item.badge === "lightning" ? ORANGE : "#0a8800");
    if (item.badge === "lightning") glyph(ctx, BOLT, x + 5, 4 + cw - 18, 14, "#fff", { fill: true });
    text(ctx, label, x + (item.badge === "lightning" ? 21 : 7), 4 + cw - 7, { size: 11, weight: 700, color: "#fff" });
    ctx.restore();
  }
  let y = cw + 22;
  if (item.sponsored) {
    const ad = ui(lang).ad;
    const aw = width(ctx, ad, { size: 10, weight: 500 }) + 8;
    fillRect(ctx, x, y - 11, aw, 14, c.fill, 3);
    text(ctx, ad, x + 4, y, { size: 10, weight: 500, color: c.sub });
    paragraph(ctx, `${" ".repeat(Math.ceil(aw / 3.4))}${item.title}`, x, y, cw, { size: 13, line: 17, lines: 2, color: c.fg });
  } else paragraph(ctx, item.title, x, y, cw, { size: 13, line: 17, lines: 2, color: c.fg });
  y += 42;
  const pw = text(ctx, money(item.price, lang), x, y, { size: 18, weight: 700, color: ORANGE });
  const was = money(item.was, lang);
  const ww = width(ctx, was, { size: 12 });
  if (pw + ww + 6 < cw - 36) {
    text(ctx, was, x + pw + 5, y, { size: 12, color: c.sub });
    fillRect(ctx, x + pw + 5, y - 4, ww, 1, c.sub);
  }
  ctx.strokeStyle = c.fg;
  ctx.lineWidth = 1.2;
  rrect(ctx, x + cw - 30, y - 21, 30, 26, 13);
  ctx.stroke();
  glyph(ctx, "bag", x + cw - 23.5, y - 17, 17, c.fg, { line: 1.8 });
  glyph(ctx, "plus", x + cw - 14, y - 22, 9, c.fg, { line: 3.4 });
  y += 21;
  const pct = `-${off(item)}%`;
  const bw = width(ctx, pct, { size: 11, weight: 700 }) + 8;
  ctx.strokeStyle = ORANGE;
  ctx.lineWidth = 1;
  rrect(ctx, x + 0.5, y - 12.5, bw, 16, 3);
  ctx.stroke();
  text(ctx, pct, x + 4.5, y, { size: 11, weight: 700, color: ORANGE });
  const sold = item.badge === "almost" ? WORDS[lang].almost : `${count(item.sold, lang)}${lang === "en" || lang === "es" ? " " : ""}${ui(lang).sold}`;
  paragraph(ctx, sold, x + bw + 6, y, cw - bw - 6, { size: 12, color: item.badge === "almost" ? "#e02020" : c.sub, lines: 1 });
  y += 19;
  stars(ctx, x, y - 10, item.rating, c.star);
  text(ctx, count(item.reviews, lang), x + 64, y, { size: 11, color: c.sub });
}

const grid: Painter<ShopGrid> = {
  needs: (data) => data.products.map((item) => item.photo).filter(Boolean),
  measure: () => GRID_H,
  paint(ctx, data, env, h) {
    const c = colors(env.mode);
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    const cw = (env.w - PAD * 2 - GAP) / 2;
    data.products.slice(0, 2).forEach((item, index) => tile(ctx, item, env.image(item.photo), PAD + index * (cw + GAP), cw, env.lang, env.mode));
  },
  hotspots: (_data, env) => {
    const cw = (env.w - PAD * 2 - GAP) / 2;
    return [
      { x: PAD + cw - 15, y: cw + 64 - 8, kind: "button" },
      { x: PAD + cw / 2, y: 4 + cw / 2, kind: "open" },
    ];
  },
};

const FLASH_H = 252;

const flash: Painter<ShopFlash> = {
  needs: (data) => data.products.map((item) => item.photo).filter(Boolean),
  measure: () => FLASH_H,
  paint(ctx, data, env, h) {
    const c = colors(env.mode);
    const words = ui(env.lang);
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    const banner = ctx.createLinearGradient(0, 8, env.w, h);
    banner.addColorStop(0, "#ff8a00");
    banner.addColorStop(1, "#fb5a01");
    ctx.fillStyle = banner;
    rrect(ctx, PAD, 8, env.w - PAD * 2, h - 16, 10);
    ctx.fill();
    glyph(ctx, BOLT, PAD + 10, 19, 22, "#fff", { fill: true });
    ctx.save();
    ctx.transform(1, 0, -0.18, 1, 6, 0);
    text(ctx, words.sale, PAD + 36, 38, { size: 21, weight: 900, color: "#fff" });
    ctx.restore();
    const parts = [data.seconds / 3600, (data.seconds / 60) % 60, data.seconds % 60].map((n) => String(Math.floor(n)).padStart(2, "0"));
    let x = env.w - PAD - 12 - (parts.length * 24 + (parts.length - 1) * 8);
    text(ctx, words.ends, x - 6, 35, { size: 12, weight: 600, color: "#fff", align: "right" });
    parts.forEach((part, index) => {
      fillRect(ctx, x, 20, 24, 22, "#1a1a1a", 4);
      text(ctx, part, x + 12, 36, { size: 13, weight: 700, color: "#fff", align: "center", family: '"SF Mono", ui-monospace, Menlo, monospace' });
      if (index < parts.length - 1) text(ctx, ":", x + 28, 35, { size: 14, weight: 700, color: "#fff", align: "center" });
      x += 32;
    });
    const px = PAD + 6;
    const pw = env.w - PAD * 2 - 12;
    fillRect(ctx, px, 54, pw, h - 68, c.bg, 8);
    const cw = (pw - 32) / 3;
    data.products.slice(0, 3).forEach((item, index) => {
      const cx = px + 8 + index * (cw + 8);
      cover(ctx, env.image(item.photo), cx, 62, cw, cw * 0.9, 6, item.photo);
      const tag = `-${off(item)}%`;
      const tw = width(ctx, tag, { size: 11, weight: 800 }) + 8;
      fillRect(ctx, cx, 62, tw, 17, ORANGE, 6);
      fillRect(ctx, cx, 70, tw, 9, ORANGE);
      text(ctx, tag, cx + 4, 75, { size: 11, weight: 800, color: "#fff" });
      const top = 62 + cw * 0.9;
      text(ctx, money(item.price, env.lang), cx, top + 21, { size: 16, weight: 800, color: ORANGE });
      fillRect(ctx, cx, top + 30, cw, 14, env.mode === "dark" ? "#3a2412" : "#ffe6d2", 7);
      fillRect(ctx, cx, top + 30, Math.max(14, cw * item.claimed), 14, ORANGE, 7);
      paragraph(ctx, `${Math.round(item.claimed * 100)}% ${WORDS[env.lang].claimed}`, cx + 6, top + 41, cw - 10, { size: 9.5, weight: 700, color: "#fff", lines: 1 });
    });
  },
  hotspots: (_data, env) => [{ x: PAD + 14 + (env.w - PAD * 2 - 44) / 6, y: 62 + ((env.w - PAD * 2 - 44) / 3) * 0.45, kind: "button" }],
};

const top: Painter<{ search: string; cart: number }> = {
  paint(ctx, data, env, h) {
    const c = colors(env.mode);
    const words = WORDS[env.lang];
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    ctx.strokeStyle = c.fg;
    ctx.lineWidth = 2;
    rrect(ctx, 12, 59, env.w - 24, 38, 19);
    ctx.stroke();
    paragraph(ctx, data.search, 28, 83, env.w - 150, { size: 15, color: c.sub, lines: 1 });
    glyph(ctx, "M3.5 8h3l1.5-2.5h8L17.5 8h3v11h-17zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z", env.w - 96, 67, 22, c.fg, { line: 1.7 });
    fillRect(ctx, env.w - 66, 63, 50, 30, c.fg, 15);
    glyph(ctx, "search", env.w - 52, 67, 22, c.bg, { line: 2.4 });
    let x = 16;
    words.tabs.forEach((tab, index) => {
      if (x > env.w) return;
      const tw = text(ctx, tab, x, 128, { size: 15, weight: index === 0 ? 700 : 400, color: index === 0 ? c.fg : c.sub });
      if (index === 0) fillRect(ctx, x, 136, tw, 3, c.fg, 1.5);
      x += tw + 22;
    });
    fillRect(ctx, 0, h - 0.5, env.w, 0.5, c.line);
  },
};

const bottom: Painter<{ search: string; cart: number }> = {
  paint(ctx, data, env, h) {
    const c = colors(env.mode);
    const words = WORDS[env.lang];
    fillRect(ctx, 0, 0, env.w, h, c.bg);
    fillRect(ctx, 0, 0, env.w, 0.5, c.line);
    ["home", "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z", "user", "bag"].forEach((name, index) => {
      const cx = env.w * (0.125 + index * 0.25);
      glyph(ctx, name, cx - 12, 7, 24, index === 0 ? ORANGE : c.fg, { fill: index === 0, line: 1.7 });
      text(ctx, words.nav[index] ?? "", cx, 45, { size: 10.5, weight: index === 0 ? 600 : 400, color: index === 0 ? ORANGE : c.fg, align: "center" });
      if (index === 3) {
        fillRect(ctx, cx + 4, 3, 17, 17, "#e02020", 8.5);
        text(ctx, String(data.cart), cx + 12.5, 15.5, { size: 11, weight: 700, color: "#fff", align: "center" });
      }
    });
    fillRect(ctx, env.w / 2 - 67, h - 13, 134, 5, c.fg, 3);
  },
};

export const SHOP_PAINTERS = {
  "shop.flash": flash,
  "shop.grid": grid,
  "shop.top": top,
  "shop.bottom": bottom,
};
