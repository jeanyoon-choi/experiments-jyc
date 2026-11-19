// The displayed distribution's relaxation. The weights themselves are the world's (World.shown): they start
// uniform — again whenever the world starts over — and relax, without beats, toward one beat of the model
// (today one power-iteration step), so the display converges to the settled weight continuously and again
// whenever the model changes.

import type { World } from "../model/index.ts";

/** The display relaxes toward one power-iteration step with this time constant, seconds. */
const STEP_SECONDS = 1.1;

/** Continuous power iteration on the web as it is now, over `step` seconds. */
export function stepDisplay(world: Pick<World<never>, "show">, step: number) {
  world.show(Math.min(1, step / STEP_SECONDS));
}
