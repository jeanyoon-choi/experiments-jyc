// 오브제 (user, 2026-10-25, a first trial): every page is still a bubble —
// its rank's area, its place in the raft, the disc the goldfish reach and
// watch — but it is shown as one 3D object in the bubbles' own material
// (NOTES 1020: "It's still ontologically all bubbles, but shaped as 3d
// objects"; Koons, the object, pop, the readymade).
//
// What a page can be is a group of kinds (groups.ts: 테크 하이프, SNS, 테크 로고).
// The pages take any combination of groups (or stay bubbles); the portions under way along the
// links take their source page's object, a group of their own, or stay
// bubbles — SNS can be the portions' alone.
//
// bubble/7 (user, 2026-10-27): every object a field that can flow into any
// other (fields.ts, morph.ts): pages melt from one object into another now and
// then (변신), portions under way morph from their source page into what they carry and on into the page they reach
// (모핑), and the 랩 shows one object at a time to tune the liquid on.
//
// The whole feature is this folder; object-pass.ts draws the objects on the
// raft's canvas with the raft's own shading (render/shading.ts), so every look
// and material carries over unchanged.

import { GROUPS, KIND, KINDS_OF, OBJECT_GROUPS, OBJECT_KINDS, type ObjectGroup, type ObjectKind } from "./groups.ts";
import { LIQUID_DEFAULTS, type Liquid } from "./liquid.ts";

export { GROUPS, KINDS_OF, OBJECT_GROUPS, OBJECT_KINDS, type ObjectGroup, type ObjectKind };

// 페이지, AND not OR (user, 2026-11-03): the pages take any combination of the
// groups at once, mixed. `pages` (and 전파's unit) is a mask over GROUPS: bit i
// is GROUPS[i]; 0 is bubbles.

/** A group's bit in a pages mask. */
export function groupBit(group: ObjectGroup) {
  return 1 << GROUPS.indexOf(group);
}

/** The mask with the group's bit flipped. */
export function toggledGroup(mask: number, group: ObjectGroup) {
  return Math.round(mask) ^ groupBit(group);
}

/** Whether the mask has the group's bit. */
export function hasGroup(mask: number, group: ObjectGroup) {
  return (Math.round(mask) & groupBit(group)) !== 0;
}

/** What the portions under way can be shown as (`portions` is its index): "page" is their source page's object. */
export const PORTION_SHOWS = ["bubble", "page", ...GROUPS] as const;
type Show = (typeof PORTION_SHOWS)[number];

export type ObjectParameters = {
  /** Mask over GROUPS (groupBit): the groups the pages are shown in, mixed; 0 bubbles. */
  pages: number;
  /** Index in PORTION_SHOWS. */
  portions: number;
  /** Size in its bubble's disc: 1 as the objects are fitted to it. */
  size: number;
  /** Height over the disc, times the object's own (every group alike). */
  puff: number;
  /** Index in FACINGS: how each object is turned in the screen's plane. */
  facing: number;
  /** 변신: a page melts into another object of its group about this often, seconds; 0 never. */
  change: number;
  /**
   * 1: a portion under way morphs at both ends of its link, whatever it is shown as — from its source page's shape
   * into its own, and from its own into the shape of the page it reaches (morph.ts passage); 0: it keeps its own.
   */
  portionMorph: number;
  /** 브랜드 색: how much a logo takes its brand's colour (marks.ts), 0 none … 1 all. */
  brand: number;
  /** 얼굴 사진 색: how much a face (유명인 얼굴) takes its photograph's colours, as a 3D scan does, 0 an uncoloured sculpture … 1 all. */
  faceColour: number;
} & Liquid & Record<`${ObjectKind}On`, number> &
  /** How often each kind comes, relative to the others in its group. */
  Record<ObjectKind, number>;

export const OBJECT_DEFAULTS = {
  // bubble/8 opens with every group on, mixed (user, 2026-11-03); bubble/7 opened on 테크 하이프.
  pages: GROUPS.reduce((mask, group) => mask | groupBit(group), 0),
  // 왔다갔다 하는 것: SNS, hearts and likes only (user, 2026-10-25).
  portions: PORTION_SHOWS.indexOf("sns"),
  size: 1,
  // 부풂 1.5 (user, 2026-10-25; bubble/5 opens at 0.2).
  puff: 1.5,
  // 각도: 움직이는 방향 (user, 2026-10-25).
  facing: 2,
  // bubble/7: pages change now and then; portions morph at both ends of their way (user, 2026-10-27).
  change: 14,
  portionMorph: 1,
  // Uncoloured by default (user, 2026-11-03): the material reads first; 로고의 브랜드 색 brings the brands in.
  brand: 0,
  // Off by default (user, 2026-11-03): heads follow the chosen material like every other object; the photo's colour only on request.
  faceColour: 0,
  ...LIQUID_DEFAULTS,
  ...(Object.fromEntries(
    OBJECT_KINDS.flatMap((kind) => [
      [`${kind}On`, KIND[kind].off ? 0 : 1],
      [kind, 1],
    ]),
  ) as Record<`${ObjectKind}On` | ObjectKind, number>),
} satisfies ObjectParameters;

