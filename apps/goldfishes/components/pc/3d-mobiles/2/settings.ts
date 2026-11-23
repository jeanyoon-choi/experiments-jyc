// What the panel sets (panels/options-panel.tsx) and the scene reads (scene.ts). Every value is a number, so a choice
// among a few is the index of the one chosen.

export type Settings = {
  /** The arrangement (ARRANGEMENTS): 0 one fish; 1 a wall, as many across as up; 2 a wall fitted to the window's shape. */
  wall: number;
  /** Mobiles across and up the wall (벽). */
  size: number;
  /** Mobiles in the wall fitted to the window (화면 맞춤). */
  count: number;
  /** Space between the wall's mobiles, world units (a mobile is 0.705 wide). */
  gap: number;
  /** The fish's size; 1 is a fish about 1.2 long against a mobile 1.5 high. */
  fish: number;
  /** How fast the screens are used; 1 is their own pace. */
  pace: number;
  /** What is on the glass (SCREENS): 0 the working interfaces, 1 the clips. */
  screens: number;
  /** Where the interfaces' events come from (FEEDS): 0 the stand-in in this browser, 1 the main screen over socket feed/1. */
  feed: number;
  /** How the fish is at its mobile (HOLDS): 0 holding it by its edges, 1 reaching to where the glass is touched. */
  hold: number;
  /** Sheet pixels shared by all the interfaces' glasses, in millions. */
  budget: number;
  /** Mean seconds between app changes on a mobile. */
  hop: number;
  /** Full-screen ads and checkouts, per minute per mobile. */
  ads: number;
  /** The background (GROUNDS): 0 white, 1 black. */
  ground: number;
};

export const ARRANGEMENTS = ["한 마리", "벽", "화면 맞춤"] as const;
export const GROUNDS = ["흰색", "검정"] as const;
/** The colour of each, in the same order. */
export const GROUND_COLOURS = ["#fff", "#000"] as const;
export const SCREENS = ["인터페이스", "클립"] as const;
export const FEEDS = ["데모", "메인 스크린"] as const;
export const HOLDS = ["가장자리 잡기", "터치 지점까지"] as const;

// Opens on 화면 맞춤, the interfaces and a black background, 금붕어 0.4 (user, 2026-11-23; it opened on 벽 with 금붕어 0.8, as pc/3d-mobiles/1).
export const DEFAULTS: Settings = { wall: 2, size: 10, count: 100, gap: 0.05, fish: 0.4, pace: 1, screens: 0, feed: 0, hold: 0, budget: 6, hop: 3.6, ads: 1.6, ground: 1 };

/** The values that set the picture up again when they change; the rest are read live. */
export const STRUCTURAL: readonly (keyof Settings)[] = ["wall", "size", "count", "gap", "fish", "screens", "feed", "budget"];

export type Control = { key: keyof Settings; label: string; min: number; max: number; step: number; digits: number };

export const WALL_CONTROLS: readonly Control[] = [
  { key: "size", label: "벽 크기 (가로 · 세로 대수)", min: 2, max: 15, step: 1, digits: 0 },
  { key: "gap", label: "모바일 사이 간격", min: 0, max: 1.5, step: 0.01, digits: 2 },
];
/** 화면 맞춤 (user, 2026-11-23): the rows and columns follow the window, as pc/2d-mobiles/2's field does. */
export const FIT_CONTROLS: readonly Control[] = [
  { key: "count", label: "모바일 수", min: 2, max: 225, step: 1, digits: 0 },
  { key: "gap", label: "모바일 사이 간격", min: 0, max: 1.5, step: 0.01, digits: 2 },
];
export const COMMON_CONTROLS: readonly Control[] = [
  { key: "fish", label: "금붕어 크기", min: 0.2, max: 1.3, step: 0.01, digits: 2 },
  { key: "pace", label: "쓰는 속도", min: 0.25, max: 4, step: 0.05, digits: 2 },
];
export const INTERFACE_CONTROLS: readonly Control[] = [
  { key: "hop", label: "앱 바뀌는 간격 (초)", min: 1, max: 12, step: 0.2, digits: 1 },
  { key: "ads", label: "전면 광고 · 결제 (분당)", min: 0, max: 8, step: 0.2, digits: 1 },
  { key: "budget", label: "화면 해상도 (백만 픽셀)", min: 2, max: 16, step: 1, digits: 0 },
];
