// Where each part sits on the sheet, one arrangement for each major version
// (a minor version has its major's structure, so its arrangement too). The
// model says what relates to what; this file only says where it is drawn.
// v2 follows note 1118's diagram 5: audiences above the dotted line, the
// installation below it.

import { both } from "../model/text.ts";
import type { Text } from "../model/index.ts";

export const SHEET = { width: 1000, height: 700 };

export type Box = { x: number; y: number; w: number; h: number };
export type Point = { x: number; y: number };

export type Layout = {
  boxes: Record<string, Box>;
  /** Sideways shift of a relation's line, so two between the same pair do not overlap. */
  lanes?: Record<string, number>;
  /** The dotted line between the audiences and the installation. */
  divide?: number;
  captions?: { x: number; y: number; text: Text }[];
  /** Where a node's name goes when its usual place is crossed by a line. */
  names?: Record<string, { x: number; y: number; anchor: "start" | "middle" | "end" }>;
};

const INNER: Record<string, Box> = {
  "g-vector": { x: 520, y: 528, w: 130, h: 44 },
  "b-vector": { x: 860, y: 528, w: 130, h: 44 },
  "g-semantic": { x: 520, y: 628, w: 130, h: 44 },
  "b-semantic": { x: 860, y: 628, w: 130, h: 44 },
};

const LOOP: Layout = {
  boxes: {
    audience: { x: 600, y: 26, w: 320, h: 84 },
    "audience-input": { x: 208, y: 26, w: 52, h: 90 },
    "gb-screen": { x: 70, y: 226, w: 330, h: 196 },
    "legacy-output": { x: 590, y: 226, w: 340, h: 196 },
    "goldfish-mobiles": { x: 80, y: 528, w: 236, h: 116 },
    "mobile-single": { x: 392, y: 544, w: 46, h: 80 },
    ...INNER,
  },
  lanes: { keyword: -26, feedback: 26 },
  divide: 142,
  captions: [{ x: 520, y: 506, text: both("[1] 안: 금붕어와 버블이 지닌 것", "Inside [1]: what a goldfish and a bubble carry") }],
  names: { "audience-input": { x: 272, y: 104, anchor: "start" } },
};

export const LAYOUTS: Record<string, Layout> = {
  v0: {
    boxes: {
      audience: { x: 70, y: 26, w: 320, h: 84 },
      "audience-input": { x: 470, y: 26, w: 52, h: 90 },
      "gb-screen": { x: 70, y: 226, w: 330, h: 196 },
      "surrounding-pcs": { x: 590, y: 226, w: 340, h: 196 },
    },
    lanes: { hype: -28, "agents-respond": 28, become: -60 },
    captions: [{ x: 70, y: 500, text: both("자극이 문턱을 넘으면: 상전이 → 무리 → 어항 탈출", "Past a threshold of stimulus: phase transition → swarm → out of the aquarium") }],
    names: { "audience-input": { x: 496, y: 16, anchor: "middle" } },
  },
  v1: {
    boxes: {
      audience: { x: 600, y: 26, w: 320, h: 84 },
      "audience-input": { x: 208, y: 26, w: 52, h: 90 },
      "gb-screen": { x: 70, y: 226, w: 330, h: 196 },
      "goldfish-mobiles": { x: 560, y: 266, w: 236, h: 116 },
      "mobile-single": { x: 880, y: 284, w: 46, h: 80 },
      profile: { x: 800, y: 500, w: 190, h: 44 },
      ranking: { x: 800, y: 600, w: 190, h: 44 },
      "website-screens": { x: 100, y: 520, w: 270, h: 130 },
    },
    names: {
      "audience-input": { x: 272, y: 104, anchor: "start" },
      "goldfish-mobiles": { x: 678, y: 256, anchor: "middle" },
      "mobile-single": { x: 872, y: 404, anchor: "end" },
    },
  },
  v2: LOOP,
};

const INSET = 14;

function clamp(value: number, low: number, high: number) {
  return Math.min(high, Math.max(low, value));
}

/**
 * The straight line of a relation, from the edge of one box to the edge of the
 * other. Boxes that face each other are joined square; others at a slant.
 */
export function line(a: Box, b: Box, lane = 0): [Point, Point] {
  const dx = b.x + b.w / 2 - (a.x + a.w / 2);
  const dy = b.y + b.h / 2 - (a.y + a.h / 2);
  const overlapX = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const overlapY = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  const vertical = overlapX > 2 * INSET ? true : overlapY > 2 * INSET ? false : Math.abs(dy) > Math.abs(dx);

  if (vertical) {
    const ya = dy > 0 ? a.y + a.h : a.y;
    const yb = dy > 0 ? b.y : b.y + b.h;
    if (overlapX > 2 * INSET) {
      const x = Math.max(a.x, b.x) + overlapX / 2 + lane;
      return [{ x, y: ya }, { x, y: yb }];
    }
    return [
      { x: clamp(b.x + b.w / 2, a.x + INSET, a.x + a.w - INSET), y: ya },
      { x: clamp(a.x + a.w / 2, b.x + INSET, b.x + b.w - INSET), y: yb },
    ];
  }

  const xa = dx > 0 ? a.x + a.w : a.x;
  const xb = dx > 0 ? b.x : b.x + b.w;
  if (overlapY > 2 * INSET) {
    const y = Math.max(a.y, b.y) + overlapY / 2 + lane;
    return [{ x: xa, y }, { x: xb, y }];
  }
  return [
    { x: xa, y: clamp(b.y + b.h / 2, a.y + INSET, a.y + a.h - INSET) },
    { x: xb, y: clamp(a.y + a.h / 2, b.y + INSET, b.y + b.h - INSET) },
  ];
}
