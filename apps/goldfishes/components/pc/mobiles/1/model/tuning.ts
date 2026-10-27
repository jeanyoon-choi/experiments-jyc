// The pc's own parameters, live from the option menu (controls/): how many
// phones, how they hop between apps, how urgently they scroll and flip. All
// of it is the browser's animation phase, so changing it touches nothing
// upstream (user, 2026-10-27: the parameters I care about, adjustable).
// The pace items arrive at is the screen's (transport/feed/1/slots.mjs).

export type HopStyle = "mix" | "open" | "slide" | "switcher" | "flip";

export type PcTuning = {
  phones: number;
  /**
   * Posts put on a second over the whole grid. Each phone puts one on below
   * every phones / this: the newest item its goldfish brought, or, when none
   * came, the feed feeding on itself. Each mounts one post (~120 mounts/s
   * saturated the dev server with 64 phones); 45/s is the default.
   */
  updatesPerSec: number;
  /** Under "mix": the share of app changes made by tapping a notification, 0–1 (the rest swipe the home bar or use the switcher). */
  hop: number;
  /** App changes a second over the whole grid (each phone about once per phones / this): each mounts a whole app, the dearest thing a phone does. */
  hopsPerSec: number;
  hopStyle: HopStyle;
  /** The hop's transition, ms. */
  hopMs: number;
  /** Flick speed ×. */
  scrollPace: number;
  /** Pause between flicks ×; lower is more frantic. */
  scrollPause: number;
  /** A feed's steady reading speed between flicks, px/s (it adapts to what is waiting below). */
  cruise: number;
  /** Notification banners a second over the whole grid. */
  bannersPerSec: number;
  /** How long a banner stays down, ms. */
  bannerMs: number;
};

export const PC_TUNING_DEFAULTS: PcTuning = {
  phones: 64,
  updatesPerSec: 45,
  hop: 0.45,
  hopsPerSec: 10,
  hopStyle: "mix",
  hopMs: 520,
  scrollPace: 1.9,
  scrollPause: 0.35,
  cruise: 260,
  bannersPerSec: 64,
  bannerMs: 1_700,
};

export const HOP_STYLES: readonly { id: HopStyle; label: string }[] = [
  { id: "mix", label: "섞기 (열기·밀기·전환기)" },
  { id: "open", label: "알림 눌러 열기" },
  { id: "slide", label: "홈 바 밀어 넘기기" },
  { id: "switcher", label: "앱 전환기" },
  { id: "flip", label: "뒤집기" },
];

type Range = { key: Exclude<keyof PcTuning, "hopStyle">; label: string; min: number; max: number; step: number; format: (value: number) => string };

const percent = (value: number) => `${Math.round(value * 100)}%`;
const ms = (value: number) => `${Math.round(value)} ms`;
const times = (value: number) => `×${value.toFixed(2)}`;

export const PHONE_RANGES: readonly Range[] = [
  { key: "phones", label: "폰 수", min: 4, max: 64, step: 1, format: (value) => String(value) },
  { key: "updatesPerSec", label: "전체 화면 갱신 / 초", min: 10, max: 400, step: 5, format: (value) => `${Math.round(value)}` },
];

export const HOP_RANGES: readonly Range[] = [
  { key: "hop", label: "알림 눌러 여는 비율", min: 0, max: 1, step: 0.05, format: percent },
  { key: "hopsPerSec", label: "전체 앱 이동 / 초", min: 0.5, max: 20, step: 0.5, format: (value) => value.toFixed(1) },
  { key: "hopMs", label: "전환 길이", min: 120, max: 1_200, step: 20, format: ms },
];

export const MOTION_RANGES: readonly Range[] = [
  { key: "scrollPace", label: "스크롤 속도", min: 0, max: 4, step: 0.05, format: times },
  { key: "scrollPause", label: "멈춤 길이", min: 0.05, max: 2, step: 0.05, format: times },
  { key: "cruise", label: "읽는 속도 (px/초)", min: 0, max: 600, step: 10, format: (value) => `${Math.round(value)}` },
  { key: "bannersPerSec", label: "전체 알림 / 초", min: 0, max: 200, step: 2, format: (value) => `${Math.round(value)}` },
  { key: "bannerMs", label: "알림 머무는 시간", min: 400, max: 4_000, step: 50, format: ms },
];

/** A phone's own minimum gaps, from the whole grid's budgets. */
export function gapsOf(tuning: PcTuning, phones: number) {
  return {
    updateMs: (phones * 1_000) / tuning.updatesPerSec,
    hopGapMs: (phones * 1_000) / tuning.hopsPerSec,
    bannerGapMs: tuning.bannersPerSec > 0 ? (phones * 1_000) / tuning.bannersPerSec : Number.POSITIVE_INFINITY,
  };
}
