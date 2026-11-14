// What the panel sets (panels/options-panel.tsx) and the scene reads (scene.ts).

export type Settings = {
  /** 0 one fish; 1 a wall. */
  wall: number;
  /** Mobiles across and up the wall. */
  size: number;
  /** Space between the wall's mobiles, world units (a mobile is 0.705 wide). */
  gap: number;
  /** The fish's size; 1 is a fish about 1.2 long against a mobile 1.5 high. */
  fish: number;
  /** How fast the feeds move on; 1 is their own pace. */
  pace: number;
};

// 금붕어 0.8 (user, 2026-11-13: a little smaller).
export const DEFAULTS: Settings = { wall: 0, size: 10, gap: 0.05, fish: 0.8, pace: 1 };

export type Control = { key: Exclude<keyof Settings, "wall">; label: string; min: number; max: number; step: number; digits: number };

export const WALL_CONTROLS: readonly Control[] = [
  { key: "size", label: "벽 크기 (가로 · 세로 대수)", min: 2, max: 15, step: 1, digits: 0 },
  { key: "gap", label: "모바일 사이 간격", min: 0, max: 1.5, step: 0.01, digits: 2 },
];
export const COMMON_CONTROLS: readonly Control[] = [
  { key: "fish", label: "금붕어 크기", min: 0.4, max: 1.3, step: 0.01, digits: 2 },
  { key: "pace", label: "넘기는 속도", min: 0.25, max: 4, step: 0.05, digits: 2 },
];
