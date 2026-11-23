// What is on the mobiles' glass. A source gives the screens' material and per-screen attributes (every screen is an
// instance of one mesh, mobile/mobile.ts), is advanced once a frame before the scene is drawn, and tells what the
// owner of each screen is doing, for the fish that holds it (fish/goldfish.ts).
// Sources: clips.ts (pc/3d-mobiles/1's feed of clips, in a shader) and interface/ (pc/2d-mobiles/2's working apps).
// Switching one for the other, or what feeds it, is a choice in settings.ts: nothing else knows which is on.

import type * as THREE from "three";

export type Hand = {
  /** The stroke under way on the glass, 0 … 1 (0 while it is only watched). */
  stroke: number;
  /** Where the glass is touched, 0 … 1 from its left and from its top. */
  x: number;
  y: number;
  /** Whether it is touched now. */
  on: boolean;
};

export const restingHand = (): Hand => ({ stroke: 0, x: 0.5, y: 0.5, on: false });

export type ScreenSource = {
  material: THREE.Material;
  /** Per-screen attributes, by the name the material's shader reads them under. */
  attributes: Record<string, THREE.InstancedBufferAttribute>;
  /** Once a frame, before the scene is drawn. `time`: the scene's feed clock, seconds. */
  update(time: number): void;
  /** What screen `index`'s owner is doing now, written into `out`. */
  hand(index: number, out: Hand): Hand;
  /** For measuring (window.__pc3dMobiles2.stats()). */
  stats?(): unknown;
  dispose(): void;
};
