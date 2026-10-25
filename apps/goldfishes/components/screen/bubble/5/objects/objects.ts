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
// The whole feature is this folder. shapes.ts builds the inflated objects (the
// SNS set among them, blown up like Koons's balloons), models.ts / gpu.ts the
// hard-surface ones; object-pass.ts draws them on the
// raft's canvas with the raft's own shading (render/foam.ts SHADING), so
// every look and coat carries over unchanged. Expected to move into a 3D
// object lab of its own.

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
} & Record<`${ObjectKind}On`, number> &
  /** How often each kind comes, relative to the others in its set. */
  Record<ObjectKind, number>;

export const OBJECT_DEFAULTS = {
  pages: 1,
  portions: 1,
  size: 1,
  // 부풂 0.2 (user, 2026-10-25).
  puff: 0.2,
  ...(Object.fromEntries(
    OBJECT_KINDS.flatMap((kind) => [
      [`${kind}On`, 1],
      [kind, 1],
    ]),
  ) as Record<`${ObjectKind}On` | ObjectKind, number>),
  // 원숭이 JPEG off by default (user, 2026-10-25); its chip brings it in.
  apeOn: 0,
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

export const SHOW_LABELS: Record<(typeof PORTION_SHOWS)[number], string> = {
  bubble: "버블",
  page: "페이지 따라",
  tech: OBJECT_SETS.tech.label,
  sns: OBJECT_SETS.sns.label,
};

export type ObjectControl = { key: "size" | "puff"; label: string; min: number; max: number; step: number };

export const OBJECT_CONTROLS: readonly ObjectControl[] = [
  { key: "size", label: "오브제 크기 (버블 원 대비)", min: 0.5, max: 1.5, step: 0.01 },
  { key: "puff", label: "부풂 (높이 배율)", min: 0, max: 2, step: 0.01 },
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

/** What a page is shown as: its kind in the pages' set (fixed per page), or null for a bubble. */
export function pageKind(page: number, parameters: ObjectParameters): ObjectKind | null {
  const set = pageSet(parameters);
  return set ? kindIn(set, hashOf(page), parameters) : null;
}

/** What a portion under way from `page` is shown as (`seed`: its link's own, in [0, 1)), or null for a bubble. */
export function portionKind(page: number, seed: number, parameters: ObjectParameters): ObjectKind | null {
  const show = PORTION_SHOWS[Math.round(parameters.portions)] ?? "bubble";
  if (show === "bubble") return null;
  if (show === "page") return pageKind(page, parameters);
  return kindIn(show, seed, parameters);
}
