// 오브제 (user, 2026-10-25, a first trial): every page is still a bubble —
// its rank's area, its place in the raft, the disc the goldfish reach and
// watch — but it is shown as one 3D object in the bubbles' own material
// (NOTES 1020: "It's still ontologically all bubbles, but shaped as 3d
// objects"; Koons, the object, pop, the readymade).
//
// Objects come in sets: 테크 하이프 (an AI sparkle, a cloud, a GPU, a robot's
// head, a humanoid robot, a robot dog, a Tesla Roadster, a VR headset, a
// bored ape, a rocket, a chatbot's speech bubble, a loading spinner) and SNS
// (a heart, a like, a comment). The pages take one set (or stay bubbles);
// the portions under way along the links take their source page's object, a
// set of their own, or stay bubbles — SNS can be the portions' alone.
//
// bubble/7 (user, 2026-10-27): every object a field that can flow into any
// other (fields.ts, morph.ts): pages melt from one object into another now and
// then (변신), portions under way morph from their source page into what they carry and on into the page they reach
// (모핑), and the 랩 shows one object at a time to tune the liquid on.
//
// The whole feature is this folder. shapes.ts builds the inflated objects (the
// SNS set among them, blown up like Koons's balloons), models.ts / gpu.ts the
// hard-surface ones; object-pass.ts draws them on the
// raft's canvas with the raft's own shading (render/foam.ts SHADING), so
// every look and coat carries over unchanged. Expected to move into a 3D
// object lab of its own.

import { LIQUID_DEFAULTS, type Liquid } from "./liquid.ts";

export const OBJECT_SETS = {
  tech: {
    label: "테크 하이프",
    kinds: ["sparkle", "cloud", "gpu", "robot", "humanoid", "robotDog", "roadster", "headset", "ape", "rocket", "chat", "spinner"],
  },
  sns: { label: "SNS", kinds: ["heart", "like", "comment"] },
} as const;

export type ObjectSet = keyof typeof OBJECT_SETS;
export type ObjectKind = (typeof OBJECT_SETS)[ObjectSet]["kinds"][number];

export const OBJECT_KINDS: readonly ObjectKind[] = [...OBJECT_SETS.tech.kinds, ...OBJECT_SETS.sns.kinds];

/** What the pages can be shown as (`pages` is its index). */
export const PAGE_SHOWS = ["bubble", "tech", "sns"] as const;
/** What the portions under way can be shown as (`portions` is its index): "page" is their source page's object. */
export const PORTION_SHOWS = ["bubble", "page", "tech", "sns"] as const;

export type ObjectParameters = {
  /** Index in PAGE_SHOWS. */
  pages: number;
  /** Index in PORTION_SHOWS. */
  portions: number;
  /** Size in its bubble's disc: 1 as the objects are fitted to it. */
  size: number;
  /** Height over the disc, times the object's own (every set alike). */
  puff: number;
  /** Index in FACINGS: how each object is turned in the screen's plane. */
  facing: number;
  /** 변신: a page melts into another object of its set about this often, seconds; 0 never. */
  change: number;
  /**
   * 1: a portion under way morphs at both ends of its link, whatever it is shown as — from its source page's shape
   * into its own, and from its own into the shape of the page it reaches (morph.ts passage); 0: it keeps its own.
   */
  portionMorph: number;
} & Liquid & Record<`${ObjectKind}On`, number> &
  /** How often each kind comes, relative to the others in its set. */
  Record<ObjectKind, number>;

export const OBJECT_DEFAULTS = {
  pages: 1,
  // 왔다갔다 하는 것: SNS, hearts and likes only (user, 2026-10-25).
  portions: 3,
  size: 1,
  // 부풂 1.5 (user, 2026-10-25; bubble/5 opens at 0.2).
  puff: 1.5,
  // 각도: 움직이는 방향 (user, 2026-10-25).
  facing: 2,
  // bubble/7: pages change now and then; portions morph at both ends of their way (user, 2026-10-27).
  change: 14,
  portionMorph: 1,
  ...LIQUID_DEFAULTS,
  ...(Object.fromEntries(
    OBJECT_KINDS.flatMap((kind) => [
      [`${kind}On`, 1],
      [kind, 1],
    ]),
  ) as Record<`${ObjectKind}On` | ObjectKind, number>),
  // 원숭이 JPEG off by default (user, 2026-10-25); its chip brings it in.
  apeOn: 0,
  commentOn: 0,
  // 로드스터, 로봇 (머리), 챗봇 말풍선 off by default (user, 2026-10-26); their chips bring them in.
  roadsterOn: 0,
  robotOn: 0,
  chatOn: 0,
} satisfies ObjectParameters;

