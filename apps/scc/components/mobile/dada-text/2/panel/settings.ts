import type { Look } from "../drawing/look";
import type { Reach } from "../reading/paint";
import type { CommandGroup } from "../words/vocabulary";

/** Everything the option panel sets: whether the clone is replaced and how far, which vocabulary, and how cells are drawn. */
export type Settings = { replaced: boolean; reach: Reach; group: CommandGroup; look: Look };

/** /1 opens on 주의, Didot, no frames, a 1 px edge, white letters on black. */
export const defaultSettings: Settings = {
  replaced: true,
  reach: "all",
  group: "attention",
  look: { font: "serif", border: 0, dark: true, ink: "mono", edge: 1 },
};
