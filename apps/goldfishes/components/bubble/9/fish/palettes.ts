// The goldfish's colours: the palettes the panel offers, the one each fish is
// dealt under 섞음, and the grey of the spent. Data for the panel and the scene
// (goldfish-scene.ts); the school itself knows no colour. Colours are sRGB.

import type { Rgb } from "./lifecycle.ts";
import { unit } from "./math.ts";

export type FishPaletteId = "classic" | "instagram" | "rose" | "sunset" | "poppy" | "pink" | "mix" | "mono";

export const FISH_PALETTES: Readonly<Record<FishPaletteId, { label: string; body: string; fin: string }>> = {
  classic: { label: "금붕어", body: "#cf741c", fin: "#e7b365" },
  instagram: { label: "인스타", body: "#ff5e29", fin: "#fed044" },
  rose: { label: "장미", body: "#f45b99", fin: "#ffc990" },
  sunset: { label: "노을", body: "#ef5551", fin: "#ffe179" },
  poppy: { label: "양귀비", body: "#e83c42", fin: "#f8a15d" },
  pink: { label: "분홍", body: "#e57687", fin: "#f6c0a4" },
  // Every fish its own colour, dealt from the coloured palettes (MIX_PALETTES); these are the fallback.
  mix: { label: "섞음", body: "#cf741c", fin: "#e7b365" },
  // Fully grey, to sit with the raft's near-monochrome film.
  mono: { label: "모노크롬", body: "#8a8a8a", fin: "#c4c4c4" },
};

/** The palettes 섞음 deals out, one per fish; 모노크롬 is left out (user, 2026-10-11). */
export const MIX_PALETTES: readonly FishPaletteId[] = ["classic", "instagram", "rose", "sunset", "poppy", "pink"];

/** The palette a fish wears under `palette`: that one, or under 섞음 the one its id (the whole of its seed) is dealt. */
export function paletteOf(palette: FishPaletteId, id: number): FishPaletteId {
  if (palette !== "mix") return palette;
  return MIX_PALETTES[Math.floor(unit(id, 1) * MIX_PALETTES.length)] ?? palette;
}

/** The pale grey a spent fish turns: body and fins (the monochrome palette, lightened). */
export const SPENT_BODY: Rgb = [0.66, 0.66, 0.66];
export const SPENT_FIN: Rgb = [0.84, 0.84, 0.84];

/** sRGB 0–1 from "#rrggbb". */
export function rgbOf(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255];
}
