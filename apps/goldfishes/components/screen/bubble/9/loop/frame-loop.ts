// The frame loop: pacing, the canvas's size, the mode, and the order things happen in — the model's step, the
// displayed distribution relaxed toward one beat of it, the raft laid out, rank sent round the links as travelling
// portions, the goldfish swimming and watching, the drawing. What each of them is lives in its own module
// (simulation/, the rest of loop/, raft/, render/, objects/, fish/); the model is reached only as a `World`
// (model/world.ts). The order is a contract: it decides every number. Settings are read from `settings.current`
// each frame; nothing here is React.

import type { FishPaletteId, FishParameters } from "../fish/goldfish";
import type { LifeParameters } from "../fish/lifecycle";
import type { BubbleFeed } from "../link/feed"; // 연결
import type { ModelParameters, World } from "../model";
import type { ObjectParameters } from "../objects/kinds/parameters"; // 오브제
import type { LabSettings } from "../objects/morph/lab"; // 랩
import { createObjectPass, type ObjectPass } from "../objects/object-pass"; // 오브제
import type { Raft } from "../raft/raft";
import { createFoamRenderer, MAX_BUBBLES, type FoamRenderer } from "../render/foam";
import type { Look } from "../render/shading";
import { Watching } from "../simulation/attention";
import { stepDisplay } from "../simulation/display";
import { Emitter } from "../simulation/emitter";
import type { TouchSound } from "../sound/sound";
import type { SpreadParameters } from "../spread/contagion"; // 전파
import { lookOf, type Feedback, type Mode, type Visual } from "../state/schema";
import { Drawing } from "./draw";
import { Lab } from "./lab";
import { Measure, MEASURE } from "./measure";
import { installReplay, REPLAY } from "./replay";
import { LoopSchool } from "./school";
import { Spread } from "./spread";
import { Summary } from "./summary";

/** Frames are paced to at most 60 Hz on whole vsyncs, so 120 Hz screens draw every other one. */
const FRAME_INTERVAL = 1_000 / 60 - 3;
const MAX_PIXEL_RATIO = 2;

/** What the panels set, as the loop reads it. */
export type LoopSettings = {
  parameters: ModelParameters;
  visual: Visual;
  /** The goldfish's lifecycle (생애주기 panel). */
  life: LifeParameters;
  fishCount: number;
  fish: FishParameters;
  fishPalette: FishPaletteId;
  /** How the school's watching feeds back into page quality. */
  feedback: Feedback;
  /** 오브제: pages shown as 3D objects in the bubbles' material. */
  objects: ObjectParameters;
  /** bubble/7: the raft (군집), the raft with 전파, or the 랩's one object. */
  mode: Mode;
  lab: LabSettings;
  spread: SpreadParameters;
};

export type LoopHooks = {
  /** The sound engine while 소리 is on, else null. */
  sound(): TouchSound | null;
  /** A sentence for screen readers, every two seconds. */
  summary(text: string): void;
  /** Median / 95th-percentile frame cost in ms (?measure only). */
  frameCost(text: string): void;
  /** 랩: the morph under way, from one kind to another (field kinds). */
  labMorph?(from: string, to: string): void;
  /** 연결: the feed/1 sender (link/feed.ts), null under `?feed=0`. */
  feed?(): BubbleFeed | null;
};

export type FrameLoop = {
  dispose(): void;
  /**
   * 전파: a new page at (x, y) (CSS px) carrying the chosen colour and object, linked from `from` (the stroke's
   * last newcomer) or the page under it. At the page cap the page under it takes them on instead. Its page, or null.
   */
  arrive(x: number, y: number, from?: number | null): number | null;
};

/** Starts drawing the raft on `canvas` (and the fish on `fishCanvas`); null without WebGL2 float targets. */
export function startFrameLoop(
  raft: Raft,
  canvas: HTMLCanvasElement,
  fishCanvas: HTMLCanvasElement | null,
  settings: { readonly current: LoopSettings },
  hooks: LoopHooks,
): FrameLoop | null {
  const renderer = createFoamRenderer(canvas);
  if (!renderer) {
    console.warn("bubble/9 needs WebGL2 with float render targets.");
    return null;
  }
  return new RaftLoop(raft, renderer, canvas, fishCanvas, settings, hooks);
}

class RaftLoop implements FrameLoop {
  private readonly reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private animationFrame = 0;
  private previous = performance.now();
  /** Time that stands still under reduced motion: the portions and the fish run on it. */
  private motionTime = 0;
  /** The frame's bubbles: the portions under way, then the pages (written into `renderer.bubbles`). */
  private readonly emitter = new Emitter();
  /** What the goldfish's watching does: quality, the pages' turns, touches. */
  private readonly watching = new Watching();
  /** 전파. */
  private readonly spread = new Spread();
  /** 랩. */
  private readonly lab = new Lab();
  private readonly measure = new Measure();
  private readonly summary = new Summary();
  private readonly school: LoopSchool;
  /** 오브제: drawn on the raft's canvas after the raft. */
  private readonly objectPass: ObjectPass;
  private readonly drawing: Drawing;
  /** The renderer's look, worked out again only when the visual panel's settings change (React replaces them). */
  private lookVisual: Visual | null = null;
  private look: Look | null = null;
  private readonly observer: ResizeObserver;

