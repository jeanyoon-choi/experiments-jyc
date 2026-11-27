// The frame loop: pacing, the canvas's size, the mode, and the order things happen in — the model's step, the
// displayed distribution relaxed toward one beat of it, the raft laid out, rank sent round the links as travelling
// portions, the goldfish swimming and watching, the drawing. What each of them is lives in its own module
// (simulation/, the rest of loop/, raft/, render/, objects/, fish/); the model is reached only as a `World`
// (model/world.ts). The order is a contract: it decides every number. Settings are read from `settings.current`
// each frame; nothing here is React.

import type { FishPaletteId, FishParameters } from "../fish/goldfish";
import { layerOf } from "../objects/kinds/layers";
import { pageKind } from "../objects/kinds/parameters";
import { Bubbles } from "../rules/bubbles";
import type { System } from "../rules/versions";
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
import { Track } from "./track";

/** Frames are paced to at most 60 Hz on whole vsyncs, so 120 Hz screens draw every other one. */
const FRAME_INTERVAL = 1_000 / 60 - 3;
/** Device pixels a CSS px at most; `?ratio=1` in the address sets it for a look at what a coarser canvas costs. */
const ASKED_RATIO = typeof window === "undefined" ? NaN : Number(new URLSearchParams(window.location.search).get("ratio") ?? NaN);
const MAX_PIXEL_RATIO = ASKED_RATIO > 0 ? Math.min(2, ASKED_RATIO) : 2;
/** The canvas is never coarser than this many device pixels a CSS px (or the display's own, if that is less). */
const MIN_PIXEL_RATIO = 0.6;
/** A frame slower than this (ms, smoothed) for this long (s) is a machine that cannot keep up. */
const SLOW_FRAME = 28;
const SLOW_SECONDS = 4;
/** Nothing is judged for this long (ms) after the page opens, or after a step down: the objects are being baked then, and that is slow on any machine. */
const PACE_OPENING = 30_000;
const PACE_AFTER_STEP = 12_000;

