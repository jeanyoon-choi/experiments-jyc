// The field's parameters, live from the option menu (controls/) and from
// the query (`?speed=1.4&death=limit`). All of it is the browser's own
// choreography; nothing upstream changes.

export const DEATHS = ["sleep", "limit", "off"] as const;
export type Death = (typeof DEATHS)[number];
export const DEATH_LABELS: Record<Death, string> = { sleep: "꺼짐", limit: "한도 무시", off: "끔" };

export type Tuning = {
  phones: number;
  /** Tempo of use, × (every gesture's length and every pause). */
  speed: number;
  /** Mean seconds between app changes on a phone. */
  hop: number;
  /** Shares of the four ways of changing app. */
  viaBanner: number;
  viaSwipe: number;
  viaSwitcher: number;
  viaHome: number;
  /** Share of a strike's notifications that are opened at once. */
  open: number;
  /** Full-screen ads and checkouts, per minute per phone. */
  ads: number;
  /** The goldfish as the thumb: 1 on, 0 off. */
  thumb: number;
  /** Size of the goldfish-thumb, ×. */
  thumbSize: number;
  death: Death;
  /** Strikes within 10 s that kill a phone (dopamine overdose, NOTES 1020). */
  overdose: number;
  /** Seconds without a new keyword that kill a phone (NOTES 1023: 10 s 정주하면 죽음). */
  stillness: number;
  /** Seconds a dead phone stays dark at least. */
  rest: number;
  /** How far a strong strike ripples to neighbouring phones, 0–1. */
  wave: number;
  /** Field-wide synchrony when the strike rate surges: 1 on, 0 off. */
  sync: number;
  /** Device pixels per CSS pixel, at most (GPU budget: approved up to 2, 2026-10-28). */
  dpr: number;
};

export const TUNING_DEFAULTS: Tuning = {
  phones: 64,
  speed: 1,
  hop: 3.6,
  viaBanner: 0.45,
  viaSwipe: 0.25,
  viaSwitcher: 0.15,
  viaHome: 0.15,
  open: 0.5,
  ads: 1.6,
  thumb: 1,
  thumbSize: 1,
  death: "sleep",
  overdose: 32,
  stillness: 14,
  rest: 2.5,
  wave: 0.5,
  sync: 1,
  dpr: 2,
};

export type Range = { key: Exclude<keyof Tuning, "death">; label: string; min: number; max: number; step: number; format?: (value: number) => string };

export const RHYTHM_RANGES: readonly Range[] = [
  { key: "speed", label: "빠르기", min: 0.4, max: 2.5, step: 0.05, format: (v) => `${v.toFixed(2)}×` },
  { key: "hop", label: "앱 바뀌는 간격", min: 1, max: 12, step: 0.2, format: (v) => `${v.toFixed(1)}초` },
  { key: "open", label: "알림을 바로 여는 비율", min: 0, max: 1, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
  { key: "ads", label: "전면 광고·결제 (분당)", min: 0, max: 8, step: 0.2, format: (v) => v.toFixed(1) },
];

export const HOP_RANGES: readonly Range[] = [
  { key: "viaBanner", label: "알림 눌러 열기", min: 0, max: 1, step: 0.05 },
  { key: "viaSwipe", label: "홈 바 밀기", min: 0, max: 1, step: 0.05 },
  { key: "viaSwitcher", label: "앱 전환기", min: 0, max: 1, step: 0.05 },
  { key: "viaHome", label: "홈 화면 거쳐서", min: 0, max: 1, step: 0.05 },
];

export const FISH_RANGES: readonly Range[] = [
  { key: "thumb", label: "금붕어 엄지", min: 0, max: 1, step: 1, format: (v) => (v ? "켬" : "끔") },
  { key: "thumbSize", label: "금붕어 크기", min: 0.5, max: 2, step: 0.05, format: (v) => `${v.toFixed(2)}×` },
  { key: "overdose", label: "과자극 (10초 안 알림 수)", min: 4, max: 60, step: 1, format: (v) => String(v) },
  { key: "stillness", label: "정주 (새 키워드 없이 초)", min: 4, max: 60, step: 1, format: (v) => `${v}초` },
  { key: "rest", label: "꺼져 있는 시간", min: 0.5, max: 15, step: 0.5, format: (v) => `${v}초` },
];

export const FIELD_RANGES: readonly Range[] = [
  { key: "phones", label: "폰 수", min: 1, max: 64, step: 1, format: (v) => String(v) },
  { key: "wave", label: "이웃으로 번짐", min: 0, max: 1, step: 0.05, format: (v) => `${Math.round(v * 100)}%` },
  { key: "sync", label: "동시 알림", min: 0, max: 1, step: 1, format: (v) => (v ? "켬" : "끔") },
  { key: "dpr", label: "해상도 (DPR, 새로고침)", min: 1, max: 2, step: 0.25, format: (v) => v.toFixed(2) },
];

export function tuningFromQuery(search: string, base: Tuning = TUNING_DEFAULTS): Tuning {
  const params = new URLSearchParams(search);
  const next = { ...base };
  for (const key of Object.keys(base) as (keyof Tuning)[]) {
    const value = params.get(key);
    if (value === null) continue;
    if (key === "death") next.death = (DEATHS as readonly string[]).includes(value) ? (value as Death) : next.death;
    else if (Number.isFinite(Number(value))) next[key] = Number(value);
  }
  next.phones = Math.min(64, Math.max(1, Math.round(next.phones)));
  return next;
}
