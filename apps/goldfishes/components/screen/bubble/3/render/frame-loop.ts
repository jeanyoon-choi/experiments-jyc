// The frame loop: steps the web, relaxes the displayed distribution toward
// one power-iteration step of itself, lays the raft out, sends rank round the
// links as travelling portions, lets the goldfish swim and watch, and draws.
// Settings are read from `settings.current` each frame; nothing here is React.

import { BUBBLE_FLOATS, createFoamRenderer, MAX_BUBBLES, type FoamRenderer } from "./foam";
import { GoldfishSchool, type FishPaletteId, type FishParameters } from "../fish/goldfish";
import type { GoldfishScene } from "../fish/goldfish-scene";
import { iterate, outWeights, transit } from "../web/iteration";
import { attend, concentration, leader, MAX_PAGES, stepRankedWeb, type RankedWeb, type WebParameters } from "../web/model";
import { radiusFor, type Raft } from "../raft/raft";
import { lookOf, type Feedback, type Visual } from "../settings";
import type { TouchSound } from "../sound/sound";

/** The display relaxes toward one power-iteration step with this time constant, seconds. */
const STEP_SECONDS = 1.1;
/** Each link sends its portion round on its own period (seconds), from quickest to slowest. */
const PERIOD = [1.3, 3.2] as const;
/** Within its own cycle a portion necks off until this phase and is taken in from that one. */
const DETACHED = 0.35;
const TAKEN_IN = 0.62;
/** A portion's path bows aside by this share of its length (at most BOW_LIMIT px), so crossing flows part. */
const BOW = 0.08;
const BOW_LIMIT = 36;
const MIN_PORTION_RADIUS = 1.5;
/** Frames are paced to at most 60 Hz on whole vsyncs, so 120 Hz screens draw every other one. */
const FRAME_INTERVAL = 1_000 / 60 - 3;
const MAX_PIXEL_RATIO = 2;
/**
 * Log quality one fish-second of watching gives a page, divided by the school
 * (at least FISH_AUDIENCE fish; 무리 크기 반영 changes this), so all fish on one
 * page for a second give it ATTENTION_GAIN × influence; quality reverts at 0.08 per second.
 */
const ATTENTION_GAIN = 0.25;
const FISH_AUDIENCE = 30;
const SUMMARY_SECONDS = 2;

/** Frame cost is measured only when the URL asks for it (?measure). */
const MEASURE = typeof window !== "undefined" && window.location.search.includes("measure");

/** What the panels set, as the loop reads it. */
export type LoopSettings = {
  parameters: WebParameters;
  visual: Visual;
  fishCount: number;
  fish: FishParameters;
  fishPalette: FishPaletteId;
  /** How the school's watching feeds back into page quality. */
  feedback: Feedback;
};

export type LoopHooks = {
  /** The sound engine while 소리 is on, else null. */
  sound(): TouchSound | null;
  /** A sentence for screen readers, every two seconds. */
  summary(text: string): void;
  /** Median / 95th-percentile frame cost in ms (?measure only). */
  frameCost(text: string): void;
};

export type FrameLoop = {
  dispose(): void;
};

function smooth(from: number, to: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)));
  return t * t * (3 - 2 * t);
}

/** A stable value in [0, 1) per pair. */
function hashOf(a: number, b: number) {
  const value = Math.sin(a * 12.9898 + b * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

function percent(rank: number) {
  return `${(rank * 100).toFixed(rank >= 0.1 ? 0 : 1)}%`;
}

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
    console.warn("bubble/3 needs WebGL2 with float render targets.");
    return null;
  }
  return new RaftLoop(raft, renderer, canvas, fishCanvas, settings, hooks);
}

