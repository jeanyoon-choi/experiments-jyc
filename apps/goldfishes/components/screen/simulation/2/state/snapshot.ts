// JSON 내려받기: every panel's values as a file.

import { lookOf, type Settings } from "./schema";

/** The settings in the form they are saved in (its keys and their order are the file's). */
export function snapshotOf({ system, visual, view, rates, damping, population, groups, diversity, fishCount, fish, fishPalette, feedback, life, objects, sound, mode, lab, spread }: Settings) {
  return {
    look: lookOf(visual),
    raft: { area: visual.area, portions: visual.portions, flow: visual.flow ?? 1 },
    system,
    network: { view, rates, damping, pages: population, groups, diversity },
    fish: { count: fishCount, parameters: fish, palette: fishPalette, feedback },
    life,
    objects,
    sound,
    mode,
    lab,
    spread,
  };
}

/**
 * Every panel's values at once, as a JSON file to save: `look` is the
 * visual panel's look in the form a LOOKS entry takes (paste it as a new
 * 연출), the rest records the raft, network, goldfish and sound with it.
 */
export function saveSnapshot(settings: Settings) {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const blob = new Blob([JSON.stringify({ experiment: "screen/simulation/2", savedAt: new Date().toISOString(), ...snapshotOf(settings) }, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `simulation-2-${stamp}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
