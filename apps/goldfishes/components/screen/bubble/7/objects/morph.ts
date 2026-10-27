// 액체 모핑 (user, 2026-10-27; NOTES 1020: "사물은 한 사물에서 다른 사물로
// 터미네이터마냥, 파프리카마냥 액체상태에서 물화되며 morphing 되었다가 다시 언제
// 그랬냐는듯이 자연스럽게 상업적이고 완벽한 3d 오브제로"). The lineage is the
// T-1000 (Terminator 2, 1991) and Paprika's parade: a solid object melts into
// liquid metal, the liquid flows into the next shape, and it sets again as a
// perfect commercial object — not two solids cross-faded.
//
// One morph runs on its clock u, 0 → 1 over `duration`:
//   melt   0 → 1 quickly (the object's details soften into a drop held by
//          surface tension), stays, then sets 1 → 0 at the end;
//   shape  0 → 1 while melted, as a spring: it overshoots the new outline and
//          settles (말랑말랑), so the liquid seems to have mass.
// The shader (object-pass.ts) turns (from, to, shape, melt) into a surface.

import { OBJECT_KINDS, type ObjectKind } from "./objects.ts";
import type { FieldKind } from "./fields";
import type { Liquid } from "./liquid.ts";

/** The fields' layers: the bubble first, then every kind. */
export const FIELD_KINDS: readonly FieldKind[] = ["bubble", ...OBJECT_KINDS];
export const layerOf = (kind: FieldKind | null) => (kind === null ? 0 : FIELD_KINDS.indexOf(kind));

const smooth = (from: number, to: number, value: number) => {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
};

/** A spring's step response at time τ (in units of its settling): 0 → 1, overshooting by about `overshoot`. */
export function spring(tau: number, overshoot: number) {
  if (tau <= 0) return 0;
  if (overshoot <= 0.005) return smooth(0, 1, tau);
  // The damping ratio whose first peak overshoots by `overshoot`.
  const logged = Math.log(overshoot);
  const zeta = -logged / Math.sqrt(Math.PI * Math.PI + logged * logged);
  const omega = 7.5;
  const damped = omega * Math.sqrt(1 - zeta * zeta);
  // From rest (its slope starts at zero), so the liquid starts moving without a kick.
  return 1 - Math.exp(-zeta * omega * tau) * (Math.cos(damped * tau) + (zeta / Math.sqrt(1 - zeta * zeta)) * Math.sin(damped * tau));
}

/** Shape and melt at a share `u` of the morph (u ≥ 1: set). */
export function envelope(u: number, liquid: Liquid) {
  if (u >= 1) return { shape: 1, melt: 0 };
  if (u <= 0) return { shape: 0, melt: 0 };
  const melt = liquid.melt * smooth(0, 0.2, u) * (1 - smooth(0.66, 1, u));
  // The shape moves while melted and has settled by the time it sets.
  const shape = spring((u - 0.1) / 0.62, liquid.overshoot);
  return { shape, melt };
}

/** A portion's way along its link (user, 2026-10-27): necking off its source page as that page's shape, it melts into
 * its own (a bubble, a heart, a like, a tech object, whatever it carries), holds it across the middle of the way,
 * and melts again into the shape of the page it reaches: A → it → B, a morph at both ends. `u`: its share of the way. */
export function passage(u: number, source: number, own: number, target: number, liquid: Liquid) {
  if (u >= 1) return { from: own, to: target, shape: 1, melt: 0 };
  if (u < PASSAGE_LEG) return { from: source, to: own, ...envelope(u / PASSAGE_LEG, liquid) };
  if (u <= 1 - PASSAGE_LEG) return { from: own, to: own, shape: 1, melt: 0 };
  return { from: own, to: target, ...envelope((u - (1 - PASSAGE_LEG)) / PASSAGE_LEG, liquid) };
}
/** The share of the way each end's morph takes. */
const PASSAGE_LEG = 0.42;

/** One object's morph: from one field to another, started at `start` (seconds). */
export type Morph = { from: number; to: number; start: number };

/** The layer the morph shows most of at `time`: where a new morph starts from. */
export function dominant(morph: Morph, time: number, liquid: Liquid) {
  return (time - morph.start) / liquid.duration >= 0.45 ? morph.to : morph.from;
}

/** Starts a morph towards `to` unless one is already going there. */
export function retarget(morph: Morph, to: number, time: number, liquid: Liquid) {
  if (morph.to === to) return;
  morph.from = dominant(morph, time, liquid);
  morph.to = to;
  morph.start = time;
}

/** What the lab steps through: from the heart into each object and back (user: 하트에서 각 오브제로), in turn, or from the bubble. */
export const LAB_SEQUENCES = ["heart", "chain", "bubble"] as const;
export const LAB_SEQUENCE_LABELS: Record<(typeof LAB_SEQUENCES)[number], string> = {
  heart: "하트 ↔ 각 오브제",
  chain: "오브제 → 오브제",
  bubble: "버블 ↔ 각 오브제",
};

/** The next kind after `current` in a sequence over `kinds` (the hub, heart or bubble, between every two). */
export function nextInSequence(sequence: (typeof LAB_SEQUENCES)[number], current: FieldKind, kinds: readonly ObjectKind[], visited: { last: number }): FieldKind {
  const hub: FieldKind | null = sequence === "heart" ? "heart" : sequence === "bubble" ? "bubble" : null;
  const pool = kinds.filter((kind) => kind !== hub);
  if (pool.length === 0) return hub ?? current;
  if (hub && current !== hub) return hub;
  visited.last = (visited.last + 1) % pool.length;
  return pool[visited.last]!;
}
