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
// The whole feature is objects/: kinds/ (this file and the registry, groups.ts),
// catalogue/ (bubble/9's groups), shapes/ (how each source makes its volume),
// fields/ (the bakes, their tiers and the workers), morph/ (the liquid and the
// 랩), panel/ (오브제's controls); object-pass.ts draws the objects on the
// raft's canvas with the raft's own shading (render/shading.ts), so every look
// and material carries over unchanged.

import { CATALOGUE_GROUP_IDS, type BaseKind, GROUP_LABEL, GROUPS, KIND, KINDS_OF, OBJECT_GROUPS, OBJECT_KINDS, SUBGROUPS_OF, type ObjectGroup, type ObjectKind } from "./groups.ts";
import { LIQUID_DEFAULTS, type Liquid } from "../morph/liquid.ts";

export { CATALOGUE_GROUP_IDS, GROUP_LABEL, GROUPS, KINDS_OF, OBJECT_GROUPS, OBJECT_KINDS, SUBGROUPS_OF, type ObjectGroup, type ObjectKind };

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

/**
 * What the portions under way can be shown as (`portions` is its index): "page" is their source page's object, a group
 * any of its kinds that are on, and "dollar" and "heart" the $ or the heart alone whatever is on (user, 2026-11-13; last,
 * so the others' indices stay).
 */
export const PORTION_SHOWS = ["bubble", "page", ...GROUPS, "dollar", "heart"] as const;
/** The shows that are one kind alone. */
const isOneKind = (show: Show): show is "dollar" | "heart" => show === "dollar" || show === "heart";
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
  /**
   * 1: a portion under way morphs at both ends of its link, whatever it is shown as — from its source page's shape
   * into its own, and from its own into the shape of the page it reaches (morph.ts passage); 0: it keeps its own.
   */
  portionMorph: number;
  /** 브랜드 색: how much a logo takes its brand's colour (marks.ts), and a catalogue kind its own paint, 0 none … 1 all. */
  brand: number;
  /** 얼굴 사진 색: how much a face (유명인 얼굴) takes its photograph's colours, as a 3D scan does, 0 an uncoloured sculpture … 1 all. */
  faceColour: number;
} & Liquid &
  /** Per kind: on (≥ 0.5) or off (`${kind}On`), and how often it comes, relative to the others in its group (`${kind}`). */
  Record<`${BaseKind}On` | BaseKind, number> & { [kindOrOn: string]: number };

export const OBJECT_DEFAULTS: ObjectParameters = {
  // bubble/8 opens with every group on, mixed (user, 2026-11-03); bubble/7 opened on 테크 하이프. bubble/9 opened on
  // bubble/8's groups only, then on 모두 선택 (user, 2026-11-07): the catalogue's groups too.
  pages: GROUPS.reduce((mask, group) => mask | groupBit(group), 0),
  // 왔다갔다 하는 것: $ 만 (user, 2026-11-13; SNS — hearts and likes — from 2026-10-25).
  portions: PORTION_SHOWS.indexOf("dollar"),
  // 1.05 (user, 2026-11-13; 1.21 from the user's bubble/8 tuning, 1.2 on 2026-11-04): the goldfish keep out of the
  // drawn outline, not the bubble's disc (ObjectPass.pageExtent). The same under every setup (settings.ts SETUPS).
  size: 1.05,
  // 부풂 1.62 (user's bubble/8 tuning, 2026-11-06; 1.5 user, 2026-10-25; bubble/5 opens at 0.2).
  puff: 1.62,
  // 각도: 똑바로 (user, 2026-11-13; 움직이는 방향 from 2026-10-25, 똑바로 tried and put back on 2026-11-12).
  facing: 0,
  // Portions morph at both ends of their way (user, 2026-10-27).
  portionMorph: 1,
  // Uncoloured by default (user, 2026-11-03): the material reads first; 브랜드 색 brings the brands in (the catalogue's paint too).
  brand: 0,
  // Off by default (user, 2026-11-03): heads follow the chosen material like every other object; the photo's colour only on request.
  faceColour: 0,
  ...LIQUID_DEFAULTS,
  ...(Object.fromEntries(
    OBJECT_KINDS.flatMap((kind) => [
      [`${kind}On`, KIND[kind].off ? 0 : 1],
      [kind, 1],
    ]),
  ) as Record<`${BaseKind}On` | BaseKind, number>),
};

export const OBJECT_LABELS = Object.fromEntries(OBJECT_KINDS.map((kind) => [kind, KIND[kind].label])) as Record<ObjectKind, string>;

/** 각도 (user, 2026-10-25): all upright (as before), each its own fixed angle, or turned the way it moves. */
export const FACINGS = ["upright", "random", "moving"] as const;
export const FACING_LABELS: Record<(typeof FACINGS)[number], string> = { upright: "똑바로", random: "랜덤", moving: "움직이는 방향" };

export const SHOW_LABELS = {
  bubble: "버블",
  page: "페이지 따라",
  ...GROUP_LABEL,
  dollar: "$ 만",
  heart: "하트만",
} as Record<Show, string>;

export type ObjectControl = { key: "size" | "puff" | "brand" | "faceColour"; label: string; min: number; max: number; step: number };

export const OBJECT_CONTROLS: readonly ObjectControl[] = [
  { key: "size", label: "오브제 크기 (버블 원 대비)", min: 0.5, max: 1.5, step: 0.01 },
  { key: "puff", label: "부풂 (높이 배율)", min: 0, max: 2, step: 0.01 },
  // 로고의 브랜드 색 until bubble/9, whose catalogue kinds bring their own colours under it too.
  { key: "brand", label: "브랜드 색", min: 0, max: 1, step: 0.01 },
  { key: "faceColour", label: "얼굴 사진 색", min: 0, max: 1, step: 0.01 },
];

