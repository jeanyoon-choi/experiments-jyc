// The frame loop: steps the web, relaxes the displayed distribution toward
// one power-iteration step of itself, lays the raft out, sends rank round the
// links as travelling portions, lets the goldfish swim and watch, and draws.
// Settings are read from `settings.current` each frame; nothing here is React.

import { BUBBLE_FLOATS, createFoamRenderer, MAX_BUBBLES, MEDIA_FLOATS, mediaTileSize, type FoamRenderer } from "./foam";
import { GoldfishSchool, type FishPaletteId, type FishParameters } from "../fish/goldfish";
import type { GoldfishScene } from "../fish/goldfish-scene";
import { iterate, outWeights, transit } from "../web/iteration";
import { DEFAULT_KEYWORD_STYLE, DEFAULT_SURFACE, isSolidSurface, isTextSurface, surfaceItems, type Fill, type KeywordStyle, type SurfaceId } from "../media/catalogue";
import { loadMediaTiles, type MediaLoad } from "../media/loader";
import { assignPage, createMediaField, follow as followTrend, resetField, stepMedia, type MediaParameters } from "../media/model";
import { attend, concentration, leader, MAX_PAGES, stepRankedWeb, type RankedWeb, type WebParameters } from "../web/model";
import { radiusFor, type Raft } from "../raft/raft";
import { filmLook, type MediaLook, type Visual } from "../settings";
import type { TouchSound } from "../sound/sound";

