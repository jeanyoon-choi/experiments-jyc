// The goldfish in the loop: the school (stepped in its own worker, fish/school-thread.ts) and its renderer, both
// made only once fish are asked for, kept told of the world's pages, the panel's count and the lifecycle.

import type { GoldfishScene } from "../fish/goldfish-scene";
import type { FishPaletteId, FishParameters, LifeContext } from "../fish/goldfish";
import { LIFE_DEFAULTS, type LifeParameters, type Rgb } from "../fish/lifecycle";
import { SchoolThread } from "../fish/school-thread";
import type { World, WorldState } from "../model";
import { BUBBLE_FLOATS } from "../render/foam";
import { mixedCoatOf } from "../render/materials/coats";
import type { Visual } from "../state/schema";
import { MEASURE } from "./measure";
import { REPLAY } from "./replay";

type Field = { readonly width: number; readonly height: number };

export class LoopSchool {
  // Goldfish: the school and its renderer exist only once fish are asked for.
  /** Stepped in its own worker (fish/school-thread.ts), one frame behind. */
  private school: SchoolThread | null = null;
  /** The world the school knows the pages of: a new one makes it forget them. */
  private schoolState: WorldState | null = null;
  private knownPages = 0;
  private scene: GoldfishScene | null = null;
  private sceneLoading = false;
  private disposed = false;
  /** Smoothed ms of the school's step and the fish scene's draw (?measure only). */
  private schoolCost = 0;
  private sceneCost = 0;
  /** What the school reads to live: the lifecycle settings, and a drawn bubble's coat (as the shader picks it). */
  private readonly lifeContext: LifeContext = {
    parameters: { ...LIFE_DEFAULTS, enabled: 0 },
    colourOf: (bubble: number, out: Rgb) => {
      const visual = this.settings.current.visual;
      const seed = this.bubbles[bubble * BUBBLE_FLOATS + 3]!;
      const coat = visual.coatingMix > 0.5 ? mixedCoatOf(seed, visual.mixSaturation, visual.mixLightness, visual.mixHue, visual.mixDepth) : visual.coating;
      out[0] = coat[0];
      out[1] = coat[1];
      out[2] = coat[2];
    },
  };
  private readonly fishCanvas: HTMLCanvasElement | null;
  private readonly settings: { readonly current: { visual: Visual } };
  private readonly bubbles: Float32Array;
  private readonly raft: { readonly size: Field };

  /** `bubbles`: the frame's bubbles (x y radius seed), as the emitter wrote them; `raft`: for the field's size. */
  constructor(fishCanvas: HTMLCanvasElement | null, settings: { readonly current: { visual: Visual } }, bubbles: Float32Array, raft: { readonly size: Field }) {
    this.fishCanvas = fishCanvas;
    this.settings = settings;
    this.bubbles = bubbles;
    this.raft = raft;
  }

  resize(width: number, height: number) {
    this.school?.resize(width, height);
    this.scene?.setSize(width, height);
  }

  /**
   * The school, or null while no fish have been asked for: it forgets its pages when the world starts over (a new
   * `state`), hears of the pages come in since, and takes the panel's count and lifecycle.
   */
  ready(state: WorldState, settings: { fishCount: number; life: LifeParameters }) {
    const field = this.raft.size;
    if (settings.fishCount > 0 && !this.school) {
      this.school = REPLAY ? new SchoolThread(field.width, field.height, false) : new SchoolThread(field.width, field.height);
      this.schoolState = state;
      this.knownPages = state.size;
    }
    const school = this.school;
    if (!school) return null;
    if (this.schoolState !== state) {
      school.forgetPages();
      this.schoolState = state;
      this.knownPages = state.size;
    }
    if (state.size > this.knownPages) school.notePages(this.knownPages, state.size);
    this.knownPages = state.size;
    school.setLife(settings.life);
    school.setCount(settings.fishCount);
    return school;
  }

  /** Goldfish swim around exactly this frame's discs (`pageExtent`: how far each page's object reaches past its own). */
  step(
    school: SchoolThread,
    seconds: number,
    world: Pick<World<never>, "state" | "shown">,
    bubbleCount: number,
    pageStart: number,
    settings: { fish: FishParameters; life: LifeParameters },
    pageExtent: Float32Array | null,
    dispositions: Float32Array | null = null,
  ) {
    this.lifeContext.parameters = settings.life;
    const schoolStart = MEASURE ? performance.now() : 0;
    school.step(seconds, world.state, world.shown, this.bubbles, bubbleCount, pageStart, bubbleCount - pageStart, settings.fish, this.lifeContext, pageExtent, dispositions);
    if (MEASURE) this.schoolCost = this.schoolCost * 0.95 + (performance.now() - schoolStart) * 0.05;
  }

  /** Draws the school on its canvas; `motionTime` stands still under reduced motion. */
  draw(school: SchoolThread, motionTime: number, seconds: number, settings: { fish: FishParameters; fishPalette: FishPaletteId; life: LifeParameters }) {
    this.loadScene(school);
    const sceneStart = MEASURE ? performance.now() : 0;
    this.scene?.render(school.fish, motionTime, seconds, settings.fish.scale, settings.fishPalette, settings.life);
    if (MEASURE) this.sceneCost = this.sceneCost * 0.95 + (performance.now() - sceneStart) * 0.05;
  }

  /** The fish renderer (three.js) loads only once there are fish to draw. */
  private loadScene(school: SchoolThread) {
    const fishCanvas = this.fishCanvas;
    if (this.scene || this.sceneLoading || school.fish.length === 0 || !fishCanvas) return;
    this.sceneLoading = true;
    void import("../fish/goldfish-scene").then(({ GoldfishScene: Scene }) => {
      if (this.disposed) return;
      const scene = new Scene(fishCanvas);
      const size = this.raft.size;
      scene.setSize(size.width, size.height);
      this.scene = scene;
    }, (error: unknown) => {
      console.warn("simulation/2 goldfish renderer failed to load.", error);
    });
  }

  /** Waits for the fish canvas's GPU work (measurement only). */
  sync() {
    this.scene?.sync();
  }

  /** The lifecycle's counts and the school's costs, for measurement only; null without a school. */
  counts() {
    const school = this.school;
    if (!school) return null;
    return { school: this.schoolCost.toFixed(2), worker: school.stepMs.toFixed(2), scene: this.sceneCost.toFixed(2), ...school.deaths, departed: school.departed, alive: school.fish.filter((fish) => !fish.life.dying).length, falling: school.fish.filter((fish) => fish.life.dying).length };
  }

  dispose() {
    this.disposed = true;
    this.scene?.dispose();
    this.school?.dispose();
  }
}
