// Robinhood as a phone uses it (Greed's market, NOTES 1017): the hype as a
// ticker that only goes up — a portfolio header, rows with sparklines, news,
// price alerts, a Buy button; its notification the alert itself.

import { headline } from "../../content/voice";
import type { Random } from "../../model/random";
import type { Lang } from "../../paint/types";
import type { AppDef, ItemContext } from "../types";
import type { StockAlert, StockCard, StockNews, StockPortfolio } from "./paint";

const TICKERS: Record<string, string> = {
  sparkle: "SPRK",
  cloud: "NIMB",
  gpu: "GPUX",
  robot: "BOTZ",
  humanoid: "HALO",
  robotDog: "QDRA",
  roadster: "VOLT",
  headset: "PRLX",
  ape: "APEZ",
  rocket: "APGE",
  chat: "PRLN",
  spinner: "WAVE",
  heart: "LUVV",
  like: "GLMP",
  comment: "REEL",
};

const SOURCES = ["Bullwire", "MarketPulse", "The Ticker Daily", "Alpha Brief", "Moonrise Capital Notes"];

function ticker(ctx: ItemContext) {
  return TICKERS[ctx.keyword] ?? `${ctx.label.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3) || "HYP"}X`;
}

/** A jagged walk ending `change` above or below its start. */
function walk(rng: Random, n: number, change: number) {
  const points: number[] = [];
  let value = 0;
  for (let index = 0; index < n; index += 1) {
    value += (change / n) * rng.range(0.2, 1.8) + rng.range(-1, 1) * Math.abs(change) * 0.06 + rng.range(-0.004, 0.004);
    points.push(value);
  }
  points[n - 1] = change;
  return points.map((point) => 1 + point);
}

const ALERTS: Record<Lang, (t: string, pct: string, up: boolean) => string> = {
  en: (t, pct, up) => `$${t} is ${up ? "up" : "down"} ${pct}% today`,
  ko: (t, pct, up) => `$${t} 오늘 ${pct}% ${up ? "상승" : "하락"}`,
  ja: (t, pct, up) => `$${t}が本日${pct}%${up ? "上昇" : "下落"}`,
  es: (t, pct, up) => `$${t} ${up ? "sube" : "baja"} un ${pct.replace(".", ",")} % hoy`,
};

function move(ctx: ItemContext) {
  const up = ctx.fresh || ctx.rng.chance(0.72);
  const size = ctx.fresh ? ctx.rng.range(0.08, 0.32) : ctx.rng.range(0.004, 0.18);
  return up ? size : -size;
}

export const stocks: AppDef = {
  id: "stocks",
  name: "Robinhood",
  kind: "feed",
  mode: (persona) => (persona.mode === "light" && persona.seed % 3 === 0 ? "light" : "dark"),
  bg: (mode) => (mode === "dark" ? "#000000" : "#ffffff"),
  top: 98,
  bottom: 83,
  opening(ctx) {
    const change = ctx.rng.range(-0.04, 0.14);
    const data: StockPortfolio = { value: ctx.rng.range(800, 60_000), change, points: walk(ctx.rng, 64, change), power: ctx.rng.range(0, 90) };
    return [{ painter: "stocks.portfolio", data }];
  },
  item(ctx) {
    const { rng } = ctx;
    const symbol = ticker(ctx);
    const change = move(ctx);
    const roll = ctx.fresh ? 0 : rng();
    if (roll < 0.5) {
      const data: StockCard = {
        symbol,
        name: ctx.event.org,
        price: rng.range(4, 900),
        change,
        points: walk(rng, 40, change),
        shares: rng.chance(0.5) ? rng.int(40) + 1 : 0,
        buy: ctx.fresh || rng.chance(0.35),
      };
      return { painter: "stocks.card", data };
    }
    if (roll < 0.8) {
      const data: StockNews = { source: rng.pick(SOURCES), minutes: rng.range(2, 300), headline: headline(ctx.lang, ctx.event, ctx.label, rng), photo: ctx.photo("any"), symbol, change };
      return { painter: "stocks.news", data };
    }
    const data: StockAlert = { symbol, body: ALERTS[ctx.lang](symbol, (Math.abs(change) * 100).toFixed(1), change > 0), change };
    return { painter: "stocks.alert", data };
  },
  notify(ctx) {
    const change = move(ctx);
    return { title: "Robinhood", body: ALERTS[ctx.lang](ticker(ctx), (Math.abs(change) * 100).toFixed(1), change > 0) };
  },
};
