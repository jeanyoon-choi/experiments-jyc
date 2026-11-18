// What the panels adjust, as types, with the defaults under them. Nothing here runs per frame.

import { LOOK_DEFAULTS, type Look } from "../render/foam";
import { AREA_BUDGET } from "../raft/defaults";
import type { FishPaletteId, FishParameters } from "../fish/goldfish";
import type { LifeParameters } from "../fish/lifecycle";
import type { ObjectParameters } from "../objects/kinds/parameters";
import type { LabSettings } from "../objects/morph/lab";
import type { SpreadParameters } from "../spread/contagion";
import type { SoundParameters } from "../sound/sound";
import type { ViewId } from "../raft/views";
import type { Feedback } from "./feedback";

export { FEEDBACK_DEFAULTS, type Feedback } from "./feedback";

export type PanelId = "network" | "objects" | "visual" | "fish" | "sound";

/** bubble/7: the raft (군집), the raft with 전파, or the 랩's one object. */
export type Mode = "raft" | "spread" | "lab";

/** The web parameters the network panel sets. */
export type Rates = { growth: number; volatility: number; floor: number; dynamics: number; burstAt: number; recovery: number };

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
