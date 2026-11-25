// The panels' state as one object: its opening, and every way it changes. Pure (the raft's own side of a change is
// use-settings.ts's). A slice that did not change stays the same object.

import type { SetStateAction } from "react";
import { FISH_DEFAULTS, type FishPaletteId } from "../fish/goldfish";
import { LAB_DEFAULTS } from "../objects/morph/lab"; // 랩
import { applyPreset, type Preset, type PresetState } from "../presets";
import type { Colour } from "../render/foam";
import { SOUND_DEFAULTS } from "../sound/sound";
import { SPREAD_DEFAULTS } from "../spread/contagion"; // 전파
import { DEFAULT_DIVERSITY } from "../web/model";
import { OPENING } from "./opening";
import { SYSTEM_OPENING } from "../rules/versions";
import { FEEDBACK_DEFAULTS, type Settings } from "./schema";

// 기본값 2 (user, 2026-10-11): the defaults (fish included) on a mid grey (#5e5e5e) instead of black; a button in the goldfish panel, not the default.
/** 기본값 (the goldfish panel's): bubble/1's black. */
export const FIRST_BACKGROUND: Colour = [0, 0, 0];
export const SECOND_BACKGROUND: Colour = [94 / 255, 94 / 255, 94 / 255];
export const DEFAULT_FISH_PALETTE: FishPaletteId = "instagram";
export const DEFAULT_INFLUENCE = 0.2;

/** The settings, and which preset is still owed its values back (presets/model.ts `owing`). */
export type SettingsState = Settings & Pick<PresetState, "owing">;

/** What the page opens with, under the opening preset's slices (presets openingUnder). */
export function initialSettings(opening: PresetState): SettingsState {
  return {
    system: SYSTEM_OPENING,
    view: "network",
    rates: opening.rates,
    damping: OPENING.damping,
    population: OPENING.pages,
    groups: OPENING.groups,
    diversity: DEFAULT_DIVERSITY,
    visual: opening.visual,
    fishCount: OPENING.fishCount,
    fish: opening.fish,
    fishPalette: OPENING.fishPalette,
    feedback: opening.feedback,
    life: OPENING.life,
    objects: opening.objects,
    sound: SOUND_DEFAULTS,
    mode: "raft",
    lab: LAB_DEFAULTS,
    spread: SPREAD_DEFAULTS,
    owing: opening.owing,
  };
}

type SetAction = { [Slice in keyof Settings]: { type: "set"; slice: Slice; update: SetStateAction<Settings[Slice]> } }[keyof Settings];

export type SettingsAction =
  | SetAction
  /** A preset chosen (presets/model.ts applyPreset). */
  | { type: "preset"; preset: Preset }
  /** 기본값으로 (black) or 기본값 2 (grey): the fish, their colour and feedback, and the ground under them. */
  | { type: "fish-defaults"; second: boolean }
  /** 기본값 3: every panel back to the set this experiment opened with (the sound, the modes and 그룹 다양성 stay). */
  | { type: "opening"; opening: PresetState };

/** As a useState setter: a value or an updater; the same value leaves the state as it is. */
function set({ slice, update }: SetAction, state: SettingsState): SettingsState {
  const next = typeof update === "function" ? (update as (current: unknown) => unknown)(state[slice]) : update;
  return Object.is(next, state[slice]) ? state : { ...state, [slice]: next };
}

export function reduceSettings(state: SettingsState, action: SettingsAction): SettingsState {
  switch (action.type) {
    case "set":
      return set(action, state);
    case "preset":
      return applyPreset(state, action.preset);
    case "fish-defaults":
      return {
        ...state,
        fish: FISH_DEFAULTS,
        fishPalette: DEFAULT_FISH_PALETTE,
        visual: { ...state.visual, background: action.second ? SECOND_BACKGROUND : FIRST_BACKGROUND },
        feedback: { ...FEEDBACK_DEFAULTS, influence: DEFAULT_INFLUENCE },
      };
    case "opening":
      // The look is the opening's before its preset (OPENING.visual), as 비주얼 → 처음 값으로; the rest as the page opened.
      return {
        ...state,
        view: "network",
        rates: action.opening.rates,
        damping: OPENING.damping,
        groups: OPENING.groups,
        population: OPENING.pages,
        visual: OPENING.visual,
        fishCount: OPENING.fishCount,
        fish: action.opening.fish,
        fishPalette: OPENING.fishPalette,
        feedback: action.opening.feedback,
        life: OPENING.life,
        objects: action.opening.objects,
      };
  }
}
