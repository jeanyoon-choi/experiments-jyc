// The presets' one model: what a preset is, putting one on and telling which one is on. Pure, over plain values
// (presets.test.ts runs it under node); families.ts holds the presets themselves, index.ts binds both to the opening.

import type { FishParameters } from "../fish/goldfish.ts";
import type { ObjectParameters } from "../objects/kinds/parameters.ts";
import type { Feedback, Rates, Visual } from "../state/schema.ts";

/** The slices of the settings a preset may write. */
export type PresetSlices = { rates: Rates; fish: FishParameters; feedback: Feedback; objects: ObjectParameters; visual: Visual };
export type PresetSlice = keyof PresetSlices;
export type PresetPatch = { readonly [Slice in PresetSlice]?: Partial<PresetSlices[Slice]> };

/**
 * `label` its address in the preset list (A2), `name` what it is in a few words. Choosing one writes `patch` over the
 * values as they are, slice by slice: everything else stays (the web, the school and whatever is on the screen carry
 * on under it). A slice in `resets` is first put back to the base's whole, so nothing of the preset before carries
 * into it.
 */
export type Preset = { id: string; label: string; name: string; resets?: readonly PresetSlice[]; patch: PresetPatch };

/** A family is one question asked of the parameters, its members numbered. */
export type PresetFamily = { letter: string; label: string; items: readonly Preset[] };

/**
 * The slices, and `owing`: the preset with `resets` chosen last, until one without is chosen. Known by its having
 * been chosen, not by the values still being exactly its own (a slider moved since, and the material stayed: user,
 * 2026-11-18), so nothing but choosing a preset changes it.
 */
export type PresetState = PresetSlices & { owing: Preset | null };

const slicesOf = (patch: PresetPatch) => Object.keys(patch) as PresetSlice[];

/**
 * The values under `preset`. After a preset with `resets`, one without takes over values it does not hold itself, so
 * what that one took goes back to the base first: the slices it reset whole, of the others the keys it wrote.
 * A written slice is always a new object; an untouched one is the same object.
 */
export function applyPreset<State extends PresetState>(state: State, preset: Preset, base: PresetSlices): State {
  const next: PresetState = { ...state };
  const slices: PresetSlices = next;
  const write = <Slice extends PresetSlice>(slice: Slice, values: Partial<PresetSlices[Slice]> | undefined) => {
    slices[slice] = { ...slices[slice], ...values };
  };
  const restore = <Slice extends PresetSlice>(slice: Slice) => {
    slices[slice] = base[slice];
  };
  const before = state.owing;
  if (before && !preset.resets) {
    for (const slice of before.resets ?? []) restore(slice);
    for (const slice of slicesOf(before.patch)) {
      if (before.resets?.includes(slice)) continue;
      const held = base[slice] as Record<string, unknown>;
      write(slice, Object.fromEntries(Object.keys(before.patch[slice]!).map((key) => [key, held[key]])));
    }
  }
  for (const slice of preset.resets ?? []) restore(slice);
  for (const slice of slicesOf(preset.patch)) write(slice, preset.patch[slice]);
  next.owing = preset.resets ? preset : null;
  return next as State;
}

/** Numbers within 1e-6, colours element by element. */
const same = (a: unknown, b: unknown) =>
  Array.isArray(a) && Array.isArray(b) ? a.every((value, at) => Math.abs(value - b[at]) < 1e-6) : typeof a === "number" && typeof b === "number" ? Math.abs(a - b) < 1e-6 : a === b;
const within = (wanted: object, held: object) => Object.entries(wanted).every(([key, value]) => same(value, (held as Record<string, unknown>)[key]));

/** Whether the values are exactly this preset's: every key it writes, and every key of a slice it resets. */
function holds(state: PresetSlices, preset: Preset, base: PresetSlices) {
  const slices = new Set<PresetSlice>([...(preset.resets ?? []), ...slicesOf(preset.patch)]);
  return [...slices].every((slice) => within(preset.resets?.includes(slice) ? { ...base[slice], ...preset.patch[slice] } : preset.patch[slice]!, state[slice]));
}

/** Which preset the values now are, or null once any of them has been moved. One with `resets` first, since it holds another's values too. */
export function matchPreset(state: PresetSlices, families: readonly PresetFamily[], base: PresetSlices): Preset | null {
  const all = families.flatMap((family) => family.items);
  return all.find((preset) => preset.resets && holds(state, preset, base)) ?? all.find((preset) => !preset.resets && holds(state, preset, base)) ?? null;
}