export const OBJECT_LABELS = Object.fromEntries(OBJECT_KINDS.map((kind) => [kind, KIND[kind].label])) as Record<ObjectKind, string>;

/** 각도 (user, 2026-10-25): all upright (as before), each its own fixed angle, or turned the way it moves. */
export const FACINGS = ["upright", "random", "moving"] as const;
export const FACING_LABELS: Record<(typeof FACINGS)[number], string> = { upright: "똑바로", random: "랜덤", moving: "움직이는 방향" };

export const SHOW_LABELS = {
  bubble: "버블",
  page: "페이지 따라",
  ...Object.fromEntries(GROUPS.map((group) => [group, OBJECT_GROUPS[group].label])),
} as Record<Show, string>;

export type ObjectControl = { key: "size" | "puff" | "change" | "brand" | "faceColour"; label: string; min: number; max: number; step: number };

export const OBJECT_CONTROLS: readonly ObjectControl[] = [
  { key: "size", label: "오브제 크기 (버블 원 대비)", min: 0.5, max: 1.5, step: 0.01 },
  { key: "puff", label: "부풂 (높이 배율)", min: 0, max: 2, step: 0.01 },
  { key: "change", label: "변신 간격 (초, 0 끔)", min: 0, max: 60, step: 0.5 },
  { key: "brand", label: "로고의 브랜드 색", min: 0, max: 1, step: 0.01 },
  { key: "faceColour", label: "얼굴 사진 색", min: 0, max: 1, step: 0.01 },
];

/** A stable value in [0, 1) per number. */
export function hashOf(value: number) {
  const hashed = Math.sin(value * 91.345 + 17.17) * 43_758.5453;
  return hashed - Math.floor(hashed);
}

/** The group's kind at `roll` (in [0, 1)), among its kinds that are on, by their shares; null when none is on. */
export function kindIn(group: ObjectGroup, roll: number, parameters: ObjectParameters): ObjectKind | null {
  const kinds = KINDS_OF[group];
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

/** The groups the pages are shown in, in GROUPS order; empty for bubbles. */
export function pageGroups(parameters: ObjectParameters): ObjectGroup[] {
  return GROUPS.filter((group) => hasGroup(parameters.pages, group));
}

/** Whether the pages are shown as objects (any group selected), not bubbles. */
export function pagesAreObjects(parameters: ObjectParameters) {
  return pageGroups(parameters).length > 0;
}

/** The page's kind for `seed`: a group (equal share each, among those with a kind on), then a kind in it. */
function pageKindAt(seed: number, parameters: ObjectParameters): ObjectKind | null {
  const groups = pageGroups(parameters).filter((group) => kindIn(group, 0, parameters) !== null);
  if (groups.length === 0) return null;
  const group = groups[Math.min(groups.length - 1, Math.floor(hashOf(seed * 1.414 + 0.37) * groups.length))]!;
  return kindIn(group, hashOf(seed), parameters);
}

/**
 * What a page is shown as: a kind in one of the pages' groups, or null for a bubble. Fixed per page, or, with 변신,
 * drawn again (group and kind) about every `change` seconds at `time` (each page on its own beat).
 */
export function pageKind(page: number, parameters: ObjectParameters, time = 0): ObjectKind | null {
  if (parameters.change <= 0) return pageKindAt(page, parameters);
  const turn = Math.floor(time / parameters.change + hashOf(page + 0.5));
  return pageKindAt(page + turn * 1.618, parameters);
}

/** What a portion under way from `page` is shown as (`seed`: its link's own, in [0, 1)), or null for a bubble. */
export function portionKind(page: number, seed: number, parameters: ObjectParameters): ObjectKind | null {
  const show = PORTION_SHOWS[Math.round(parameters.portions)] ?? "bubble";
  if (show === "bubble") return null;
  if (show === "page") return pageKind(page, parameters);
  return kindIn(show, seed, parameters);
}
