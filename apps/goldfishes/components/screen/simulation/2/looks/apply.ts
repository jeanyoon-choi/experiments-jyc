// Putting a 연출 on, and telling which one is on.

import { materialOf } from "../render/materials";
import type { Visual } from "../state/schema";
import { LOOK_BASE } from "./base";
import { toHex } from "./colour";

/** The look a 연출 button gives: the opening values, then its own. The raft's area and flow stay unless the look sets them. */
export function withLook(current: Visual, look: Partial<Visual>): Visual {
  // A material's own choices (인쇄물's 방향) stay as they are set: they run beside the 연출, not under it.
  const choices = materialOf(look.material ?? LOOK_BASE.material)?.choices ?? [];
  const kept = Object.fromEntries(choices.map((choice) => [choice.key, (current as Record<string, unknown>)[choice.key]]).filter(([, value]) => value !== undefined));
  // 라이브 화면 is the room's, not a 연출's: it stays on, as set, through every 연출.
  const live = { liveScreen: current.liveScreen ?? LOOK_BASE.liveScreen, liveStrength: current.liveStrength ?? LOOK_BASE.liveStrength, liveSize: current.liveSize ?? LOOK_BASE.liveSize };
  return { ...LOOK_BASE, area: current.area, portions: current.portions, flow: current.flow ?? 1, ...live, ...look, ...kept };
}

/** 섞음's own values: a 연출 stays the one chosen while 섞음 is turned on over it (`loose`). */
const MIX_KEYS: readonly string[] = ["coatingMix", "mixHue", "mixSaturation", "mixLightness", "mixDepth"];

export function sameLook(visual: Visual, look: Partial<Visual>, loose = false) {
  const target = withLook(visual, look);
  return (Object.keys(target) as (keyof Visual)[]).every((key) => {
    if (loose && MIX_KEYS.includes(key)) return true;
    // A uniform added while the page was open has no value in its state yet: its default stands in (as the sliders do).
    const a = visual[key] ?? LOOK_BASE[key];
    const b = target[key] ?? LOOK_BASE[key];
    return typeof a === "number" ? a === b : toHex(a) === toHex(b as typeof a);
  });
}
