// 오브제 그룹 (user, 2026-11-03): what a page can be shown as comes in groups,
// each a vocabulary of kinds that are still, ontologically, bubbles. 테크 하이프
// and SNS are the groups the first trials produced (bubble/5–7); they are test
// vocabularies, not the work's settled one, so groups are expected to come and
// go. 테크 로고 is the third: the industry's symbol marks (Claude's starburst,
// OpenAI's knot, Apple, NVIDIA's eye …), the marks SCC bubble/3's 기술 surface
// put on balls, here blown up into 3D objects themselves. Wordmarks are left out:
// a mark must read as a shape.
//
// This file is the single registry. Each kind names how its field is made
// (fields.ts):
//   inflated — a flat outline blown up as a balloon (shapes.ts),
//   model    — a hard-surface mesh (models.ts, gpu.ts),
//   mark     — an SVG mark filled and blown up as one membrane (marks.ts),
//   face     — a person's head (두상) as a 3D scan: their silhouette, volume and photo colour (faces.ts),
//   glyph    — a type glyph's outline, made bold and blown up as a mark is (currency.ts).
// 유명인 얼굴 (user, 2026-11-03) is the fourth group: sixteen faces of the tech
// industry as sculpted heads roaming the raft. 통화 기호 (user, 2026-11-03) is the
// fifth: eight currency signs ($ € £ ¥ ₩ ₿ ₹ ₽), each a chunky balloon of its glyph.
// Adding a group is one entry here (and, for marks, their paths in marks.ts):
// the panels, the pages' and portions' choices, the 랩, 전파 and the feed's
// vocabulary all read it.
//
// 기호의 파티 (bubble/9, 2026-11-05): the catalogue's groups (catalogue/index.ts, one module each) come after these
// five, kind for kind as theirs, each kind carrying how it is made (`make`: a relief or a model) and its subgroup
// (`sub`, the panels' folds). They start off in the pages' mask, so the opening is bubble/8's. Their kinds' ids are
// plain strings: ObjectKind keeps the five groups' literal ids and admits any other.

import { CATALOGUE } from "./catalogue/index.ts";
import type { CatalogueGroup, ModelMake, ReliefMake } from "./catalogue/types.ts";

export type KindSource = "inflated" | "model" | "mark" | "face" | "glyph" | "relief";

/** One kind: its label in the panels, the feed's keyword, how its field is made, and whether it is on at the start. */
export type KindEntry = {
  readonly label: string;
  readonly feed: string;
  readonly source: KindSource;
  readonly off?: true;
  /** A catalogue kind's making (catalogue/types.ts); bubble/5–8's kinds are made by `source` alone. */
  readonly make?: ReliefMake | ModelMake;
  /** A catalogue kind's subgroup in the panels. */
  readonly sub?: string;
};

