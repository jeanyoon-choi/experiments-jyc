// 주식 종목 (bubble/9, user 2026-11-05): US stock tickers as their capitals alone, the way a quote board prints them,
// each word one relief layer of Geist Regular outlines (geist.ts) grown to a readable weight and blown up letter by
// letter as 통화 기호 are; the material covers them whole. Listings: NASDAQ, and NYSE for ORCL, CRM, IBM, TSM, SNOW, UBER.

import { CAP, lettering } from "./geist.ts";
import type { CatalogueGroup, CatalogueKind } from "./types.ts";

/** How much each letter grows (object units) before it is blown up: Regular's strokes made plump, counters kept open. */
const WEIGHT = 0.05;
/** The letters' balloon over a plain mark's, so a word stands as full as a currency sign. */
const PUFF = 1.7;

const TICKERS: readonly (readonly [string, string, string])[] = [
  ["AAPL", "Apple", "빅테크"],
  ["MSFT", "Microsoft", "빅테크"],
  ["NVDA", "NVIDIA", "빅테크"],
  ["GOOG", "Alphabet", "빅테크"],
  ["AMZN", "Amazon", "빅테크"],
  ["META", "Meta", "빅테크"],
  ["TSLA", "Tesla", "빅테크"],
  ["NFLX", "Netflix", "빅테크"],
  ["AVGO", "Broadcom", "반도체"],
  ["AMD", "AMD", "반도체"],
  ["INTC", "Intel", "반도체"],
  ["TSM", "TSMC", "반도체"],
  ["ARM", "Arm", "반도체"],
  ["QCOM", "Qualcomm", "반도체"],
  ["ORCL", "Oracle", "소프트웨어·플랫폼"],
  ["ADBE", "Adobe", "소프트웨어·플랫폼"],
  ["CRM", "Salesforce", "소프트웨어·플랫폼"],
  ["IBM", "IBM", "소프트웨어·플랫폼"],
  ["PLTR", "Palantir", "소프트웨어·플랫폼"],
  ["SNOW", "Snowflake", "소프트웨어·플랫폼"],
  ["UBER", "Uber", "소프트웨어·플랫폼"],
  ["ABNB", "Airbnb", "소프트웨어·플랫폼"],
  ["PYPL", "PayPal", "소프트웨어·플랫폼"],
  ["COIN", "Coinbase", "소프트웨어·플랫폼"],
];

const kinds: CatalogueKind[] = TICKERS.map(([ticker, company, sub]) => {
  const d = lettering(ticker, CAP, 0, 0, 0.04);
  return {
    id: `ticker${ticker[0]}${ticker.slice(1).toLowerCase()}`,
    label: ticker,
    feed: company,
    sub,
    source: `${company}'s ticker; Geist Regular (Vercel, SIL OFL 1.1)`,
    make: { source: "relief", viewBox: [-200, -60, 400, 120], layers: [{ d, height: 0.1, bold: WEIGHT, puff: PUFF }] },
  };
});

const tickers: CatalogueGroup = { id: "tickers", label: "주식 종목", kinds };
export default tickers;
