// Settings primitives shared by every native-windows version. Each version owns
// its Settings shape, defaults and plan; the order of random draws inside a plan
// is part of a version's seeded score and stays in that version.

export type Range = readonly [min: number, max: number, step: number];
export type Order = 'cycle' | 'random';

/** Seeded LCG in [0, 1); the same seed replays the same score. */
export function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function readSettingsInput(value: unknown) {
  if (!value || typeof value !== 'object') throw new Error('설정이 필요합니다.');
  return value as Record<string, unknown>;
}

export function validateRanges(input: Record<string, unknown>, ranges: Record<string, Range>) {
  for (const [key, [min, max]] of Object.entries(ranges)) {
    const n = input[key];
    if (typeof n !== 'number' || !Number.isFinite(n) || n < min || n > max || (key !== 'interval' && !Number.isInteger(n))) throw new Error(`${key}: ${min}–${max} 범위의 값을 입력해주세요.`);
  }
}

export function validateOrder(input: Record<string, unknown>) {
  if (input.order !== 'cycle' && input.order !== 'random') throw new Error('전환 순서를 선택해주세요.');
}

export function validateApps(input: Record<string, unknown>, apps: readonly string[]) {
  if (!Array.isArray(input.apps) || !input.apps.length || input.apps.length > apps.length || new Set(input.apps).size !== input.apps.length || input.apps.some(app => !apps.includes(app))) throw new Error('앱을 한 개 이상 선택해주세요.');
}

/** Copies only known keys, so a running score never shares arrays with the draft. */
export function snapshot<T>(input: Record<string, unknown>, keys: readonly string[], listKeys: readonly string[]) {
  return Object.fromEntries(keys.map(key => [key, listKeys.includes(key) ? [...input[key] as unknown[]] : input[key]])) as T;
}

/** Interval before a step, scaled by ±jitter%. Draws once. */
export function jitteredInterval(settings: { interval: number; jitter: number }, random: () => number) {
  return Math.round(settings.interval * 1000 * (1 + (random() * 2 - 1) * settings.jitter / 100));
}

/** Window rectangle placed within the movement range. Draws x, then y. */
export function jumpBounds(settings: { size: number; movement: number }, random: () => number) {
  const scale = settings.size / 100;
  const width = Math.round(1100 * scale);
  const height = Math.round(720 * scale);
  const x = Math.round(70 + random() * 320 * settings.movement / 100);
  const y = Math.round(60 + random() * 170 * settings.movement / 100);
  return [x, y, x + width, y + height];
}

/** Clamps a typed control value into its range; only `interval` keeps decimals. */
export function clampSetting(range: Range, key: string, value: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return undefined;
  const [min, max] = range;
  return Math.min(max, Math.max(min, key === 'interval' ? n : Math.round(n)));
}

/** Toggles one item while keeping the canonical order of `all`. */
export function toggle<T>(all: readonly T[], selected: readonly T[], item: T) {
  return all.filter(entry => entry === item ? !selected.includes(entry) : selected.includes(entry));
}