/** A stable value in [0, 1) per number. */
export function hashOf(value: number) {
  const hashed = Math.sin(value * 91.345 + 17.17) * 43_758.5453;
  return hashed - Math.floor(hashed);
}

/**
 * Per parameters (an object never changed once made: the panels make a new one for every change), each group's kinds
 * that are on with their cumulative shares, and the pages' groups that have any: built once, so a page's kind is a
 * binary search, whatever the groups' size (bubble/9's catalogue has hundreds of kinds; this runs per page per frame).
 */
type Shares = { kinds: ObjectKind[]; cumulative: Float64Array };
type Tables = { shares: Map<ObjectGroup, Shares>; pageGroups: ObjectGroup[]; eligible: ObjectGroup[] };
const tables = new WeakMap<ObjectParameters, Tables>();

function sharesOf(group: ObjectGroup, parameters: ObjectParameters): Shares {
  const kinds: ObjectKind[] = [];
  const shares: number[] = [];
  let total = 0;
  for (const kind of KINDS_OF[group] ?? []) {
    if (!(parameters[`${kind}On`] >= 0.5) || !(parameters[kind] > 0)) continue;
    total += parameters[kind];
    kinds.push(kind);
    shares.push(total);
  }
  return { kinds, cumulative: Float64Array.from(shares) };
}

function tablesOf(parameters: ObjectParameters): Tables {
  let found = tables.get(parameters);
  if (!found) {
    const shares = new Map(GROUPS.map((group) => [group, sharesOf(group, parameters)]));
    const pageGroups = GROUPS.filter((group) => hasGroup(parameters.pages, group));
    found = { shares, pageGroups, eligible: pageGroups.filter((group) => shares.get(group)!.kinds.length > 0) };
    tables.set(parameters, found);
  }
  return found;
}

/** The group's kind at `roll` (in [0, 1)), among its kinds that are on, by their shares; null when none is on. */
export function kindIn(group: ObjectGroup, roll: number, parameters: ObjectParameters): ObjectKind | null {
  const shares = tablesOf(parameters).shares.get(group);
  if (!shares || shares.kinds.length === 0) return null;
  const { kinds, cumulative } = shares;
  const at = roll * cumulative[cumulative.length - 1]!;
  // The first kind whose cumulative share passes `at`.
  let low = 0;
  let high = kinds.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (cumulative[middle]! > at) high = middle;
    else low = middle + 1;
  }
  return kinds[low]!;
}

/** The groups the pages are shown in, in GROUPS order; empty for bubbles. */
export function pageGroups(parameters: ObjectParameters): readonly ObjectGroup[] {
  return tablesOf(parameters).pageGroups;
}

/** Whether the pages are shown as objects (any group selected), not bubbles. */
export function pagesAreObjects(parameters: ObjectParameters) {
  return pageGroups(parameters).length > 0;
}

/** Every kind that may be shown now: on, in a group the pages or the portions are shown in. The ones worth baking ahead. */
export function kindsInUse(parameters: ObjectParameters): ObjectKind[] {
  const show = PORTION_SHOWS[Math.round(parameters.portions)] ?? "bubble";
  const { shares, pageGroups: groups } = tablesOf(parameters);
  const used = new Set(groups);
  if (show !== "bubble" && show !== "page" && !isOneKind(show)) used.add(show);
  const kinds = [...used].flatMap((group) => shares.get(group)?.kinds ?? []);
  return isOneKind(show) && !kinds.includes(show) ? [...kinds, show] : kinds;
}

/** The page's kind for `seed`: a group (equal share each, among those with a kind on), then a kind in it. */
function pageKindAt(seed: number, parameters: ObjectParameters): ObjectKind | null {
  const groups = tablesOf(parameters).eligible;
  if (groups.length === 0) return null;
  const group = groups[Math.min(groups.length - 1, Math.floor(hashOf(seed * 1.414 + 0.37) * groups.length))]!;
  return kindIn(group, hashOf(seed), parameters);
}

/** The parameters with every one of `kinds` switched on (or off): a subgroup's 모두 켬 / 모두 끔. */
export function withKinds(parameters: ObjectParameters, kinds: readonly ObjectKind[], on: boolean): ObjectParameters {
  return { ...parameters, ...Object.fromEntries(kinds.map((kind) => [`${kind}On`, on ? 1 : 0])) };
}

/** How many of `kinds` are on. */
export function onCount(parameters: ObjectParameters, kinds: readonly ObjectKind[]) {
  return kinds.reduce((count, kind) => count + (parameters[`${kind}On`] >= 0.5 ? 1 : 0), 0);
}

/**
 * What a page is shown as: a kind in one of the pages' groups, or null for a bubble. `turn` is how many times it has
 * moved on (bubble/9, user 2026-11-06: by the goldfish's attention, not a clock; frame-loop.ts pageTurns).
 */
export function pageKind(page: number, parameters: ObjectParameters, turn = 0): ObjectKind | null {
  return pageKindAt(turn === 0 ? page : page + turn * 1.618, parameters);
}

/** What a portion under way from `page` is shown as (`seed`: its link's own, in [0, 1)), or null for a bubble. */
export function portionKind(page: number, seed: number, parameters: ObjectParameters): ObjectKind | null {
  const show = PORTION_SHOWS[Math.round(parameters.portions)] ?? "bubble";
  if (show === "bubble") return null;
  if (show === "page") return pageKind(page, parameters);
  if (isOneKind(show)) return show;
  return kindIn(show, seed, parameters);
}
