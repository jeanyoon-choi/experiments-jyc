// 브랜드 색: each logo's brand colour, apart from its path (marks.ts), so the object pass tints the logos on the main
// thread without taking simple-icons' paths with it. The hexes are simple-icons 16.25's (OpenAI's and Windows' as
// marks.ts gives them); shapes.test.ts holds the two files to each other.

import type { LogoKind } from "../kinds/groups.ts";

/** A mark's brand colour (hex, no #). */
export const BRAND_HEX: Record<LogoKind, string> = {
  claude: "D97757",
  openai: "000000",
  gemini: "8E75B2",
  deepseek: "5786FE",
  apple: "000000",
  meta: "0467DF",
  nvidia: "76B900",
  x: "000000",
  tesla: "CC0000",
  windows: "0078D4",
  instagram: "FF0069",
  tiktok: "000000",
  bitcoin: "F7931A",
  android: "3DDC84",
};

/** A mark's brand colour, 0–1. */
export function brandOf(kind: LogoKind): [number, number, number] {
  const value = Number.parseInt(BRAND_HEX[kind], 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}