/** What the panels set, as the loop reads it. */
export type LoopSettings = {
  parameters: ModelParameters;
  /** simulation/2's answers (rules/versions.ts; the 시스템 panel). */
  system: System;
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
  /**
   * simulation/2: a stroke's bubble at (x, y) (CSS px). `stroke` null begins a stroke (one new disposition and object
   * for all it lays); its number, to go on with.
   */
  stroke(x: number, y: number, stroke: number | null): number;
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
    console.warn("simulation/2 needs WebGL2 with float render targets.");
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
  /** simulation/2: each bubble's disposition and face (rules/bubbles.ts); the last bubble each stroke laid. */
  private readonly bubbles = new Bubbles();
  private readonly strokeLast: (number | null)[] = [];
  /** Each bubble's turns as last seen: a turn is the moment it changes. */
  private readonly turnsSeen = new Uint32Array(4096);
  /** The fish's settings with the system's two (taste, what it tires of), made again only when either changes. */
  private disposedFish: FishParameters | null = null;
  private disposedFrom: FishParameters | null = null;
  private readonly schooling = { fish: null as unknown as FishParameters, life: null as unknown as LifeParameters };
  private readonly track = new Track();
  private readonly feedback: Feedback = { influence: 0, ceiling: 0, perFish: 0 };
  /** The canvas's share of the display's pixel ratio, and what `pace` keeps to decide it. */
  private sharpness = 1;
  private frameTime = 1_000 / 60;
  private slowFor = 0;
  private paceWait = PACE_OPENING;
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

  stroke(x: number, y: number, stroke: number | null) {
    const { raft, bubbles } = this;
    const settings = this.settings.current;
    bubbles.keep(raft.world.state, raft.world.state.size, this.watching.turns);
    let number = stroke;
    if (number === null) {
      const objects = this.spread.objectsFor(settings);
      bubbles.resolve(objects);
      number = bubbles.begin(objects);
      this.strokeLast[number] = null;
    }
    const sizeBefore = raft.world.state.size;
    const page = raft.lay(x, y, this.strokeLast[number] ?? null, settings.system.strokeSize, settings.system.strokeQuality);
    if (page !== null) {
      // At the cap the bubble took a let-go bubble's place (raft.ts takeOver). It is the stroke's object at once, as
      // a new bubble is: left tracked, it flowed out of whatever stood there, so a stroke read as many objects
      // (artist, 2026-11-26).
      if (page < sizeBefore) {
        this.objectPass.forget(page);
        this.watching.renew(page);
      }
      bubbles.lay(page, number);
      this.strokeLast[number] = page;
    }
    return number;
  }

  /** The layer a stroke's face is shown as under `objects`, kept while both are the same. */
  private strokeKindFace = -1;
  private strokeKindObjects: unknown = null;
  private strokeKindLayer = -3;
  private strokeKind(face: number, objects: Parameters<typeof pageKind>[1]) {
    if (face !== this.strokeKindFace || objects !== this.strokeKindObjects) {
      this.strokeKindFace = face;
      this.strokeKindObjects = objects;
      const layer = layerOf(pageKind(face, objects));
      this.strokeKindLayer = layer > 0 ? layer : -1;
    }
    return this.strokeKindLayer;
  }

  /**
   * A machine that cannot keep up draws fewer pixels (simulation/docs/1.md, Performance): the frame's cost is the
   * renderer's, by the pixel. Frames slower than SLOW_FRAME for SLOW_SECONDS take the canvas down a step, never
   * below MIN_PIXEL_RATIO device pixels a CSS px; it does not come back up until the page is opened again.
   */
  private pace(interval: number) {
    // A hidden tab, a hitch, the opening (the bake workers) and the seconds after a change say nothing.
    if (MEASURE || REPLAY || interval > 250 || document.hidden) return;
    this.paceWait -= interval;
    if (this.paceWait > 0) return;
    // Nor does a frame drawn while objects are being baked: the bake workers take the frame's cores (measured: its
    // own work 1.6–2.4 times as long), and a step down then bakes them all again, which is slow again.
    if (!this.objectPass.idle()) return;
    this.frameTime += (interval - this.frameTime) * 0.05;
    this.slowFor = this.frameTime > SLOW_FRAME ? this.slowFor + interval : 0;
    if (this.slowFor < SLOW_SECONDS * 1_000 || this.sharpness <= 0.3) return;
    this.sharpness *= 0.7;
    this.slowFor = 0;
    this.frameTime = 1_000 / 60;
    this.paceWait = PACE_AFTER_STEP;
    this.sizeCanvas();
  }

  private sizeCanvas() {
    const bounds = this.canvas.getBoundingClientRect();
    const next = { width: bounds.width, height: bounds.height };
    const ratio = Math.max(Math.min(MIN_PIXEL_RATIO, window.devicePixelRatio || 1), Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO) * this.sharpness);
    (window as unknown as { goldfishRenderRatio?: number }).goldfishRenderRatio = ratio;
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
    this.pace(now - this.previous);
    const delta = Math.min((now - this.previous) / 1_000, 1 / 15);
    this.previous = now;
    const { raft, renderer, emitter, watching, spread, school, measure, bubbles } = this;
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
    const system = settings.system;
    // What of bubble/9's web is nobody's act is left out (rules/versions.ts).
    raft.own.drift = system.drift < 0.5;
    raft.own.arrivals = system.arrivals < 0.5;
    raft.own.burstAt = system.burstAt;
    raft.own.recovery = system.recovery;
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
    bubbles.keep(world.state, world.state.size, watching.turns);
    mark(0);
    stepDisplay(world, step);
    mark(1);
    raft.arrange(world.shown, delta, step, still, settings.visual.area);
    mark(2);
    const pageStart = emitter.emit(world, raft, renderer.bubbles, settings.visual, this.motionTime, Math.max(delta, 1e-3));
    const pageCount = emitter.count - pageStart;
    // 전파: strains pass through the raft's contacts or the web's links.
    if (spreading) spread.step(step, raft, settings.spread);
    const objects = spread.objectsFor(settings);
    // Every bubble is shown as its face; under 전파 the strains' kinds are shown instead.
    const kinds = spreading ? null : bubbles.resolve(objects);
    mark(3);

    // Goldfish swim around exactly this frame's discs, and their watching feeds back into quality.
    const fish = school.ready(world.state, settings);
    if (fish) {
      // The goldfish's own dispositions count only while the system says so.
      const disposed = system.taste > 0 || system.tire >= 0.5;
      let schooling: { fish: FishParameters; life: LifeParameters } = settings;
      if (disposed) {
        if (this.disposedFrom !== settings.fish || !this.disposedFish) {
          this.disposedFrom = settings.fish;
          this.disposedFish = { ...settings.fish };
        }
        this.disposedFish.taste = system.taste;
        this.disposedFish.tireByDisposition = system.tire >= 0.5 ? 1 : 0;
        this.schooling.fish = this.disposedFish;
        this.schooling.life = settings.life;
        schooling = this.schooling;
      }
      // The objects' reach is last frame's (the pass has not drawn this one yet).
      school.step(fish, step, world, emitter.count, pageStart, schooling, REPLAY ? null : this.drawing.pageExtent, disposed ? bubbles.dispositions : null);
      watching.drain(fish, pageCount);
      watching.turn(pageCount, raft.time, settings.objects, this.objectPass);
      // A bubble that has just turned changes: to its own next object (bubble/9), or to the disposition and object
      // of the bubble that sends it the most.
      const turns = watching.turns;
      const seen = this.turnsSeen;
      for (let page = 0; page < pageCount; page += 1) {
        if (turns[page] === seen[page]) continue;
        seen[page] = turns[page]!;
        if (system.adopt >= 0.5) bubbles.adopt(page, raft.sender(page));
        else bubbles.moveOn(page, turns[page]!);
      }
      // 연결: what each fish has just reached, for pc/mobiles (link/feed.ts).
      const feed = this.hooks.feed?.();
      if (feed) {
        feed.observe(fish.fish, {
          objects,
          caught: spreading ? spread.caught : kinds,
          turns: watching.turns,
          shown: world.shown,
          pageCount,
        });
      }
      // 소리: a page a fish has just begun to touch.
      watching.touches(pageCount, world.shown, raft.points, raft.size, this.hooks.sound());
      // Without the dice each goldfish's watching counts as the system says (rules/versions.ts `perFish`).
      let feedback = settings.feedback;
      if (system.drift >= 0.5) {
        feedback = this.feedback;
        feedback.influence = settings.feedback.influence;
        feedback.ceiling = settings.feedback.ceiling;
        feedback.perFish = system.perFish;
      }
      watching.feedBack(pageCount, world, feedback, fish.fish.length);
      school.draw(fish, this.motionTime, step, settings);
    }
    if (MEASURE) {
      // The fish canvas's GPU work first, so it is not counted as the raft's.
      measure.lap(4);
      school.sync();
      measure.lap(7);
    }

    this.drawing.draw(objects, settings.objects, spreading ? spread : null, this.lookFor(settings.visual), raft.time, kinds);
    mark(5);
    if (MEASURE) measure.finish(frameStart, renderer, pageStart, pageCount, school.counts(), this.hooks.frameCost);
    this.summary.step(delta, world, raft.time, this.hooks.summary);
    // The screen by numbers, once a second (loop/track.ts).
    let alive = 0;
    let held = 0;
    if (fish) {
      for (const one of fish.fish) {
        if (one.life.dying) continue;
        alive += 1;
        if (one.target >= 0) held += 1;
      }
    }
    // The last stroke's object, by the layer it is shown as (−3: no stroke yet).
    const strokes = bubbles.strokeCount;
    const strokeKind = strokes > 0 ? this.strokeKind(bubbles.strokeFace(strokes - 1), objects) : -3;
    this.track.step(delta, raft.time, raft, world, kinds, pageStart, alive, held, fish ? fish.deaths : null, strokeKind);
  };
}