class RaftLoop implements FrameLoop {
  private readonly reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  private animationFrame = 0;
  private previous = performance.now();
  private sinceSummary = SUMMARY_SECONDS;
  // The displayed distribution: it starts uniform and relaxes, without
  // beats, toward one power-iteration step of itself, so it converges to
  // PageRank continuously and again whenever the web changes.
  private readonly shown = new Float64Array(MAX_PAGES);
  private readonly stepped = new Float64Array(MAX_PAGES);
  /** Each page's total outgoing weight this frame. */
  private readonly weights = new Float64Array(MAX_PAGES);
  /** Each page's pool: its displayed rank less what is under way along its links. */
  private readonly pools = new Float64Array(MAX_PAGES);
  /** Time that stands still under reduced motion: the portions and the fish run on it. */
  private motionTime = 0;
  private bubbleCount = 0;
  // Goldfish: the school and its renderer exist only once fish are asked for.
  private school: GoldfishSchool | null = null;
  private schoolWeb: RankedWeb | null = null;
  private knownPages = 0;
  private scene: GoldfishScene | null = null;
  private sceneLoading = false;
  private disposed = false;
  private readonly attention = new Float64Array(MAX_PAGES);
  /** Which pages a fish touched last frame: a page newly touched is a note (소리). */
  private readonly touchedBefore = new Uint8Array(MAX_PAGES);
  // Frame cost, when asked for: CPU work plus the GPU, synchronised by a 1-pixel read.
  private readonly costs = new Float64Array(120);
  private costCount = 0;
  private readonly observer: ResizeObserver;

  constructor(
    private readonly raft: Raft,
    private readonly renderer: FoamRenderer,
    private readonly canvas: HTMLCanvasElement,
    private readonly fishCanvas: HTMLCanvasElement | null,
    private readonly settings: { readonly current: LoopSettings },
    private readonly hooks: LoopHooks,
  ) {
    this.restart();
    this.sizeCanvas();
    this.observer = new ResizeObserver(() => this.sizeCanvas());
    this.observer.observe(canvas);
    this.animationFrame = requestAnimationFrame(this.tick);
  }

  dispose() {
    this.disposed = true;
    this.observer.disconnect();
    cancelAnimationFrame(this.animationFrame);
    this.renderer.dispose();
    this.scene?.dispose();
  }

  /** The display starts over from uniform. */
  private restart() {
    const web = this.raft.web;
    this.shown.fill(0);
    this.shown.fill(1 / Math.max(1, web.size), 0, web.size);
  }

  private sizeCanvas() {
    const bounds = this.canvas.getBoundingClientRect();
    const next = { width: bounds.width, height: bounds.height };
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    this.renderer.resize(next.width, next.height, ratio);
    this.school?.resize(next.width, next.height);
    this.scene?.setSize(next.width, next.height);
    this.raft.resize(next);
  }

  private readonly tick = (now: number) => {
    this.animationFrame = requestAnimationFrame(this.tick);
    if (now - this.previous < FRAME_INTERVAL) return;
    const delta = Math.min((now - this.previous) / 1_000, 1 / 15);
    this.previous = now;
    const frameStart = MEASURE ? performance.now() : 0;
    const still = this.reduceMotion.matches;
    const raft = this.raft;
    const settings = this.settings.current;
    raft.time += delta;
    if (!still) this.motionTime += delta;
    if (raft.repopulate !== null) {
      // A new page count starts the web, and the display, over from uniform.
      raft.rebuild(raft.repopulate);
      this.restart();
    }
    // Under reduced motion the web and the school run slowly.
    const step = delta * (still ? 0.3 : 1);

    this.stepWeb(step, settings);
    this.stepDisplay(step);
    raft.arrange(this.shown, delta, step, still, settings.visual.area);
    const pageStart = this.emitBubbles(settings);
    this.stepFish(step, pageStart, settings);
    this.renderer.render(this.bubbleCount, lookOf(settings.visual));
    if (MEASURE) this.measure(frameStart);
    this.summarise(delta);
  };

  /** The model's step; a new page appears beside the first page it links to. */
  private stepWeb(step: number, settings: LoopSettings) {
    const raft = this.raft;
    const web = raft.web;
    const field = raft.size;
    const random = raft.random;
    const events = stepRankedWeb(web, step, settings.parameters, raft.pendingPages);
    for (const event of events) {
      const anchor = raft.bodies[event.targets[0] ?? 0];
      const angle = random() * Math.PI * 2;
      raft.placePage(
        event.page,
        (anchor?.x ?? field.width / 2) + Math.cos(angle) * 24,
        (anchor?.y ?? field.height / 2) + Math.sin(angle) * 24,
      );
    }
  }

