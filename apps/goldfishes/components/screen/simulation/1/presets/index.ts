// The presets over bubble/9's opening.

import { OPENING } from "../state/opening";
import { OPENING_PRESET, presetFamilies } from "./families";
import { applyPreset as applyOver, matchPreset as matchOver, type Preset, type PresetSlices, type PresetState } from "./model";

export { OPENING_PRESET } from "./families";
export type { Preset, PresetFamily, PresetSlices, PresetState } from "./model";

/** What `resets` puts back, and what a preset's own values are told apart from. */
const BASE: PresetSlices = { rates: OPENING.rates, fish: OPENING.fish, feedback: OPENING.feedback, objects: OPENING.objects, visual: OPENING.visual };

export const PRESET_FAMILIES = presetFamilies(BASE);

export const applyPreset = <State extends PresetState>(state: State, preset: Preset): State => applyOver(state, preset, BASE);
export const matchPreset = (state: PresetSlices): Preset | null => matchOver(state, PRESET_FAMILIES, BASE);

/** The opening's slices under a member of the first family (/screen/bubble/9b opens on A2 through ../clock.tsx). */
export function openingUnder(index: number): PresetState {
  const preset = PRESET_FAMILIES[0]!.items[index] ?? PRESET_FAMILIES[0]!.items[OPENING_PRESET]!;
  return applyPreset({ ...BASE, owing: null }, preset);
}
