// What each place on the face is sold as. Prices are list prices in won from
// Gangnam clinic listings read on 2026-11-16 (sources in the experiment note);
// `forehead` and `skin` are estimates, not found in a listing.

export type Tool = "scalpel" | "scissors" | "syringe";

export type Item = { key: string; label: string; price: number; tool: Tool };

/** Amount that counts, and is billed, as one operation: 1.6 s of pressing. */
export const UNIT = 4;

export const CATALOG: readonly Item[] = [
  { key: "eye", label: "쌍꺼풀", price: 850_000, tool: "scalpel" },
  { key: "inner", label: "앞트임", price: 1_040_000, tool: "scissors" },
  { key: "outer", label: "뒤트임", price: 1_040_000, tool: "scissors" },
  { key: "bridge", label: "콧대", price: 1_840_000, tool: "scalpel" },
  { key: "tip", label: "코끝", price: 1_460_000, tool: "scalpel" },
  { key: "alar", label: "콧볼축소", price: 1_000_000, tool: "scissors" },
  { key: "lips", label: "입술필러", price: 150_000, tool: "syringe" },
  { key: "corner", label: "입꼬리", price: 1_309_000, tool: "scalpel" },
  { key: "philtrum", label: "인중축소", price: 1_309_000, tool: "scalpel" },
  { key: "cheek", label: "광대축소", price: 2_189_000, tool: "scalpel" },
  { key: "jaw", label: "사각턱", price: 2_189_000, tool: "scalpel" },
  { key: "chin", label: "턱끝", price: 1_650_000, tool: "scalpel" },
  { key: "forehead", label: "이마지방이식", price: 1_500_000, tool: "syringe" },
  { key: "skin", label: "물광주사", price: 200_000, tool: "syringe" },
];

export const SKIN_ITEM = CATALOG.length - 1;

/** Catalogue row of a procedure id such as `inner-a`. */
export function itemOf(id: string) {
  const key = id.replace(/-[ab]$/, "");
  return { index: CATALOG.findIndex((item) => item.key === key) };
}

export const won = (value: number) => Math.round(value).toLocaleString("ko-KR");
