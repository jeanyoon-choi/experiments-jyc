// The reactions alive now: where each popped up, when, and its own tilt, rise
// and turn. Stepped by the frame loop from the school's touches; drawn in 3D
// by reaction-meshes.ts in the goldfish scene. No three.js here, so the loop
// can hold it before the scene has loaded.

import { REACTION_BOX } from "./glyphs";
import { ReactionPicker, reactionsOn, sizeOf, type ReactionKind, type ReactionParameters } from "./reactions";

export const MOST_REACTIONS = 30;

/** How far up and right of a fish's head a reaction starts, CSS px at fish scale 1. */
const OFFSET_X = 7;
const OFFSET_Y = 6;

export type LiveReaction = {
  kind: ReactionKind;
  /** Its centre where it popped up, CSS px of the field. */
  x: number;
  y: number;
  /** When it popped up (the loop's clock, seconds) and its edge length then, px. */
  born: number;
  size: number;
  /** Its own: in-plane tilt (radians), rise (px), sideways drift (px) and how far it rocks to show its depth (radians). */
  tilt: number;
  rise: number;
  drift: number;
  rock: number;
};

export class Reactions {
  readonly live: LiveReaction[] = [];
  private readonly picker = new ReactionPicker();

  /** This step's new touches (x, y, seed each, `count` of them), in CSS px of a field `width` wide. */
  step(touches: Float64Array, count: number, parameters: ReactionParameters, fishScale: number, time: number, width: number) {
    const live = this.live;
    for (let index = live.length - 1; index >= 0; index -= 1) {
      if (time - live[index]!.born < parameters.duration) continue;
      live[index] = live[live.length - 1]!;
      live.pop();
    }
    if (!reactionsOn(parameters)) {
      live.length = 0;
      return;
    }
    const reach = Math.max(0.4, fishScale);
    for (let index = 0; index < count && live.length < MOST_REACTIONS; index += 1) {
      const kind = this.picker.pick(time, touches[index * 3 + 2]!, live.length, parameters, Math.random);
      if (!kind) continue;
      const box = REACTION_BOX[kind];
      const size = Math.max(box.width, box.height) * sizeOf(kind, parameters);
      const fishX = touches[index * 3]!;
      const fishY = touches[index * 3 + 1]!;
      // Upper right of the fish; at the right edge, upper left; never above the top.
      const right = fishX + OFFSET_X * reach + size < width - 4;
      const x = right ? fishX + OFFSET_X * reach + size / 2 : fishX - OFFSET_X * reach - size / 2;
      const y = Math.max(size / 2 + 4, fishY - OFFSET_Y * reach - size / 2);
      live.push({
        kind,
        x,
        y,
        born: time,
        size,
        tilt: (Math.random() * 2 - 1) * 0.19,
        rise: (12 + Math.random() * 10) * Math.min(1.6, size / 14),
        drift: (right ? 1 : -1) * (1 + Math.random() * 4),
        rock: (Math.random() < 0.5 ? -1 : 1) * (0.35 + Math.random() * 0.25),
      });
    }
  }
}
