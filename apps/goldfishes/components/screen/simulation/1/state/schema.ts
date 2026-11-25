// What the panels adjust, as types, with the defaults under them. Nothing here runs per frame.

import { LOOK_DEFAULTS, type Look } from "../render/foam";
import { AREA_BUDGET } from "../raft/defaults";
import type { FishPaletteId, FishParameters } from "../fish/goldfish";
import type { LifeParameters } from "../fish/lifecycle";
import type { ObjectParameters } from "../objects/kinds/parameters";
import type { LabSettings } from "../objects/morph/lab";
import { OPENING_CHOICES, type Choices } from "../rules/versions";
import type { SpreadParameters } from "../spread/contagion";
import type { SoundParameters } from "../sound/sound";
import type { ViewId } from "../raft/views";
import type { RuleId } from "../model/agents";
import type { Feedback } from "./feedback";

export { FEEDBACK_DEFAULTS, type Feedback } from "./feedback";

export type PanelId = "system" | "network" | "objects" | "visual" | "fish" | "sound";

/** bubble/7: the raft (군집), the raft with 전파, or the 랩's one object. */
export type Mode = "raft" | "spread" | "lab";

/** The web parameters the network panel sets. */
export type Rates = { growth: number; volatility: number; floor: number; dynamics: number; burstAt: number; recovery: number };

/**
 * Which model decides (네트워크 → 규칙): bubble/9's PageRank ("PR", the baseline) or the two myopic agents under one of
 * their conditions (model/agents.ts RULES). `zeroSum` 1: a bubble's size is its share of one fixed total; 0: its own
 * heat alone. `open` 0: the school is bubble/9's (the panel's count, its dead replaced in waves); 1: M9's open audience
 * (fish come with a stroke and leave when nothing in view is worth staying for).
 */
export type Model = {
  id: "PR" | RuleId;
  zeroSum: number;
  open: number;
  /** How far a goldfish looks about, as a share of the field's shorter side; 0: the whole screen (bubble/9). No control: rules/attach.ts does this job. */
  near: number;
  /** With the goldfish's answer `worth` (rules/attach.ts): the pull a bubble must have to hold a fish; 1 is a bubble of one fish's worth, known, empty, at its edge. */
  worth: number;
  /** A stroke's bubble: how many times a fair share large it comes in (while the raft's size is fixed), and with how much appeal. */
  strokeSize: number;
  strokeQuality: number;
} & Choices; // The agent model's answers (rules/versions.ts): per question the answer in use, 0 bubble/9's.
export const MODEL_OPENING: Model = { id: "에이전트", zeroSum: 1, open: 0, near: 0, worth: 0.5, strokeSize: 5, strokeQuality: 2.5, ...OPENING_CHOICES };

/** Portions carrying less than this share of the mean flow are not drawn (they would read as specks). */
export const LEAST_PORTION = 0.5;

/**
 * Everything the visual panel adjusts: the renderer's look plus the raft's own scale and flow.
 * `flow` 0 draws no flow bubbles at all (네트워크 → 흐름 버블 끔; user, 2026-11-12); `portions` is how small a flow is still drawn.
 */
export type Visual = Look & { area: number; portions: number; flow: number };

export const VISUAL_DEFAULTS: Visual = { ...LOOK_DEFAULTS, area: AREA_BUDGET, portions: LEAST_PORTION, flow: 1 };

/** The renderer's look for a frame: the visual panel's, without the raft's own area and portions. */
export function lookOf(visual: Visual): Look {
  const { area, portions, flow, ...look } = visual;
  void area;
  void portions;
  void flow;
  // A uniform added while the page was open has no value in its state yet, and one never set would be 0 in the
  // shader (섞음's S and L at 0: every coat black): the defaults stand under whatever the state holds.
  return { ...LOOK_DEFAULTS, ...look };
}

/** Every panel's values: one slice each, replaced whole when it changes (the frame loop caches by a slice's identity). */
export type Settings = {
  // 네트워크
  model: Model;
  view: ViewId;
  rates: Rates;
  damping: number;
  population: number;
  groups: number;
  diversity: number;
  // 비주얼
  visual: Visual;
  // 금붕어
  fishCount: number;
  fish: FishParameters;
  fishPalette: FishPaletteId;
  feedback: Feedback;
  // 생애주기
  life: LifeParameters;
  // 오브제
  objects: ObjectParameters;
  // 소리
  sound: SoundParameters;
  // 모드: 군집, 전파, 랩
  mode: Mode;
  lab: LabSettings;
  spread: SpreadParameters;
};