export const OBJECT_GROUPS = {
  tech: {
    label: "테크 하이프",
    kinds: {
      sparkle: { label: "AI 반짝이", feed: "AI", source: "inflated" },
      cloud: { label: "클라우드", feed: "Cloud", source: "inflated" },
      gpu: { label: "GPU", feed: "GPU", source: "model" },
      // 로봇 (머리), 테슬라 로드스터, 챗봇 말풍선 off by default (user, 2026-10-26); 원숭이 JPEG too (2026-10-25).
      robot: { label: "로봇 (머리)", feed: "Robots", source: "inflated", off: true },
      humanoid: { label: "휴머노이드 로봇", feed: "Humanoid", source: "model" },
      robotDog: { label: "로봇개", feed: "Robot dog", source: "model" },
      roadster: { label: "테슬라 로드스터", feed: "Tesla", source: "model", off: true },
      headset: { label: "VR 헤드셋", feed: "VR", source: "model" },
      ape: { label: "원숭이 JPEG", feed: "NFT", source: "model", off: true },
      rocket: { label: "로켓", feed: "Rocket", source: "model" },
      chat: { label: "챗봇 말풍선", feed: "Chatbot", source: "inflated", off: true },
      spinner: { label: "로딩 스피너", feed: "Loading", source: "model" },
    },
  },
  sns: {
    label: "SNS",
    kinds: {
      heart: { label: "하트", feed: "Love", source: "inflated" },
      like: { label: "좋아요", feed: "Likes", source: "inflated" },
      comment: { label: "댓글", feed: "Comments", source: "inflated", off: true },
    },
  },
  logo: {
    label: "테크 로고",
    kinds: {
      claude: { label: "Claude", feed: "Claude", source: "mark" },
      openai: { label: "OpenAI", feed: "OpenAI", source: "mark" },
      gemini: { label: "Gemini", feed: "Gemini", source: "mark" },
      deepseek: { label: "DeepSeek", feed: "DeepSeek", source: "mark" },
      apple: { label: "Apple", feed: "Apple", source: "mark" },
      meta: { label: "Meta", feed: "Meta", source: "mark" },
      nvidia: { label: "NVIDIA", feed: "NVIDIA", source: "mark" },
      x: { label: "X", feed: "X", source: "mark" },
      tesla: { label: "Tesla", feed: "Tesla", source: "mark" },
      windows: { label: "Windows", feed: "Windows", source: "mark" },
      instagram: { label: "Instagram", feed: "Instagram", source: "mark" },
      tiktok: { label: "TikTok", feed: "TikTok", source: "mark" },
      bitcoin: { label: "Bitcoin", feed: "Bitcoin", source: "mark" },
      android: { label: "Android", feed: "Android", source: "mark" },
    },
  },
  face: {
    label: "유명인 얼굴",
    kinds: {
      altman: { label: "Sam Altman", feed: "Sam Altman", source: "face" },
      zuckerberg: { label: "Mark Zuckerberg", feed: "Mark Zuckerberg", source: "face" },
      huang: { label: "Jensen Huang", feed: "Jensen Huang", source: "face" },
      pichai: { label: "Sundar Pichai", feed: "Sundar Pichai", source: "face" },
      amodei: { label: "Dario Amodei", feed: "Dario Amodei", source: "face" },
      nadella: { label: "Satya Nadella", feed: "Satya Nadella", source: "face" },
      cook: { label: "Tim Cook", feed: "Tim Cook", source: "face" },
      musk: { label: "Elon Musk", feed: "Elon Musk", source: "face" },
      hassabis: { label: "Demis Hassabis", feed: "Demis Hassabis", source: "face" },
      jassy: { label: "Andy Jassy", feed: "Andy Jassy", source: "face" },
      su: { label: "Lisa Su", feed: "Lisa Su", source: "face" },
      chew: { label: "Shou Zi Chew", feed: "Shou Zi Chew", source: "face" },
      suleyman: { label: "Mustafa Suleyman", feed: "Mustafa Suleyman", source: "face" },
      chesky: { label: "Brian Chesky", feed: "Brian Chesky", source: "face" },
      ma: { label: "Pony Ma", feed: "Pony Ma", source: "face" },
      gates: { label: "Bill Gates", feed: "Bill Gates", source: "face" },
    },
  },
  currency: {
    label: "통화 기호",
    kinds: {
      dollar: { label: "$ 달러", feed: "Dollar", source: "glyph" },
      euro: { label: "€ 유로", feed: "Euro", source: "glyph" },
      pound: { label: "£ 파운드", feed: "Pound", source: "glyph" },
      yen: { label: "¥ 엔·위안", feed: "Yen", source: "glyph" },
      won: { label: "₩ 원", feed: "Won", source: "glyph" },
      bitcoinSign: { label: "₿ 비트코인", feed: "Bitcoin", source: "glyph" },
      rupee: { label: "₹ 루피", feed: "Rupee", source: "glyph" },
      ruble: { label: "₽ 루블", feed: "Ruble", source: "glyph" },
    },
  },
} as const satisfies Record<string, { label: string; kinds: Record<string, KindEntry> }>;

/** bubble/5–8's groups and kinds, by their literal ids. */
export type BaseGroup = keyof typeof OBJECT_GROUPS;
export type BaseKind = { [G in BaseGroup]: keyof (typeof OBJECT_GROUPS)[G]["kinds"] }[BaseGroup];
/** Any group or kind: the five groups' literal ids, or a catalogue's. */
export type ObjectGroup = BaseGroup | (string & {});
export type ObjectKind = BaseKind | (string & {});
export type LogoKind = keyof (typeof OBJECT_GROUPS)["logo"]["kinds"];
export type FaceKind = keyof (typeof OBJECT_GROUPS)["face"]["kinds"];
export type CurrencyKind = keyof (typeof OBJECT_GROUPS)["currency"]["kinds"];

export const BASE_GROUPS = Object.keys(OBJECT_GROUPS) as BaseGroup[];

/** Ids a catalogue kind may not take: the bubble's, and the objects' own settings (objects.ts) and their `On` keys. */
const RESERVED = new Set(["bubble", "page", "pages", "portions", "size", "puff", "facing", "change", "portionMorph", "brand", "faceColour", "duration", "melt", "soften", "wobble", "ripple", "overshoot", "swell", "mercury"]);

