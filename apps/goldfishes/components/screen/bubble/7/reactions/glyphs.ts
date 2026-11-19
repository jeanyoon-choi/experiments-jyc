// The three reactions' glyphs and colours (user, 2026-10-24: "어떤 ui
// 컴포넌트가 아니라 아이콘 자체"): a heart, a thumbs-up and a speech bubble,
// each in one colour — no disc, ring, box or count. reaction-meshes.ts puffs
// them into 3D; the panel shows them flat beside its groups.
//
// The heart and comment paths are Instagram's IGDS glyphs, copied from
// scc/components/mobile/arithmetic/default/glyphs.ts (the heart is the outer
// contour of its outline path, which is IGDS's filled heart). The thumb is
// drawn to Facebook's Like thumb, not traced.

import type { ReactionKind } from "./reactions";

export const REACTION_COLOURS: Record<ReactionKind, string> = {
  heart: "#ff2e7e",
  /** Facebook's blue. */
  like: "#0866ff",
  comment: "#9b51e0",
};

const HEART = "M16.792 1.904a6.04 6.04 0 0 0-4.797 2.127 6.052 6.052 0 0 0-4.787-2.127A6.985 6.985 0 0 0 .5 9.122c0 3.61 2.55 5.827 5.015 7.97.283.246.569.494.853.747l1.027.918a44.998 44.998 0 0 0 3.518 3.018 2 2 0 0 0 2.174 0 45.263 45.263 0 0 0 3.626-3.115l.922-.824c.293-.26.59-.519.885-.774 2.334-2.025 4.98-4.32 4.98-7.94a6.985 6.985 0 0 0-6.708-7.218Z";
const COMMENT = "M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L22 22Z";
/** Cuff and hand, in a 24-unit box; the glyph spans about x 6.3–19.4, y 5.5–17.6. */
const THUMB = "M7 11h1.2c.39 0 .7.31.7.7v5.2c0 .39-.31.7-.7.7H7c-.39 0-.7-.31-.7-.7v-5.2c0-.39.31-.7.7-.7ZM9.8 16.52V11.3c1.3-.75 2.35-2.1 2.75-3.8l.28-1.25c.12-.55.65-.88 1.2-.76.76.16 1.2.88 1.12 1.68l-.36 2.45h3.25c.92 0 1.6.84 1.4 1.72l-1.04 4.7c-.16.76-.84 1.28-1.6 1.28H10.6c-.44 0-.8-.36-.8-.8Z";

/** Each icon's box at size 1, CSS px: about a goldfish's length (13 px at its default scale). */
export const REACTION_BOX: Record<ReactionKind, { width: number; height: number }> = {
  heart: { width: 14, height: 14 },
  like: { width: 16, height: 15 },
  comment: { width: 13, height: 13 },
};

const VIEW: Record<ReactionKind, string> = {
  heart: "0 0 24 24",
  like: "5.9 5 14 13",
  comment: "1.5 1.5 21 21",
};

const PATH: Record<ReactionKind, string> = { heart: HEART, like: THUMB, comment: COMMENT };

/** The glyph's SVG path data, in its 24-unit box. */
export function reactionPath(kind: ReactionKind) {
  return PATH[kind];
}

/** The glyph flat, for the panel. */
export function reactionMarkup(kind: ReactionKind) {
  return `<svg viewBox="${VIEW[kind]}" width="100%" height="100%"><path fill="${REACTION_COLOURS[kind]}" d="${PATH[kind]}"/></svg>`;
}
