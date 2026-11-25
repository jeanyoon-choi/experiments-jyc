// The frame loop: pacing, the canvas's size, the mode, and the order things happen in — the model's step, the
// displayed distribution relaxed toward one beat of it, the raft laid out, rank sent round the links as travelling
// portions, the goldfish swimming and watching, the drawing. What each of them is lives in its own module
// (simulation/, the rest of loop/, raft/, render/, objects/, fish/); the model is reached only as a `World`
// (model/world.ts). The order is a contract: it decides every number. Settings are read from `settings.current`
// each frame; nothing here is React.

import type { FishPaletteId, FishParameters } from "../fish/goldfish";
import type { LifeParameters } from "../fish/lifecycle";
import type { BubbleFeed } from "../link/feed"; // 연결
import type { AgentsInput } from "../fish/model";
import { layerOf } from "../objects/kinds/layers";
import { pageKind } from "../objects/kinds/parameters";
import type { ObjectParameters } from "../objects/kinds/parameters"; // 오브제
import type { LabSettings } from "../objects/morph/lab"; // 랩
import { createObjectPass, type ObjectPass } from "../objects/object-pass"; // 오브제
import type { BodyWorld, Raft, RaftParameters } from "../raft/raft";
import { SignKinds } from "../simulation/signs";
import { createFoamRenderer, MAX_BUBBLES, type FoamRenderer } from "../render/foam";
import type { Look } from "../render/shading";
import { Watching } from "../simulation/attention";
import { stepDisplay } from "../simulation/display";
import { Emitter } from "../simulation/emitter";
import type { TouchSound } from "../sound/sound";
import type { SpreadParameters } from "../spread/contagion"; // 전파
import { lookOf, type Feedback, type Mode, type Model, type Visual } from "../state/schema";
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
  /** Both models' parameters, and which is in use (true: the agents; false: bubble/9's PageRank). */
  parameters: RaftParameters;
  rules: boolean;
  /** Whose sizes: bubble/9's transport (true) or the agents' own heat. */
  transport: boolean;
  /** The agent model's options (시스템 panel). */
  system: Model;
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
   * The agents' stroke: a new bubble at (x, y) (CSS px) of `keyword`, or of a new keyword when it is null (the
   * stroke's first). The keyword, to go on with; null while PageRank is the model.
   */
  stroke(x: number, y: number, keyword: number | null): number | null;
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
    console.warn("simulation/1 needs WebGL2 with float render targets.");
    return null;
  }
  return new RaftLoop(raft, renderer, canvas, fishCanvas, settings, hooks);
}

type BodyCouriers = Raft["agents"]["couriers"];