export const OBJECT_LABELS: Record<ObjectKind, string> = {
  sparkle: "AI 반짝이",
  cloud: "클라우드",
  gpu: "GPU",
  robot: "로봇 (머리)",
  humanoid: "휴머노이드 로봇",
  robotDog: "로봇개",
  roadster: "테슬라 로드스터",
  headset: "VR 헤드셋",
  ape: "원숭이 JPEG",
  rocket: "로켓",
  chat: "챗봇 말풍선",
  spinner: "로딩 스피너",
  heart: "하트",
  like: "좋아요",
  comment: "댓글",
};

/** 각도 (user, 2026-10-25): all upright (as before), each its own fixed angle, or turned the way it moves. */
export const FACINGS = ["upright", "random", "moving"] as const;
export const FACING_LABELS: Record<(typeof FACINGS)[number], string> = { upright: "똑바로", random: "랜덤", moving: "움직이는 방향" };

export const SHOW_LABELS: Record<(typeof PORTION_SHOWS)[number], string> = {
  bubble: "버블",
  page: "페이지 따라",
  tech: OBJECT_SETS.tech.label,
  sns: OBJECT_SETS.sns.label,
};

export type ObjectControl = { key: "size" | "puff" | "change"; label: string; min: number; max: number; step: number };

export const OBJECT_CONTROLS: readonly ObjectControl[] = [
  { key: "size", label: "오브제 크기 (버블 원 대비)", min: 0.5, max: 1.5, step: 0.01 },
  { key: "puff", label: "부풂 (높이 배율)", min: 0, max: 2, step: 0.01 },
  { key: "change", label: "변신 간격 (초, 0 끔)", min: 0, max: 60, step: 0.5 },
];

/** A stable value in [0, 1) per number. */
export function hashOf(value: number) {
  const hashed = Math.sin(value * 91.345 + 17.17) * 43_758.5453;
  return hashed - Math.floor(hashed);
}

/** The set's kind at `roll` (in [0, 1)), among its kinds that are on, by their shares; null when none is on. */
export function kindIn(set: ObjectSet, roll: number, parameters: ObjectParameters): ObjectKind | null {
  const kinds = OBJECT_SETS[set].kinds;
  let total = 0;
  for (const kind of kinds) if (parameters[`${kind}On`] >= 0.5) total += Math.max(0, parameters[kind]);
  if (total <= 0) return null;
  let left = roll * total;
  let last: ObjectKind | null = null;
  for (const kind of kinds) {
    if (parameters[`${kind}On`] < 0.5 || parameters[kind] <= 0) continue;
    last = kind;
    left -= parameters[kind];
    if (left < 0) return kind;
  }
  return last;
}

/** The set the pages are shown in, or null for bubbles. */
export function pageSet(parameters: ObjectParameters): ObjectSet | null {
  const show = PAGE_SHOWS[Math.round(parameters.pages)] ?? "bubble";
  return show === "bubble" ? null : show;
}

/**
 * What a page is shown as: its kind in the pages' set, or null for a bubble. Fixed per page, or, with 변신,
 * drawn again about every `change` seconds at `time` (each page on its own beat).
 */
export function pageKind(page: number, parameters: ObjectParameters, time = 0): ObjectKind | null {
  const set = pageSet(parameters);
  if (!set) return null;
  if (parameters.change <= 0) return kindIn(set, hashOf(page), parameters);
  const turn = Math.floor(time / parameters.change + hashOf(page + 0.5));
  return kindIn(set, hashOf(page + turn * 1.618), parameters);
}

/** What a portion under way from `page` is shown as (`seed`: its link's own, in [0, 1)), or null for a bubble. */
export function portionKind(page: number, seed: number, parameters: ObjectParameters): ObjectKind | null {
  const show = PORTION_SHOWS[Math.round(parameters.portions)] ?? "bubble";
  if (show === "bubble") return null;
  if (show === "page") return pageKind(page, parameters);
  return kindIn(show, seed, parameters);
}
