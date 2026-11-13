// 액체 모핑's settings (user, 2026-10-27): the 랩's sliders, shared with the raft's morphs (morph.ts).

/** The liquid's settings (the 랩's sliders; shared with the raft's morphs). */
export type Liquid = {
  /** Seconds one morph takes. */
  duration: number;
  /** How far the object melts, 0 (a solid cross-fade of outlines) … 1 (a drop of liquid metal). */
  melt: number;
  /** How much detail the melt washes out (mip levels of the fields). */
  soften: number;
  /** The outline's jiggle while melted, object units. */
  wobble: number;
  /** Ripples running over the melted surface. */
  ripple: number;
  /** How far the shape overshoots before it settles, 0 … 0.5. */
  overshoot: number;
  /** Height of the drop over its inscribed radius (1: a sphere's). */
  swell: number;
  /** While melted, the coat turns to bare mirror (the T-1000's mercury), 0 … 1. */
  mercury: number;
  /** How pages move on and set: an index into MORPH_STYLES. */
  style: number;
};

/**
 * Three ways the raft's objects move on and set, kept side by side while the user decides (2026-11-06; settings.ts
 * SETUPS: B opens on the first, C on the second, A on the third; components/bubble/docs/9.md):
 *   금붕어 — a page moves on once the goldfish have watched it (frame-loop.ts pageTurns) and sets solid between;
 *   시계 — every page moves on on its own beat every `change` s, never quite sets (a melt floor `residue` the outline
 *          sways on) and rings down as it sets (`ring`);
 *   시계 · 굳음 — bubble/7–8's: every page moves on on its own beat every 14 s, a quick morph, set solid between
 *          (user, 2026-11-13).
 */
export const MORPH_STYLES = [
  { id: "attention", label: "금붕어가 볼 때", duration: 8, change: 0, residue: 0, ring: false },
  { id: "clock", label: "시계 · 늘 출렁임", duration: 8, change: 7, residue: 0.45, ring: true },
  { id: "clock-solid", label: "시계 · 굳음", duration: 2.4, change: 14, residue: 0, ring: false },
] as const;
export type MorphStyle = (typeof MORPH_STYLES)[number];
export const styleOf = (liquid: Liquid): MorphStyle => MORPH_STYLES[Math.round(liquid.style)] ?? MORPH_STYLES[0];

// bubble/9 (user, 2026-11-06): 4 s, then 8 s (2026-11-07), no detail washed out (bubble/7–8: 2.4 s, 3.2); and as the user tuned bubble/8: a
// stronger sway 0.125 and ripples 0.78, no overshoot, the drop 0.91 high (were 0.05, 0.35, 0.18, 0.85).
export const LIQUID_DEFAULTS: Liquid = { duration: MORPH_STYLES[0].duration, melt: 1, soften: 0, wobble: 0.125, ripple: 0.78, overshoot: 0, swell: 0.91, mercury: 0.6, style: 0 };

export type LiquidControl = { key: keyof Liquid; label: string; min: number; max: number; step: number };

export const LIQUID_CONTROLS: readonly LiquidControl[] = [
  { key: "duration", label: "모핑 시간 (초)", min: 0.4, max: 16, step: 0.05 },
  { key: "melt", label: "녹는 정도", min: 0, max: 1, step: 0.01 },
  { key: "soften", label: "녹을 때 뭉개짐 (디테일)", min: 0, max: 6, step: 0.05 },
  { key: "wobble", label: "출렁임 (윤곽)", min: 0, max: 0.2, step: 0.005 },
  { key: "ripple", label: "물결 (표면)", min: 0, max: 1, step: 0.01 },
  { key: "overshoot", label: "탄성 (지나쳤다 돌아옴)", min: 0, max: 0.5, step: 0.01 },
  { key: "swell", label: "방울 높이", min: 0.2, max: 1.5, step: 0.01 },
  { key: "mercury", label: "수은화 (녹을 때 거울)", min: 0, max: 1, step: 0.01 },
];

