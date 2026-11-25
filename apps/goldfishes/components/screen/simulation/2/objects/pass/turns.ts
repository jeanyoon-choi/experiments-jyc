// How each object is turned in the screen's plane (각도): none, its own fixed turn, or the way it heads; heads kept
// near upright; and a page's turn sprung towards that rather than set.

import { KIND } from "../kinds/groups.ts";
import { FIELD_KINDS } from "../kinds/layers.ts";

/**
 * A page's turn springs towards where it should face: it gathers speed (never starting at full speed) and settles
 * with a slight give. Per second, and its damping ratio; a half turn peaks near 23 rad/s (22° a frame at 60 fps), is
 * done in 0.3 s and overshoots by about 1° (user, 2026-11-04: 조금 더 찰지게, then faster still while it never jumps).
 */
const TURN_SPRING = 16;
const TURN_DAMPING = 0.75;

export type Turns = {
  /**
   * Where an object should face: none (`facing` 0), its own fixed turn (1, from its seed), or where it is heading
   * (2); a head leaning only a little that way, eased in and out with the morph (`shape`) into or out of a head.
   */
  aim(facing: number, seed: number, heading: number, flowFrom: number, flowTo: number, shape: number): number;
  /** A page's turn this frame, sprung towards `aim` over `dt` seconds from where it was drawn last frame. */
  spring(page: number, aim: number, dt: number): number;
};

export function createTurns(max: number): Turns {
  // 유명인 얼굴: a head stays upright (a face upside down is not read as one), only tilting a little with its way.
  const upright = new Uint8Array(FIELD_KINDS.length);
  FIELD_KINDS.forEach((kind, layer) => {
    if (kind !== "bubble" && KIND[kind].source === "face") upright[layer] = 1;
  });
  /** Per page, the turn it was drawn at last frame (radians, not wrapped) and how fast it was turning. */
  const pageTurn = new Float32Array(max);
  const pageSpin = new Float32Array(max);

  const aim: Turns["aim"] = (facing, seed, heading, flowFrom, flowTo, shape) => {
    // Its turn: none, its own fixed one (from its seed), or where it is heading.
    const spin = seed * 97.13;
    let turn = facing === 1 ? (spin - Math.floor(spin)) * Math.PI * 2 : facing === 2 ? heading : 0;
    // Heads stay near upright, leaning a little the way they head, eased in and out with the morph into or out of a head.
    const s = Math.min(1, Math.max(0, shape));
    const keep = upright[flowFrom]! * (1 - s) + upright[flowTo]! * s;
    if (keep > 0) {
      const lean = Math.sin(turn) * 0.175;
      turn = Math.atan2((1 - keep) * Math.sin(turn) + keep * Math.sin(lean), (1 - keep) * Math.cos(turn) + keep * Math.cos(lean));
    }
    return turn;
  };
  // A page turns towards that, never in one frame: a heading that swings round, a morph into a head, a change of 각도.
  const spring: Turns["spring"] = (page, aimed, dt) => {
    const was = pageTurn[page]!;
    const spin = pageSpin[page]! + (TURN_SPRING * TURN_SPRING * Math.atan2(Math.sin(aimed - was), Math.cos(aimed - was)) - 2 * TURN_DAMPING * TURN_SPRING * pageSpin[page]!) * dt;
    const turn = was + spin * dt;
    pageSpin[page] = spin;
    pageTurn[page] = turn;
    return turn;
  };
  return { aim, spring };
}