  constructor(
    private readonly raft: Raft,
    private readonly renderer: FoamRenderer,
    private readonly canvas: HTMLCanvasElement,
    fishCanvas: HTMLCanvasElement | null,
    private readonly settings: { readonly current: LoopSettings },
    private readonly hooks: LoopHooks,
  ) {
    this.objectPass = createObjectPass(renderer, MAX_BUBBLES); // 오브제
    this.drawing = new Drawing(renderer, this.objectPass, this.emitter, this.watching.turns);
    this.school = new LoopSchool(fishCanvas, settings, renderer.bubbles, raft);
    this.sizeCanvas();
    this.observer = new ResizeObserver(() => this.sizeCanvas());
    this.observer.observe(canvas);
    if (REPLAY) {
      this.previous = 0;
      installReplay(this.tick, () => raft.time, renderer, this.objectPass);
      return;
    }
    this.animationFrame = requestAnimationFrame(this.tick);
  }

  dispose() {
    this.observer.disconnect();
    cancelAnimationFrame(this.animationFrame);
    this.objectPass.dispose(); // 오브제
    this.renderer.dispose();
    this.school.dispose();
  }

  arrive(x: number, y: number, from: number | null = null) {
    return this.spread.arrive(this.raft, this.settings.current.spread, x, y, from);
  }

  private sizeCanvas() {
    const bounds = this.canvas.getBoundingClientRect();
    const next = { width: bounds.width, height: bounds.height };
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    this.renderer.resize(next.width, next.height, ratio);
    this.school.resize(next.width, next.height);
    this.raft.resize(next);
  }

  /** lookOf(visual), kept while `visual` is the same object. */
  private lookFor(visual: Visual) {
    if (this.lookVisual !== visual || !this.look) {
      this.lookVisual = visual;
      this.look = lookOf(visual);
    }
    return this.look;
  }

  private readonly tick = (now: number) => {
    if (!REPLAY) this.animationFrame = requestAnimationFrame(this.tick);
    if (now - this.previous < FRAME_INTERVAL) return;
    const delta = Math.min((now - this.previous) / 1_000, 1 / 15);
    this.previous = now;
    const { raft, renderer, emitter, watching, spread, school, measure } = this;
    const frameStart = measure.start();
    const settings = this.settings.current;
    raft.time += delta;
    // 랩: one object on its own, the raft and the school paused.
    if (settings.mode === "lab") {
      this.lab.draw(settings, raft.time, raft.size, renderer, this.objectPass, this.lookFor(settings.visual), this.hooks.labMorph);
      return;
    }
    const still = this.reduceMotion.matches;
    if (!still) this.motionTime += delta;
    if (raft.repopulate !== null) {
      // A new page count starts the web, and the display, over from uniform.
      raft.rebuild(raft.repopulate);
      emitter.restart();
    }
    const world: World<ModelParameters> = raft.world;
    // Under reduced motion the web and the school run slowly.
    const step = delta * (still ? 0.3 : 1);
    const spreading = settings.mode === "spread";

    const mark = measure.mark;
    mark(-1);
    // The model's step; a new page appears beside the first page it links to.
    raft.step(step, settings.parameters);
    mark(0);
    stepDisplay(world, step);
    mark(1);
    raft.arrange(world.shown, delta, step, still, settings.visual.area);
    mark(2);
    const pageStart = emitter.emit(world, raft, renderer.bubbles, settings.visual, this.motionTime, Math.max(delta, 1e-3));
    const pageCount = emitter.count - pageStart;
    // 전파: strains pass through the raft's contacts or the web's links.
    if (spreading) spread.step(step, raft, settings.spread);
    mark(3);

    // Goldfish swim around exactly this frame's discs, and their watching feeds back into quality.
    const fish = school.ready(world.state, settings);
    if (fish) {
      // The objects' reach is last frame's (the pass has not drawn this one yet).
      school.step(fish, step, world, emitter.count, pageStart, settings, REPLAY ? null : this.drawing.pageExtent);
      watching.drain(fish, pageCount);
      watching.turn(pageCount, raft.time, settings.objects, this.objectPass);
      // 연결: what each fish has just reached, for pc/mobiles (link/feed.ts).
      const feed = this.hooks.feed?.();
      if (feed) {
        feed.observe(fish.fish, {
          objects: spread.objectsFor(settings),
          caught: spreading ? spread.caught : null,
          turns: watching.turns,
          shown: world.shown,
          pageCount,
        });
      }
      // 소리: a page a fish has just begun to touch.
      watching.touches(pageCount, world.shown, raft.points, raft.size, this.hooks.sound());
      watching.feedBack(pageCount, world, settings.feedback, fish.fish.length);
      school.draw(fish, this.motionTime, step, settings);
    }
    if (MEASURE) {
      // The fish canvas's GPU work first, so it is not counted as the raft's.
      measure.lap(4);
      school.sync();
      measure.lap(7);
    }

    this.drawing.draw(spread.objectsFor(settings), settings.objects, spreading ? spread : null, this.lookFor(settings.visual), raft.time);
    mark(5);
    if (MEASURE) measure.finish(frameStart, renderer, pageStart, pageCount, school.counts(), this.hooks.frameCost);
    this.summary.step(delta, world, raft.time, this.hooks.summary);
  };
}