/** foam.ts's flat and sphere mappings (settings MAPPINGS modes 1 and 3). */
const FLAT_MAPPING = 1;
const SPHERE_MAPPING = 3;

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
 * (at least FISH_AUDIENCE fish), so all fish on one page for a second give it
 * ATTENTION_GAIN × influence; quality reverts at 0.08 per second.
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
  mapping: number;
  media: MediaParameters;
  mediaLook: MediaLook;
  /** Travelling portions show their source page's image. */
  carry: boolean;
  /** Pictures only on bubbles a goldfish is touching. */
  onTouch: boolean;
  fishCount: number;
  fish: FishParameters;
  fishPalette: FishPaletteId;
  influence: number;
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
  /** Loads a surface's images into the renderer. */
  applySurface(surface: SurfaceId, keywords: KeywordStyle): void;
  setEnvironmentImage(image: TexImageSource): void;
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
    console.warn("bubble/1 needs WebGL2 with float render targets.");
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
  /** Time that stands still under reduced motion: the film, the media and the portions run on it. */
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
  private readonly revealField = new Float32Array(MAX_PAGES);
  /** Which pages a fish touched last frame: a page newly touched is a note (소리). */
  private readonly touchedBefore = new Uint8Array(MAX_PAGES);
  // Media: which image each page shows, and the images themselves.
  private readonly mediaField = createMediaField(MAX_PAGES);
  /** Pages up to here have been given their image. */
  private mediaKnown = 0;
  private mediaLoad: MediaLoad | null = null;
  private mediaLayers = 0;
  private mediaSolid = 0;
  /** 꽉 채움 lettering, under the film as any picture is, drawn to fit the disc: laid flat over it, or wrapped round the ball; its own mapping, whatever 입히기 says. */
  private mediaFill: Fill = "none";
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
    this.applySurface(DEFAULT_SURFACE, DEFAULT_KEYWORD_STYLE);
    this.sizeCanvas();
    this.observer = new ResizeObserver(() => this.sizeCanvas());
    this.observer.observe(canvas);
    this.animationFrame = requestAnimationFrame(this.tick);
  }

  applySurface(surface: SurfaceId, keywords: KeywordStyle) {
    const renderer = this.renderer;
    this.mediaLoad?.cancel();
    const items = surfaceItems(surface);
    this.mediaLayers = items.length;
    this.mediaSolid = isSolidSurface(surface) ? 1 : 0;
    this.mediaFill = isTextSurface(surface) ? keywords.fill : "none";
    renderer.setMediaLayerCount(this.mediaLayers);
    resetField(this.mediaField, this.raft.web.size, this.mediaLayers, this.motionTime, this.settings.current.media, this.raft.random);
    this.mediaLoad = this.mediaLayers === 0
      ? null
      : loadMediaTiles(items, (index, tile) => renderer.setMediaLayer(index, tile), () => renderer.commitMedia(), keywords, mediaTileSize(items.length));
  }

  setEnvironmentImage(image: TexImageSource) {
    this.renderer.setEnvironmentImage(image);
  }

  dispose() {
    this.disposed = true;
    this.mediaLoad?.cancel();
    this.observer.disconnect();
    cancelAnimationFrame(this.animationFrame);
    this.renderer.dispose();
    this.scene?.dispose();
  }

  /** The display starts over from uniform, and every page takes its born image. */
  private restart() {
    const web = this.raft.web;
    this.shown.fill(0);
    this.shown.fill(1 / Math.max(1, web.size), 0, web.size);
    resetField(this.mediaField, web.size, this.mediaLayers, this.motionTime, this.settings.current.media, this.raft.random);
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
      this.mediaKnown = raft.web.size;
    }
    // Under reduced motion the web and the school run slowly.
    const step = delta * (still ? 0.3 : 1);

    this.stepWeb(step, settings);
    this.stepDisplay(step);
    raft.arrange(this.shown, delta, step, still, settings.visual.area);
    const pageStart = this.emitBubbles(step, settings);
    this.stepFish(delta, step, pageStart, settings);
    this.renderer.render(
      this.bubbleCount,
      this.motionTime,
      filmLook(
        settings.visual,
        // Filled lettering holds still: on the ball it spans the rim edge to edge, and a turn would slide one end
        // past the rim and bring its mirror in at the other.
        this.mediaFill === "none" ? settings.mediaLook : { ...settings.mediaLook, mediaDrift: 0 },
        {
          mediaMode: this.mediaLayers === 0 ? 0 : this.mediaFill === "flat" ? FLAT_MAPPING : this.mediaFill === "sphere" ? SPHERE_MAPPING : settings.mapping,
          mediaReveal: settings.onTouch ? 1 : 0,
          mediaSolid: this.mediaSolid,
        },
      ),
    );
    if (MEASURE) this.measure(frameStart);
    this.summarise(delta);
  };

  /** The model's step, with images for new pages and the media's own changes. */
  private stepWeb(step: number, settings: LoopSettings) {
    const raft = this.raft;
    const web = raft.web;
    const field = raft.size;
    const random = raft.random;
    const events = stepRankedWeb(web, step, settings.parameters, raft.pendingPages);
    for (const event of events) {
      // A new page appears beside the first page it links to, with its own image.
      assignPage(this.mediaField, event.page, this.motionTime, settings.media, random);
      const anchor = raft.bodies[event.targets[0] ?? 0];
      const angle = random() * Math.PI * 2;
      raft.placePage(
        event.page,
        (anchor?.x ?? field.width / 2) + Math.cos(angle) * 24,
        (anchor?.y ?? field.height / 2) + Math.sin(angle) * 24,
      );
    }
    // Pages made by hand arrive outside the events: give them their image too.
    const mediaField = this.mediaField;
    while (this.mediaKnown < web.size) {
      const page = this.mediaKnown;
      if (mediaField.next[page] === 0 && mediaField.since[page] === 0) assignPage(mediaField, page, this.motionTime, settings.media, random);
      this.mediaKnown += 1;
    }
    stepMedia(mediaField, web, this.motionTime, step, settings.media, random);
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

  /** Adds a bubble for the renderer; `page` is the page whose image it shows, −1 the bare film. */
  private put(x: number, y: number, radius: number, seed: number, page: number) {
    const index = this.bubbleCount;
    if (index >= MAX_BUBBLES) return;
    const { bubbles, media, reveal } = this.renderer;
    const at = index * BUBBLE_FLOATS;
    bubbles[at] = x;
    bubbles[at + 1] = y;
    bubbles[at + 2] = radius;
    bubbles[at + 3] = seed;
    reveal[index] = page >= 0 ? this.revealField[page]! : 0;
    const m = index * MEDIA_FLOATS;
    if (page >= 0) {
      const field = this.mediaField;
      media[m] = field.layer[page]!;
      media[m + 1] = field.next[page]!;
      media[m + 2] = field.blend[page]!;
      media[m + 3] = field.phase[page]!;
    } else {
      media[m] = -1;
      media[m + 1] = -1;
      media[m + 2] = 0;
      media[m + 3] = 0;
    }
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
  private emitBubbles(step: number, settings: LoopSettings) {
    const raft = this.raft;
    const web = raft.web;
    const field = raft.size;
    const points = raft.points;
    const { shown, pools, weights, mediaField } = this;
    const focus = raft.focus;
    const pageCount = Math.min(web.size, MAX_PAGES);
    const flowing = raft.linkVisibility >= 0.5;
    for (let page = 0; page < pageCount; page += 1) pools[page] = shown[page]!;
    this.bubbleCount = 0;
    const mediaParameters = settings.media;
    const trending = mediaParameters.mode === "trend" && this.mediaLayers > 1;
    const motionTime = this.motionTime;
    const before = motionTime - step;
    const { area, portions } = settings.visual;

    if (flowing || trending) {
      let linkCount = 0;
      for (let from = 0; from < pageCount; from += 1) linkCount += web.out[from]!.length;
      const leastFlow = portions * (linkCount > 0 ? web.damping / linkCount : 1);
      // 꽉 채움 lettering stays on the pages: portions carrying it sweep over the page bubbles and the words jostle.
      const carried = settings.carry && this.mediaFill === "none";
      for (let from = 0; from < pageCount; from += 1) {
        for (const entry of web.out[from]!) {
          const to = entry.target;
          if (to >= pageCount) continue;
          const offset = hashOf(to, from);
          const period = PERIOD[0] + (PERIOD[1] - PERIOD[0]) * hashOf(from, to);
          const cycle = (motionTime / period + offset) % 1;
          // As its portion is taken in, the sender may take up the receiver's image
          // (also in the rank view, where no portions are drawn: the same clocks).
          if (trending && (before / period + offset) % 1 < TAKEN_IN && cycle >= TAKEN_IN) followTrend(mediaField, web, from, to, motionTime, mediaParameters, raft.random);
          if (!flowing) continue;
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
          this.put(ax + dx * travel - (dy / length) * bow, ay + dy * travel + (dx / length) * bow, radius, hashOf(from, to + 5), carried ? from : -1);
        }
      }
    }

    // Pages: one bubble each, as large as its rank, pressed into its neighbours.
    const pageStart = this.bubbleCount;
    for (let page = 0; page < pageCount; page += 1) {
      const r = radiusFor(Math.max(pools[page]!, 0), field, area);
      this.put(points[page * 2]!, points[page * 2 + 1]!, r, hashOf(page, 3), page);
    }
    return pageStart;
  }

  /** Goldfish swim around exactly this frame's discs, and their watching feeds back into quality. */
  private stepFish(delta: number, step: number, pageStart: number, settings: LoopSettings) {
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
    const { attention, revealField, touchedBefore, shown } = this;
    const bubbles = this.renderer.bubbles;
    const drawnPages = this.bubbleCount - pageStart;
    school.step(step, web, shown, bubbles, this.bubbleCount, pageStart, drawnPages, settings.fish);
    school.drainContact(drawnPages, attention);
    // A page's picture comes while a fish touches it and goes when none does, over the media fade
    // (read next frame, one frame behind the contact).
    const fade = settings.media.fade;
    const reveal = fade > 0 ? delta / fade : 1;
    for (let page = 0; page < drawnPages; page += 1) {
      const target = attention[page]! > 0 ? 1 : 0;
      const current = revealField[page]!;
      revealField[page] = current < target ? Math.min(target, current + reveal) : Math.max(target, current - reveal);
    }
    // 소리: the same onset as the reveal above — a page a fish has just begun to touch.
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
    const strength = settings.influence * ATTENTION_GAIN / Math.max(FISH_AUDIENCE, school.fish.length);
    if (strength > 0) for (let page = 0; page < drawnPages; page += 1) attend(web, page, attention[page]! * strength);
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
