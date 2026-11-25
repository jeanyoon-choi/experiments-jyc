// The disposition (기질): the one thing a bubble and a goldfish each have of their own, and how well two of them go
// together. For now it is the simplest thing that can differ: a direction on a circle, kept as its two numbers
// (artist, 2026-11-25: simple parameters, to see the feeling; nothing semantic, nothing taken from the objects, whose
// vocabulary is not settled). **To put another kind of disposition in its place, replace this file**: the rest reads
// only SIZE, `drawn`, `match` and `copy`, and keeps dispositions as SIZE numbers apiece in flat arrays.
//
// No imports: the school's worker reads it too (fish/school-core.ts).

/** Numbers per disposition. */
export const SIZE = 2;

function hash(value: number) {
  const hashed = Math.sin(value * 127.1 + 311.7) * 43_758.5453;
  return hashed - Math.floor(hashed);
}

/** Writes the disposition of whatever `seed` names into `out` at `at`: the same seed, the same disposition. */
export function drawn(seed: number, out: Float32Array, at: number) {
  const angle = hash(seed) * Math.PI * 2;
  out[at] = Math.cos(angle);
  out[at + 1] = Math.sin(angle);
}

/** How well two go together: 1 the same, 0 nothing to do with one another, −1 opposite. */
export function match(a: ArrayLike<number>, ai: number, b: ArrayLike<number>, bi: number) {
  return a[ai]! * b[bi]! + a[ai + 1]! * b[bi + 1]!;
}

export function copy(from: ArrayLike<number>, fi: number, to: Float32Array, ti: number) {
  to[ti] = from[fi]!;
  to[ti + 1] = from[fi + 1]!;
}
