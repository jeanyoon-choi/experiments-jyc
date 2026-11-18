// The `?replay` hook: the frame loop stepped by hand, for captures that can be compared pixel by pixel.

import type { ObjectPass } from "../objects/object-pass";
import type { FoamRenderer } from "../render/foam";

/**
 * `?replay`: nothing runs by itself. `window.bubbleReplay.step(n)` advances n frames of exactly 1/60 s, with the
 * school stepped here instead of in its worker, the materials on the raft's clock and the fish taking the pages'
 * discs as bubbles (the objects' own reach arrives with their bakes, at no fixed frame) — so the same steps under the
 * same settings draw the same pixels, and a refactor can be checked against a capture (components/bubble/docs/9.md).
 */
export const REPLAY = typeof window !== "undefined" && window.location.search.includes("replay");

/** Puts the materials on `clock` and `window.bubbleReplay` in charge of `tick` (the loop's frame, by its time in ms). */
export function installReplay(tick: (now: number) => void, clock: () => number, renderer: Pick<FoamRenderer, "setClock" | "loaded">, objectPass: Pick<ObjectPass, "idle">) {
  let frames = 0;
  renderer.setClock(clock);
  (window as unknown as { bubbleReplay?: unknown }).bubbleReplay = {
    step: (count: number) => {
      for (let frame = 0; frame < count; frame += 1) tick(((frames += 1) * 1_000) / 60);
      return frames;
    },
    /** No bake under way or waiting, no room, still or sheet on its way: what is drawn no longer depends on when the workers answer. */
    idle: () => objectPass.idle() && renderer.loaded(),
    waiting: () => ({ bakes: !objectPass.idle(), assets: !renderer.loaded() }),
  };
}