  /** Continuous power iteration on the web as it is now. */
  private stepDisplay(step: number) {
    const web = this.raft.web;
    const { shown, stepped } = this;
    outWeights(web, this.weights);
    iterate(web, shown, stepped, this.weights);
    const relax = Math.min(1, step / STEP_SECONDS);
    for (let page = 0; page < web.size; page += 1) shown[page] = shown[page]! + (stepped[page]! - shown[page]!) * relax;
  }

  /** Adds a bubble for the renderer. */
  private put(x: number, y: number, radius: number, seed: number) {
    const index = this.bubbleCount;
    if (index >= MAX_BUBBLES) return;
    const bubbles = this.renderer.bubbles;
    const at = index * BUBBLE_FLOATS;
    bubbles[at] = x;
    bubbles[at + 1] = y;
    bubbles[at + 2] = radius;
    bubbles[at + 3] = seed;
    this.bubbleCount = index + 1;
  }

  /**
   * Nothing but rank's mass. Each page is a pool of its displayed rank.
   * Every link keeps sending its share, d · x(from) · w / W, round on its
   * own period and phase: a portion necks off the source pool, travels
   * and merges into the target pool, then the next begins. Links never
   * beat together and are seen only in where the mass goes. Mass is
   * conserved at every moment: a portion is taken from its source as it
   * necks off and given to its target as it merges, against the steady
   * flow that both pools carry on average.
   *
   * Writes the portions, then one bubble per page; returns where the pages start.
   */
  private emitBubbles(settings: LoopSettings) {
    const raft = this.raft;
    const web = raft.web;
    const field = raft.size;
    const points = raft.points;
    const { shown, pools, weights } = this;
    const focus = raft.focus;
    const pageCount = Math.min(web.size, MAX_PAGES);
    const flowing = raft.linkVisibility >= 0.5;
    for (let page = 0; page < pageCount; page += 1) pools[page] = shown[page]!;
    this.bubbleCount = 0;
    const motionTime = this.motionTime;
    const { area, portions } = settings.visual;

    if (flowing) {
      let linkCount = 0;
      for (let from = 0; from < pageCount; from += 1) linkCount += web.out[from]!.length;
      const leastFlow = portions * (linkCount > 0 ? web.damping / linkCount : 1);
      for (let from = 0; from < pageCount; from += 1) {
        for (const entry of web.out[from]!) {
          const to = entry.target;
          if (to >= pageCount) continue;
          const offset = hashOf(to, from);
          const period = PERIOD[0] + (PERIOD[1] - PERIOD[0]) * hashOf(from, to);
          const cycle = (motionTime / period + offset) % 1;
          const flow = transit(web, shown, from, entry.weight, weights[from]!);
          const detach = smooth(0, DETACHED, cycle);
          const takeIn = smooth(TAKEN_IN, 1, cycle);
          pools[from] = pools[from]! - flow * (detach - cycle);
          pools[to] = pools[to]! + flow * (takeIn - cycle);
          const involved = focus !== null && (from === focus || to === focus);
          if (flow < leastFlow && !involved) continue;
          const portion = flow * (detach - takeIn);
          const radius = Math.sqrt((Math.max(portion, 0) * area * field.width * field.height) / Math.PI);
          if (radius < MIN_PORTION_RADIUS) continue;
          const travel = smooth(0.04, 0.96, cycle);
          const ax = points[from * 2]!;
          const ay = points[from * 2 + 1]!;
          const dx = points[to * 2]! - ax;
          const dy = points[to * 2 + 1]! - ay;
          const length = Math.hypot(dx, dy) || 1;
          const bow = Math.sin(Math.PI * travel) * Math.min(BOW_LIMIT, BOW * length) * (hashOf(from + 7, to) < 0.5 ? -1 : 1);
          this.put(ax + dx * travel - (dy / length) * bow, ay + dy * travel + (dx / length) * bow, radius, hashOf(from, to + 5));
        }
      }
    }

    // Pages: one bubble each, as large as its rank, pressed into its neighbours.
    const pageStart = this.bubbleCount;
    for (let page = 0; page < pageCount; page += 1) {
      const r = radiusFor(Math.max(pools[page]!, 0), field, area);
      this.put(points[page * 2]!, points[page * 2 + 1]!, r, hashOf(page, 3));
    }
    return pageStart;
  }