class RaftLoop implements FrameLoop {
  /** What the school is asked for this frame (its size is the panel's, or the agents' open audience). */
  private readonly schoolSize = { fishCount: 0, life: null as unknown as LifeParameters };
  private readonly schoolSettings = { fish: null as unknown as FishParameters, life: null as unknown as LifeParameters };
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
  /** The agents' keywords as objects, the school's view of the bubbles, and each fish's last bubble (its moves). */
  private readonly signKinds = new SignKinds();
  private readonly agentsInput: AgentsInput = { data: new Int32Array(0), rules: null as unknown as AgentsInput["rules"], opening: 0, entry: -1 };
  private readonly signs = { seeds: new Float32Array(0), couriers: [] as BodyCouriers, time: 0 };
  private readonly lastBubble = new Map<number, number>();
  private leftSeen = 0;
  private burstsSeen = 0;
  private movesSeen = 0;
  private readonly track = new Track();
  /** The canvas's share of the display's pixel ratio, and what `pace` keeps to decide it. */
  private sharpness = 1;
  private frameTime = 1_000 / 60;
  private slowFor = 0;
  private paceWait = PACE_OPENING;
  private readonly trackKinds = new Int16Array(4096);
  /** The agent model: each bubble's turns as last seen (a turn is a change of object), and the fish's settings with its reach. */
  private readonly turnsSeen = new Uint32Array(4096);
  private nearFish: FishParameters | null = null;
  private nearFrom: FishParameters | null = null;
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
    if (this.raft.rules) return null;
    return this.spread.arrive(this.raft, this.settings.current.spread, x, y, from);
  }

  stroke(x: number, y: number, keyword: number | null) {
    const raft = this.raft;
    if (!raft.rules) return null;
    const settings = this.settings.current;
    const agents = raft.agents;
    let word = keyword;
    if (word === null) {
      // 군집: an object not on the screen now; 전파: the object chosen in its panel.
      const objects = this.spread.objectsFor(settings);
      const layer = settings.mode === "spread" ? layerOf(settings.spread.pick as Parameters<typeof layerOf>[0]) : -1;
      word = agents.beginStroke(this.signKinds.freshKey(agents, objects), layer);
    }
    raft.lay(x, y, word);
    return word;
  }

  /**
   * A machine that cannot keep up draws fewer pixels (simulation/docs/1.md, Performance): the frame's cost is the
   * renderer's, by the pixel. Frames slower than SLOW_FRAME for SLOW_SECONDS take the canvas down a step, never
   * below MIN_PIXEL_RATIO device pixels a CSS px; it does not come back up until the page is opened again (a display
   * at its refresh rate does not say how much is to spare, and each change of size is a hitch).
   */
  private pace(interval: number) {
    // A hidden tab, a hitch, the opening (the bake workers) and the seconds after a change say nothing.
    if (MEASURE || REPLAY || interval > 250 || document.hidden) return;
    this.paceWait -= interval;
    if (this.paceWait > 0) return;
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
    const delta = Math.min((now - this.previous) / 1_000, 1 / 15);
    this.pace(now - this.previous);
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
    raft.school = settings.fishCount;
    raft.setMode(settings.rules, settings.transport);
    const system = settings.system;
    const places = raft.local;
    places.contacts = system.contacts >= 0.5;
    places.visible = system.visible >= 0.5;
    places.noSpread = system.spread >= 0.5;
    places.nearSpread = system.spread >= 0.5 && system.spread < 1.5;
    places.noDrift = system.noDrift >= 0.5;
    places.noArrivals = system.noArrivals >= 0.5;
    raft.strokeSize = system.strokeSize;
    raft.strokeQuality = system.strokeQuality;
    if (raft.repopulate !== null) {
      // A new page count starts the web, and the display, over from uniform.
      raft.rebuild(raft.repopulate);
      emitter.restart();
      this.lastBubble.clear();
    }
    const world: BodyWorld = raft.world;
    const agents = raft.rules ? raft.agents : null;
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
    let signs: typeof this.signs | null = null;
    if (agents) {
      signs = this.signs;
      signs.seeds = agents.seeds;
      signs.couriers = agents.couriers;
      signs.time = agents.time;
    }
    const pageStart = emitter.emit(world, raft, renderer.bubbles, settings.visual, this.motionTime, Math.max(delta, 1e-3), signs);
    const pageCount = emitter.count - pageStart;
    const objects = spread.objectsFor(settings);
    // The agents: every bubble is its keyword's object.
    const kinds = agents ? this.signKinds.resolve(agents, objects) : null;
    // 전파 (PageRank's): strains pass through the raft's contacts or the web's links.
    if (spreading && !agents) spread.step(step, raft, settings.spread);
    mark(3);

    // Goldfish swim around exactly this frame's discs, and their watching feeds back into quality.
    // The agents' open audience: the school is as large as the strokes have made it and the bored have left it.
    const open = agents !== null && settings.parameters.rule.open >= 0.5;
    if (agents && !open) agents.population = settings.fishCount;
    this.schoolSize.fishCount = open ? agents.population : settings.fishCount;
    this.schoolSize.life = settings.life;
    const fish = school.ready(world.state, this.schoolSize);
    let alive = 0;
    // The agent model (bubble/9's transport made local): the goldfish are bubble/9's, looking only at what is near.
    const local = agents !== null && raft.transport;
    let schooling: { fish: FishParameters; life: LifeParameters } = settings;
    if (local) {
      if (this.nearFrom !== settings.fish || this.nearFish?.near !== system.near) {
        this.nearFrom = settings.fish;
        this.nearFish = { ...settings.fish, near: system.near };
      }
      this.schoolSettings.fish = this.nearFish!;
      this.schoolSettings.life = settings.life;
      schooling = this.schoolSettings;
    }
    if (fish) {
      let input: AgentsInput | null = null;
      if (agents && !local) {
        input = this.agentsInput;
        input.data = agents.pageData;
        input.rules = settings.parameters.rule;
        input.opening = agents.opening;
        input.entry = agents.time < agents.entryUntil ? agents.entry : -1;
      }
      // The objects' reach is last frame's (the pass has not drawn this one yet).
      school.step(fish, step, world, emitter.count, pageStart, schooling, REPLAY ? null : this.drawing.pageExtent, input);
      watching.drain(fish, pageCount);
      // A watched page moves on (bubble/9's rule, and the morph style's clock). Under the agent model what it moves
      // on to is the object of the bubble beside it that sends it the most; under M9's own sizes nothing turns.
      if (!agents || local) watching.turn(pageCount, raft.time, settings.objects, this.objectPass);
      if (local) {
        const { turns } = watching;
        const seen = this.turnsSeen;
        for (let page = 0; page < pageCount; page += 1) {
          if (turns[page] === seen[page]) continue;
          seen[page] = turns[page]!;
          if (system.adopt >= 0.5) agents.adopt(page, raft.sender(page));
          else agents.moveOn(page);
        }
      }
      // 연결: what each fish has just reached, for pc/mobiles (link/feed.ts).
      const feed = this.hooks.feed?.();
      if (feed) {
        feed.observe(fish.fish, {
          objects,
          caught: agents ? kinds : spreading ? spread.caught : null,
          turns: watching.turns,
          shown: world.shown,
          pageCount,
        });
      }
      // 소리: a page a fish has just begun to touch.
      watching.touches(pageCount, world.shown, raft.points, raft.size, this.hooks.sound());
      if (agents && !local) {
        // The school's contact is each bubble's audience; a fish that changed bubble is a crossing; the bored have left.
        const attention = watching.attention;
        for (let page = 0; page < pageCount; page += 1) if (attention[page]! > 0) agents.attend(page, attention[page]!);
        const last = this.lastBubble;
        for (const one of fish.fish) {
          if (one.life.dying || one.leaving) continue;
          alive += 1;
          const id = Math.floor(one.seed);
          const before = last.get(id);
          if (before !== undefined && before >= 0 && one.target >= 0 && one.target !== before) agents.moved(before, one.target);
          last.set(id, one.target);
        }
        if (last.size > 4_000) last.clear();
        if (fish.left > this.leftSeen) agents.left(fish.left - this.leftSeen);
        this.leftSeen = fish.left;
      } else for (const one of fish.fish) if (!one.life.dying) alive += 1;
      // bubble/9's transport: the school's watching raises a page's appeal.
      if (raft.transport) watching.feedBack(pageCount, raft.pagerank, settings.feedback, fish.fish.length);
      school.draw(fish, this.motionTime, step, settings);
    }
    if (MEASURE) {
      // The fish canvas's GPU work first, so it is not counted as the raft's.
      measure.lap(4);
      school.sync();
      measure.lap(7);
    }

    this.drawing.draw(objects, settings.objects, spreading && !agents ? spread : null, this.lookFor(settings.visual), raft.time, kinds);
    mark(5);
    // The screen by numbers, once a second (loop/track.ts).
    let tracked: ArrayLike<number> = this.trackKinds;
    if (kinds) tracked = kinds;
    else for (let page = 0; page < pageCount; page += 1) this.trackKinds[page] = Math.max(0, layerOf(pageKind(page, objects, watching.turns[page])));
    if (agents) {
      this.track.bursts += agents.counts.bursts - this.burstsSeen;
      this.track.moves += agents.counts.moves - this.movesSeen;
      this.burstsSeen = agents.counts.bursts;
      this.movesSeen = agents.counts.moves;
    }
    this.track.step(delta, raft.time, raft, world, tracked, pageStart, alive);
    if (MEASURE) measure.finish(frameStart, renderer, pageStart, pageCount, school.counts(), this.hooks.frameCost);
    this.summary.step(delta, world, raft.time, this.hooks.summary);
  };
}
