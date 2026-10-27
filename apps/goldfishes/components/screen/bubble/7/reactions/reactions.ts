// 반응 (user, 2026-10-24, experimental): now and then, as a goldfish reaches a
// keyword's bubble, a heart, a like or a comment pops up at its upper right and
// floats off — the signs of circulation (NOTES 1020: "Likes / Comments … ♥
// '유통과정의 기호'일 뿐"), three of SNS's 사칙연산. Only now and then: one
// touch in many, never two within `gap` seconds, at most `most` at once.
//
// The whole feature is this folder. The school records its new touches
// (`GoldfishSchool.touches`); the frame loop hands them to `Reactions.step`;
// the fish panel shows `ReactionSection`. Removing it: delete reactions/, and
// the lines marked 반응 in render/frame-loop.ts, index.tsx, panels/fish-panel.tsx
// and settings.ts (the school's touch record can stay; it costs nothing).

export type ReactionKind = "heart" | "like" | "comment";

export type ReactionParameters = {
  /** Each kind on (1) or off (0); all off by default, so none pop up. */
  heartOn: number;
  likeOn: number;
  commentOn: number;
  /** Chance, in percent, that a fish reaching a bubble gets a reaction (at 380 fish, fish reach bubbles about 70 times a second). */
  chance: number;
  /** Seconds at least between two reactions, anywhere on the screen. */
  gap: number;
  /** Reactions on the screen at once, at most. */
  most: number;
  /** Their size, apart from the fish's (1: about a goldfish's length at its default); each kind's own size multiplies it. */
  size: number;
  /** Seconds each stays, from popping up to fading away. */
  duration: number;
  /** How often each kind comes, relative to the others. */
  heart: number;
  like: number;
  comment: number;
  /** Each kind's own size, times `size`. */
  heartSize: number;
  likeSize: number;
  commentSize: number;
};

export const REACTION_DEFAULTS: ReactionParameters = {
  heartOn: 0,
  likeOn: 0,
  commentOn: 0,
  chance: 5,
  gap: 0.12,
  most: 10,
  size: 1,
  duration: 1.9,
  heart: 0.5,
  like: 0.3,
  comment: 0.2,
  heartSize: 1,
  likeSize: 1,
  commentSize: 1,
};

export const REACTION_KINDS: readonly ReactionKind[] = ["heart", "like", "comment"];

/** Any kind on. */
export function reactionsOn(parameters: ReactionParameters) {
  return REACTION_KINDS.some((kind) => parameters[`${kind}On`] >= 0.5);
}

export type ReactionControl = { key: Exclude<keyof ReactionParameters, `${ReactionKind}On`>; label: string; min: number; max: number; step: number };

/** For all three. */
export const REACTION_CONTROLS: readonly ReactionControl[] = [
  { key: "chance", label: "버블에 닿을 때 나올 확률 (%)", min: 0, max: 30, step: 0.1 },
  { key: "gap", label: "최소 간격 (초)", min: 0, max: 6, step: 0.05 },
  { key: "most", label: "한 번에 최대", min: 1, max: 30, step: 1 },
  { key: "size", label: "반응 전체 크기 (금붕어 크기와 별개)", min: 0.5, max: 3, step: 0.05 },
  { key: "duration", label: "머무는 시간 (초)", min: 0.8, max: 4, step: 0.1 },
];

/** Each kind's share and size. */
export const KIND_CONTROLS: readonly { kind: ReactionKind; label: string; controls: readonly ReactionControl[] }[] = [
  { kind: "heart", label: "하트", controls: [{ key: "heart", label: "하트 비중 (얼마나 자주)", min: 0, max: 1, step: 0.05 }, { key: "heartSize", label: "하트 크기", min: 0.3, max: 3, step: 0.05 }] },
  { kind: "like", label: "좋아요", controls: [{ key: "like", label: "좋아요 비중 (얼마나 자주)", min: 0, max: 1, step: 0.05 }, { key: "likeSize", label: "좋아요 크기", min: 0.3, max: 3, step: 0.05 }] },
  { kind: "comment", label: "댓글", controls: [{ key: "comment", label: "댓글 비중 (얼마나 자주)", min: 0, max: 1, step: 0.05 }, { key: "commentSize", label: "댓글 크기", min: 0.3, max: 3, step: 0.05 }] },
];

/** A kind's size multiplier, times the overall size. */
export function sizeOf(kind: ReactionKind, parameters: ReactionParameters) {
  return parameters.size * parameters[`${kind}Size`];
}

/** One fish gets no second reaction within this many seconds. */
const FISH_REST = 4;

/**
 * Decides which touches get a reaction. Pure apart from `random`, so it can be
 * tested: give it the time, the touching fish's seed and how many are showing.
 */
export class ReactionPicker {
  private lastAt = -Infinity;
  private readonly fishLast = new Map<number, number>();

  pick(time: number, seed: number, showing: number, parameters: ReactionParameters, random: () => number): ReactionKind | null {
    if (showing >= parameters.most || time - this.lastAt < parameters.gap) return null;
    if (time - (this.fishLast.get(seed) ?? -Infinity) < FISH_REST) return null;
    if (random() * 100 >= parameters.chance) return null;
    // An off kind has no share.
    const share = (kind: ReactionKind) => (parameters[`${kind}On`] >= 0.5 ? parameters[kind] : 0);
    const heart = share("heart");
    const like = share("like");
    const total = heart + like + share("comment");
    if (total <= 0) return null;
    const roll = random() * total;
    const kind: ReactionKind = roll < heart ? "heart" : roll < heart + like ? "like" : "comment";
    this.lastAt = time;
    if (this.fishLast.size > 400) for (const [key, at] of this.fishLast) if (time - at > FISH_REST) this.fishLast.delete(key);
    this.fishLast.set(seed, time);
    return kind;
  }
}
