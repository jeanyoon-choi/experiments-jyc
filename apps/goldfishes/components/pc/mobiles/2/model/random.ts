// Seeded randomness: every phone, post and gesture is drawn from a seed, so
// a reload replays the same personas and a test can pin a sequence.

/** A 32-bit mix. */
export function mix(value: number) {
  value = Math.imul((value | 0) ^ 0x5bd1e995, 0x27d4eb2d) >>> 0;
  value = Math.imul(value ^ (value >>> 15), 0x165667b1) >>> 0;
  return (value ^ (value >>> 13)) >>> 0;
}

/** 0–1 from any number of integers. */
export function hash01(...values: number[]) {
  let state = 0x9e3779b9;
  for (const value of values) state = mix(state ^ mix(value));
  return state / 4_294_967_296;
}

export type Random = {
  (): number;
  int(max: number): number;
  range(min: number, max: number): number;
  pick<T>(list: readonly T[]): T;
  chance(p: number): boolean;
};

export function random(seed: number): Random {
  let state = mix(seed) || 1;
  const next = (() => {
    state = (Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0;
    return state / 4_294_967_296;
  }) as Random;
  next.int = (max) => Math.floor(next() * max);
  next.range = (min, max) => min + next() * (max - min);
  next.pick = (list) => list[Math.floor(next() * list.length)]!;
  next.chance = (p) => next() < p;
  return next;
}

/** Picks by weight: `{ a: 3, b: 1 }` gives a three times out of four. */
export function weighted<K extends string>(roll: number, weights: Readonly<Record<K, number>>): K {
  const entries = Object.entries(weights) as [K, number][];
  const total = entries.reduce((sum, [, weight]) => sum + Math.max(0, weight), 0);
  let left = roll * total;
  for (const [key, weight] of entries) {
    left -= Math.max(0, weight);
    if (left < 0) return key;
  }
  return entries[entries.length - 1]![0];
}