  /** Goldfish swim around exactly this frame's discs, and their watching feeds back into quality. */
  private stepFish(step: number, pageStart: number, settings: LoopSettings) {
    const raft = this.raft;
    const web = raft.web;
    const field = raft.size;
    if (settings.fishCount > 0 && !this.school) {
      this.school = new GoldfishSchool(field.width, field.height);
      this.schoolWeb = web;
      this.knownPages = web.size;
    }
    const school = this.school;
    if (!school) return;
    if (this.schoolWeb !== web) {
      school.forgetPages();
      this.schoolWeb = web;
      this.knownPages = web.size;
    }
    if (web.size > this.knownPages) school.notePages(this.knownPages, web.size);
    this.knownPages = web.size;
    school.setCount(settings.fishCount);
    const { attention, touchedBefore, shown } = this;
    const bubbles = this.renderer.bubbles;
    const drawnPages = this.bubbleCount - pageStart;
    school.step(step, web, shown, bubbles, this.bubbleCount, pageStart, drawnPages, settings.fish);
    school.drainContact(drawnPages, attention);
    // 소리: a page a fish has just begun to touch.
    const player = this.hooks.sound();
    let largest = 0;
    if (player) for (let page = 0; page < drawnPages; page += 1) largest = Math.max(largest, shown[page]!);
    const points = raft.points;
    for (let page = 0; page < drawnPages; page += 1) {
      const touched = attention[page]! > 0 ? 1 : 0;
      if (player && touched && !touchedBefore[page]) {
        player.touch({
          page,
          rank: largest > 0 ? shown[page]! / largest : 0,
          x: points[page * 2]! / field.width,
          y: points[page * 2 + 1]! / field.height,
        });
      }
      touchedBefore[page] = touched;
    }
    // 무리 크기 반영: at 0 the school's effect is shared among its fish, at 1 every fish counts as one of FISH_AUDIENCE.
    const { influence, ceiling, perFish } = settings.feedback;
    const audience = Math.max(FISH_AUDIENCE, school.fish.length) ** (1 - perFish) * FISH_AUDIENCE ** perFish;
    const strength = (influence * ATTENTION_GAIN) / audience;
    if (strength > 0) for (let page = 0; page < drawnPages; page += 1) attend(web, page, attention[page]! * strength, ceiling);
    this.loadScene(school);
    this.scene?.render(school.fish, this.motionTime, step, settings.fish.scale, settings.fishPalette);
  }

  /** The fish renderer (three.js) loads only once there are fish to draw. */
  private loadScene(school: GoldfishSchool) {
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
      console.warn("bubble/3 goldfish renderer failed to load.", error);
    });
  }

  private measure(frameStart: number) {
    this.renderer.sync();
    const costs = this.costs;
    costs[this.costCount % costs.length] = performance.now() - frameStart;
    this.costCount += 1;
    if (this.costCount % 60 !== 0) return;
    const sorted = Array.from(costs.subarray(0, Math.min(this.costCount, costs.length))).sort((a, b) => a - b);
    const at = (share: number) => sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))]!;
    this.hooks.frameCost(`${at(0.5).toFixed(1)} / ${at(0.95).toFixed(1)}`);
  }

  private summarise(delta: number) {
    this.sinceSummary += delta;
    if (this.sinceSummary <= SUMMARY_SECONDS) return;
    this.sinceSummary = 0;
    const web = this.raft.web;
    const share = concentration(web);
    this.hooks.summary(`${web.size} pages. The leading page, number ${leader(web) + 1}, holds ${percent(share.top)} of PageRank; the top tenth of pages hold ${percent(share.topTenth)}.`);
  }
}
