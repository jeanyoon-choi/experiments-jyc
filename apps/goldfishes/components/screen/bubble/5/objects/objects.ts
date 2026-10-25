// 오브제 (user, 2026-10-25, a first trial): every page is still a bubble —
// its rank's area, its place in the raft, the disc the goldfish reach and
// watch — but it is shown as one 3D object in the bubbles' own material
// (NOTES 1020: "It's still ontologically all bubbles, but shaped as 3d
// objects"; Koons, the object, pop, the readymade). The hype chain's objects
// for now: an AI sparkle, a cloud, a GPU, a robot's head, then (the same
// day) a humanoid robot, a robot dog, a Tesla Roadster, a VR headset, a bored ape, a rocket, a chatbot's speech
// bubble and a loading spinner.
//
// The whole feature is this folder. shapes.ts builds the inflated objects and
// models.ts / gpu.ts the hard-surface ones; object-pass.ts draws them on the
// raft's canvas with the raft's own shading (render/foam.ts SHADING), so
// every look and coat carries over unchanged. Expected to move into a 3D
// object lab of its own.

export const OBJECT_KINDS = [
  "sparkle",
  "cloud",
  "gpu",
  "robot",
  "humanoid",
  "robotDog",
  "roadster",
  "headset",
  "ape",
  "rocket",
  "chat",
  "spinner",
] as const;

export type ObjectKind = (typeof OBJECT_KINDS)[number];

export type ObjectParameters = {
  /** 1: pages shown as objects; 0: as bubbles (bubble/4). */
  shown: number;
  /** The portions under way along the links (왔다갔다 하는 것): 1 (the default) small objects, their source page's; 0 bubbles, as in bubble/4. */
  portions: number;
  /** Size in its bubble's disc: 1 as the objects are fitted to it. */
  size: number;
  /** Height over the disc, times the object's own. */
  puff: number;
} & Record<`${ObjectKind}On`, number> &
  /** How often each kind comes, relative to the others. */
  Record<ObjectKind, number>;

export const OBJECT_DEFAULTS = {
  shown: 1,
  portions: 1,
  size: 1,
  puff: 1,
  ...(Object.fromEntries(
    OBJECT_KINDS.flatMap((kind) => [
      [`${kind}On`, 1],
      [kind, 1],
    ]),
  ) as Record<`${ObjectKind}On` | ObjectKind, number>),
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
};

export type ObjectControl = { key: "size" | "puff" | ObjectKind; label: string; min: number; max: number; step: number };

export const OBJECT_CONTROLS: readonly ObjectControl[] = [
  { key: "size", label: "오브제 크기 (버블 원 대비)", min: 0.5, max: 1.5, step: 0.01 },
  { key: "puff", label: "부풂 (높이 배율)", min: 0.2, max: 2, step: 0.01 },
];

/** A stable value in [0, 1) per page. */
function hashOf(page: number) {
  const value = Math.sin(page * 91.345 + 17.17) * 43_758.5453;
  return value - Math.floor(value);
}

/** The object a page is shown as, among the kinds on, by their shares; null when none is on. */
export function kindOf(page: number, parameters: ObjectParameters): ObjectKind | null {
  let total = 0;
  for (const kind of OBJECT_KINDS) if (parameters[`${kind}On`] >= 0.5) total += Math.max(0, parameters[kind]);
  if (total <= 0) return null;
  let roll = hashOf(page) * total;
  let last: ObjectKind | null = null;
  for (const kind of OBJECT_KINDS) {
    if (parameters[`${kind}On`] < 0.5 || parameters[kind] <= 0) continue;
    last = kind;
    roll -= parameters[kind];
    if (roll < 0) return kind;
  }
  return last;
}