export type MergedGroup = { id: string; label: string; kinds: { id: string; entry: KindEntry }[] };

/** Catalogue groups as entries; a group or kind whose id is taken already is left out (and said so), never breaking the page. */
export function mergedCatalogue(catalogue: readonly CatalogueGroup[]): MergedGroup[] {
  const taken = new Set<string>([...RESERVED, ...BASE_GROUPS.flatMap((group) => Object.keys(OBJECT_GROUPS[group].kinds))]);
  const groups = new Set<string>(BASE_GROUPS);
  const merged: MergedGroup[] = [];
  for (const group of catalogue) {
    if (groups.has(group.id) || group.kinds.length === 0) {
      console.warn(`objects: catalogue group "${group.id}" left out (its id is taken, or it has no kinds)`);
      continue;
    }
    groups.add(group.id);
    const kinds: MergedGroup["kinds"] = [];
    for (const kind of group.kinds) {
      if (taken.has(kind.id) || taken.has(`${kind.id}On`) || kind.id.endsWith("On")) {
        console.warn(`objects: catalogue kind "${kind.id}" (${group.id}) left out: its id is taken`);
        continue;
      }
      taken.add(kind.id);
      kinds.push({ id: kind.id, entry: { label: kind.label, feed: kind.feed, source: kind.make.source, off: kind.off, make: kind.make, sub: kind.sub } });
    }
    merged.push({ id: group.id, label: group.label, kinds });
  }
  return merged;
}

const CATALOGUE_GROUPS = mergedCatalogue(CATALOGUE);

/** Every group, bubble/5–8's first, then the catalogue's in its order. */
export const GROUPS: readonly ObjectGroup[] = [...BASE_GROUPS, ...CATALOGUE_GROUPS.map((group) => group.id)];

/** Whether a group is one of the catalogue's (off at the start, its kinds in subgroups). */
export const CATALOGUE_GROUP_IDS: ReadonlySet<string> = new Set(CATALOGUE_GROUPS.map((group) => group.id));

/** Each group's label. */
export const GROUP_LABEL: Readonly<Record<ObjectGroup, string>> = Object.fromEntries([
  ...BASE_GROUPS.map((group) => [group, OBJECT_GROUPS[group].label]),
  ...CATALOGUE_GROUPS.map((group) => [group.id, group.label]),
]);

/** Each group's kinds, in order. */
export const KINDS_OF = Object.fromEntries([
  ...BASE_GROUPS.map((group) => [group, Object.keys(OBJECT_GROUPS[group].kinds)]),
  ...CATALOGUE_GROUPS.map((group) => [group.id, group.kinds.map((kind) => kind.id)]),
]) as unknown as { readonly [G in BaseGroup]: readonly (keyof (typeof OBJECT_GROUPS)[G]["kinds"])[] } & Readonly<Record<ObjectGroup, readonly ObjectKind[]>>;

/** Every kind, group by group. */
export const OBJECT_KINDS: readonly ObjectKind[] = GROUPS.flatMap((group): readonly ObjectKind[] => KINDS_OF[group]);

/** A kind's entry. */
export const KIND: Readonly<Record<ObjectKind, KindEntry & { group: ObjectGroup }>> = Object.fromEntries([
  ...BASE_GROUPS.flatMap((group) => Object.entries(OBJECT_GROUPS[group].kinds).map(([kind, entry]) => [kind, { ...entry, group }])),
  ...CATALOGUE_GROUPS.flatMap((group) => group.kinds.map((kind) => [kind.id, { ...kind.entry, group: group.id }])),
]);

/** A group's subgroups, in order of first appearance (bubble/5–8's groups: one, unnamed). */
export const SUBGROUPS_OF: Readonly<Record<ObjectGroup, readonly { readonly label: string; readonly kinds: readonly ObjectKind[] }[]>> = Object.fromEntries(
  GROUPS.map((group) => {
    const subs = new Map<string, ObjectKind[]>();
    for (const kind of KINDS_OF[group]) {
      const label = KIND[kind].sub ?? "";
      if (!subs.has(label)) subs.set(label, []);
      subs.get(label)!.push(kind);
    }
    return [group, [...subs].map(([label, kinds]) => ({ label, kinds }))];
  }),
) as unknown as Readonly<Record<ObjectGroup, readonly { readonly label: string; readonly kinds: readonly ObjectKind[] }[]>>;
