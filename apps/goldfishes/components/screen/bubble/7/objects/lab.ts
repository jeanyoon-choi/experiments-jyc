// 랩 (user, 2026-10-27): instead of the raft's thousand bubbles, one object at a
// time, large, in the same material and on the same liquid (objects.ts's
// parameters, which the raft reads too): a place to fine-tune shapes and the
// morph between them, and to try materials, whose every change the raft (군집)
// takes on at once.

import type { LAB_SEQUENCES } from "./morph";

export type LabSettings = {
  /** The kind last pressed (a field kind), "" for none yet, and how many presses so far (a press on the same kind again counts). */
  target: string;
  pick: number;
  /** Bumped by a tap on the canvas: on to the next in the sequence. */
  step: number;
  sequence: (typeof LAB_SEQUENCES)[number];
  /** 1: on to the next by itself, after `hold` seconds set. */
  auto: number;
  hold: number;
  /** −1: the morph runs on its clock; 0–1: held at that share of it (to look at one moment). */
  scrub: number;
  /** Its turn in the screen's plane, radians. */
  turn: number;
  /** Its size, times 0.3 of the screen's shorter side. */
  scale: number;
  /** 1: every kind in the sequence, also those switched off for the raft. */
  all: number;
};

export const LAB_DEFAULTS: LabSettings = { target: "", pick: 0, step: 0, sequence: "heart", auto: 1, hold: 1.2, scrub: -1, turn: 0, scale: 1, all: 1 };
