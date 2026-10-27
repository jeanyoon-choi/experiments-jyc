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
};

export const LIQUID_DEFAULTS: Liquid = { duration: 2.4, melt: 1, soften: 3.2, wobble: 0.05, ripple: 0.35, overshoot: 0.18, swell: 0.85, mercury: 0.6 };

export type LiquidControl = { key: keyof Liquid; label: string; min: number; max: number; step: number };

export const LIQUID_CONTROLS: readonly LiquidControl[] = [
  { key: "duration", label: "모핑 시간 (초)", min: 0.4, max: 8, step: 0.05 },
  { key: "melt", label: "녹는 정도", min: 0, max: 1, step: 0.01 },
  { key: "soften", label: "녹을 때 뭉개짐 (디테일)", min: 0, max: 6, step: 0.05 },
  { key: "wobble", label: "출렁임 (윤곽)", min: 0, max: 0.2, step: 0.005 },
  { key: "ripple", label: "물결 (표면)", min: 0, max: 1, step: 0.01 },
  { key: "overshoot", label: "탄성 (지나쳤다 돌아옴)", min: 0, max: 0.5, step: 0.01 },
  { key: "swell", label: "방울 높이", min: 0.2, max: 1.5, step: 0.01 },
  { key: "mercury", label: "수은화 (녹을 때 거울)", min: 0, max: 1, step: 0.01 },
];

