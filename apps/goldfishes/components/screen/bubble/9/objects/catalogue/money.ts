// 달러·센트 (bubble/9, user 2026-11-05, in place of 카지노·주화): the real thing in circulation, the 1 dollar bill
// (series 2009, 156 × 66 mm) and the 1 cent (19.05 mm, Lincoln obverse), each blown up as one gentle volume
// (the note a cushion, the coin a domed disc with its raised rim) with its own design as relief over it
// (money-reliefs.ts: the cent's die, the note's print). The material covers them whole.

import { BILL_RELIEF, CENT_RELIEF } from "./money-reliefs.ts";
import type { CatalogueGroup, ReliefMake } from "./types.ts";

function circle(r: number, clockwise = true) {
  const steps = 96;
  const points = Array.from({ length: steps }, (_, index) => {
    const a = ((clockwise ? index : -index) / steps) * Math.PI * 2;
    return `${(r * Math.sin(a)).toFixed(2)} ${(-r * Math.cos(a)).toFixed(2)}`;
  });
  return `M${points.join("L")}Z`;
}

function roundRect(x: number, y: number, w: number, h: number, r: number) {
  return `M${x + r} ${y}H${x + w - r}Q${x + w} ${y} ${x + w} ${y + r}V${y + h - r}Q${x + w} ${y + h} ${x + w - r} ${y + h}H${x + r}Q${x} ${y + h} ${x} ${y + h - r}V${y + r}Q${x} ${y} ${x + r} ${y}Z`;
}

/** The note, 156 × 66 mm as the scan's 480 × 205: a soft cushion with the print standing on it. */
const bill: ReliefMake = {
  source: "relief",
  viewBox: [0, 0, 480, 205],
  fill: 1.3,
  layers: [{ d: roundRect(0, 0, 480, 205, 6), height: 0.1, puff: 0.45 }],
  detail: { ...BILL_RELIEF, depth: 0.03 },
};

/** The cent: domed disc, raised rim, Lincoln's die. */
const cent: ReliefMake = {
  source: "relief",
  viewBox: [0, 0, 288, 288],
  fill: 1.1,
  layers: [
    { d: circle(144).replace(/(-?\d+\.\d+) (-?\d+\.\d+)/g, (_, x: string, y: string) => `${Number(x) + 144} ${Number(y) + 144}`), height: 0.12, puff: 0.55 },
    {
      d: (circle(144) + circle(134, false)).replace(/(-?\d+\.\d+) (-?\d+\.\d+)/g, (_, x: string, y: string) => `${Number(x) + 144} ${Number(y) + 144}`),
      height: 0.04,
      puff: 0.6,
    },
  ],
  detail: { ...CENT_RELIEF, depth: 0.035 },
};

const money: CatalogueGroup = {
  id: "money",
  label: "달러·센트",
  kinds: [
    { id: "moneyDollar", label: "1달러 지폐", feed: "Dollar", sub: "화폐", make: bill, source: "US 1 dollar bill, series 2009 obverse (public domain, Wikimedia Commons)" },
    { id: "moneyCent", label: "1센트 동전", feed: "Cent", sub: "화폐", make: cent, source: "US 1 cent, 2010 obverse, US Mint (public domain, Wikimedia Commons)" },
  ],
};
export default money;
