// The field: one canvas, every phone on it, one frame loop. Each frame:
// upload the tiles painted since the last (a few), let every phone decide
// what moves next, pack the quads if any changed, draw once. Strikes from
// the feed go to their phone at once, ripple to its neighbours, and, when
// the field surges, reach every phone together.

import type { FeedItem, FeedKeyword } from "@/socket/experiments/feed/1/client";
import { KEYWORDS } from "../content/keywords";
import { ripple, Surge, type Seat } from "../model/field";
import { cell, fitGrid } from "../model/layout";
import { personaFor } from "../model/persona";
import { mix } from "../model/random";
import { FEED_SLOTS, PHONES_MAX, type Tuning } from "../model/tuning";
import { rumour } from "../filters/rumour";
import { hueOf } from "../filters/sign";
import { RINGS, type PostFrame } from "../gl/post";
import { Compositor, type PhonePlacement } from "../gl/renderer";
import { Tiles } from "../paint/tiles";
import { subscribe, type FeedSource } from "./feed";
import { fishSpec, Phone, type Drive } from "./phone";
import type { AppId, Persona } from "../apps/types";
import { renderFishStrips } from "../objects/goldfish";
import { Scene } from "./scene";

const ATLAS_SIZE = 2048;
const ATLAS_LAYERS = 20;
/** Atlas room kept for each mobile, in whole glasses (its views, banners and what waits to be freed). Measured, docs/3.md. */
const GLASSES_A_MOBILE = 6;
/**
 * 물결: how much water the goldfish moves. A touch on the glass drops this much height at once; swimming adds a little
 * each frame, by its speed (pt a second). The first values (a touch 1, a wake up to 0.5 a frame) never let the water
 * rest: every glass boiled and nothing on it could be read (2026-11-25).
 */
const TOUCH_DROP = 1.2;
const WAKE_A_PT = 1 / 15000;
const WAKE_MOST = 0.1;
/** As rings (물결 방식 고리): a touch is a ring of 1; swimming leaves one of this size every so many pt. */
/** 치환: a switch reaches every mobile within this many seconds, and each mobile fades in this many of its own. */
const SUB_WITHIN = 3;
const SUB_FADE = 0.35;
const WAKE_EVERY = 240;
const WAKE_RING = 0.3;

/**
 * Seat → slot: the screen's slots scattered over the grid (as pc/2d-mobiles/1).
 * The screen has FEED_SLOTS of them; a seat past that shares the slot of seat − FEED_SLOTS.
 */
function scatteredSlots(count: number) {
  const order = Array.from({ length: FEED_SLOTS }, (_, index) => index);
  let state = 0x9e3779b9;
  for (let index = order.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0;
    const other = state % (index + 1);
    [order[index], order[other]] = [order[other]!, order[index]!];
  }
  return Array.from({ length: count }, (_, seat) => order[seat % FEED_SLOTS]!);
}

/**
 * - field: every phone, the goldfish at every thumb (default);
 * - focus: one phone, large, on a desktop; the visitor's mouse is its thumb,
 *   the goldfish takes it back after 12 s idle;
 * - hand: the page is the phone (a phone's browser, or `?mode=hand`).
 * Same engine, same apps, same content: only the number of phones and who drives them change.
 */
export type FieldMode = "field" | Drive;

export type EngineOptions = {
  mode: FieldMode;
  /** Which seat (owner, slot) one phone shows. */
  seat: number;
  /** Ambient posts about this keyword only (strikes still bring theirs). */
  keyword?: string;
  /** The app the phone opens on. */
  app?: AppId;
  /** Owner's settings to impose (hand: the visitor's own language and appearance). */
  persona?: Partial<Persona>;
};

export type EngineStats = {
  fps: number;
  p95: number;
  worst: number;
  quads: number;
  strikesPerSec: number;
  tiles: ReturnType<Tiles["stats"]>;
  showing: Record<string, number>;
  surges: number;
  dose: { min: number; median: number; max: number };
  cost: Record<string, number>;
};

export class Engine {
  private compositor: Compositor;
  private tiles!: Tiles;
  private scene!: Scene;
  private phones: Phone[] = [];
  private seats: Seat[] = [];
  private slotToPhones = new Map<number, number[]>();
  /** Strikes waiting for a slot's second mobile, which answers a moment after the first. */
  private readonly pendingStrikes: { t: number; phone: number; item: FeedItem }[] = [];
  private vocabulary: FeedKeyword[] = KEYWORDS;
  private labels = new Map(KEYWORDS.map((keyword) => [keyword.id, keyword.label]));
  private readonly t0 = performance.now();
  private frame = 0;
  private last = 0;
  private strikesThisFrame = 0;
  private readonly surge = new Surge();
  private readonly pendingEchoes: { t: number; phone: number; item: FeedItem }[] = [];
  private readonly recentKeywords: { t: number; keyword: string }[] = [];
  private frameTimes: number[] = [];
  private strikeTimes: number[] = [];
  private surges = 0;
  /** Mean ms per frame spent in each part, for `stats()`. */
  private readonly cost = { pump: 0, phones: 0, pack: 0, draw: 0 };
  private builtFor = "";
  private unsubscribe: (() => void) | null = null;
  private cssWidth = 1;
  private cssHeight = 1;
  /** Where each mobile's glass is on the canvas (device px), for what the filters need of the goldfish. */
  private placements: PhonePlacement[] = [];
  /**
   * 치환, by mobile: how far its content and the interface around it are substituted now (0–1), the state each is
   * fading to, and when it hears of the field's new state (filters/rumour.ts).
   */
  private readonly subContent = new Float32Array(PHONES_MAX);
  private readonly subUi = new Float32Array(PHONES_MAX);
  private readonly subHeard = new Uint8Array(PHONES_MAX);
  private subHears: number[] = [];
  /** The state the field was last told to take; -1 before the first frame. */
  private subTold = -1;
  /** 물결, 어안: what the passes after the draw are given (gl/post.ts). */
  private readonly post: PostFrame = {
    ripple: 0,
    lens: 0,
    lensAt: 0,
    grid: { x: 0, y: 0, pitchX: 1, pitchY: 1, w: 1, h: 1, columns: 1, count: 1 },
    fish: new Float32Array(PHONES_MAX * 2),
    drops: new Float32Array(512 * 3),
    dropCount: 0,
    dropSize: 8,
    water: 0,
    time: 0,
    rings: new Float32Array(PHONES_MAX * RINGS * 4),
  };
  /** Which of a mobile's rings is written next, and how far its goldfish has swum since its last one (pt). */
  private readonly ringNext = new Uint8Array(PHONES_MAX);
  private readonly swum = new Float32Array(PHONES_MAX);
  /** Each goldfish's place a frame ago (device px), to know how fast it moves the water. */
  private readonly fishBefore = new Float32Array(PHONES_MAX * 2).fill(-1e6);

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly tuning: () => Tuning,
    source: FeedSource,
    private readonly options: EngineOptions = { mode: "field", seat: 0 },
  ) {
    const dpr = Math.min(window.devicePixelRatio || 1, tuning().dpr);
    // Atlas: 2048² layers (20 here, 12 in /2: a hundred mobiles, painted finer than shown).
    this.compositor = new Compositor(canvas, ATLAS_SIZE, ATLAS_LAYERS, () => window.location.reload());
    this.dpr = dpr;
    this.unsubscribe = subscribe(source, KEYWORDS, {
      items: (items) => this.receive(items),
      vocabulary: (vocabulary) => {
        if (!vocabulary.length) return;
        this.vocabulary = vocabulary;
        for (const keyword of vocabulary) this.labels.set(keyword.id, keyword.label);
      },
      status: () => {},
    });
  }

  private dpr: number;

  get now() {
    return (performance.now() - this.t0) / 1000;
  }

  /** The canvas's CSS size; rebuilds the phones when their count or size changes. */
  layout(width: number, height: number) {
    this.cssWidth = width;
    this.cssHeight = height;
    const mode = this.options.mode;
    const tuning = this.tuning();
    const shown = cell(tuning);
    const phones = mode === "field" ? tuning.phones : 1;
    const grid = fitGrid(width, height, phones, tuning);
    // hand: the glass is the page, as large as it fits; focus: one mobile, a margin around.
    const scale = mode === "hand" ? Math.min(width / shown.w, height / shown.h) : mode === "focus" ? Math.min((width * 0.9) / shown.w, (height * 0.92) / shown.h) : grid.width / shown.w;
    this.compositor.crop = [tuning.cropTop, tuning.cropBottom];
    // A covering grid runs over the edges; the margins stay clear of it.
    this.compositor.inset = mode === "field" ? [(width * tuning.marginX * this.dpr) / 100, (height * tuning.marginY * this.dpr) / 100] : [0, 0];
    this.compositor.resize(width * this.dpr, height * this.dpr);
    const key = `${phones}|${Math.round(scale * this.dpr * 40)}|${tuning.sharp}`;
    if (key !== this.builtFor) {
      this.builtFor = key;
      this.build(phones, scale * this.dpr);
    }
    const totalWidth = grid.columns * grid.width + (grid.columns - 1) * grid.gapX;
    const rows = Math.ceil(phones / grid.columns);
    const totalHeight = rows * grid.height + (rows - 1) * grid.gapY;
    const left = (width - totalWidth) / 2;
    const top = (height - totalHeight) / 2;
    this.seats = [];
    this.placements = [];
    if (mode !== "field") {
      const x = (width - shown.w * scale) / 2;
      const y = (height - shown.h * scale) / 2 - tuning.cropTop * scale;
      this.placement = { x: x * this.dpr, y: y * this.dpr, scale: scale * this.dpr };
      this.placements.push(this.placement);
      this.seats.push({ column: 0, row: 0 });
      this.compositor.place(0, this.placement, mode === "hand" ? 0 : tuning.radius);
      // One glass: a grid of one, its step past any canvas.
      this.post.grid = { x: x * this.dpr, y: (y + tuning.cropTop * scale) * this.dpr, pitchX: 1e7, pitchY: 1e7, w: shown.w * scale * this.dpr, h: shown.h * scale * this.dpr, columns: 1, count: 1 };
      return;
    }
    this.post.grid = {
      x: left * this.dpr,
      y: top * this.dpr,
      pitchX: (grid.width + grid.gapX) * this.dpr,
      pitchY: (grid.height + grid.gapY) * this.dpr,
      w: grid.width * this.dpr,
      h: grid.height * this.dpr,
      columns: grid.columns,
      count: phones,
    };
    this.phones.forEach((_, index) => {
      const column = index % grid.columns;
      const row = Math.floor(index / grid.columns);
      this.seats.push({ column, row });
      // The glass's own top-left: what is cut off its top lies above the seat.
      const x = left + column * (grid.width + grid.gapX);
      const y = top + row * (grid.height + grid.gapY) - tuning.cropTop * scale;
      const placement = { x: x * this.dpr, y: y * this.dpr, scale: scale * this.dpr };
      this.placements.push(placement);
      this.compositor.place(index, placement, tuning.radius);
    });
  }

  private build(count: number, pxPerPt: number) {
    for (const phone of this.phones) phone.dispose();
    this.tiles?.dispose();
    const workers = Math.max(2, Math.min(4, (navigator.hardwareConcurrency || 4) - 2));
    // Tiles painted at the size they are shown (never above 2 px per pt).
    // Tiles painted finer than they are shown (`sharp`), never above 3 px per pt, and never so fine that the
    // atlas cannot hold what the field shows: a glass left waiting for room is a black screen.
    const room = Math.sqrt((ATLAS_LAYERS * ATLAS_SIZE * ATLAS_SIZE) / (390 * 844 * GLASSES_A_MOBILE * count));
    this.tiles = new Tiles(this.compositor, Math.max(0.3, Math.min(3, pxPerPt * this.tuning().sharp, room)), workers);
    this.scene = new Scene(this.compositor, this.tiles, count);
    // bubble/7's goldfish, its tail beat in frames, at the size a thumb is shown (≤ 160 px a frame: 12 fit a layer).
    const fishPx = Math.min(160, this.tiles.columnWidth, Math.max(48, Math.round(72 * pxPerPt * 1.3 * Math.max(1, this.tuning().thumbSize))));
    for (const strip of renderFishStrips(fishPx)) this.tiles.provide(fishSpec(strip.palette), strip.pixels, strip.size, strip.size * strip.frames);
    const env = {
      tuning: this.tuning,
      label: (keyword: string) => this.labels.get(keyword) ?? keyword,
      vocabulary: () => (this.options.keyword ? [this.options.keyword] : this.vocabulary.map((keyword) => keyword.id)),
      clock: () => this.clockText(),
      feeding: () => this.strikeTimes.length > 0 && this.strikeTimes[this.strikeTimes.length - 1]! > this.now - 5,
    };
    const now = this.now;
    if (this.options.mode !== "field") {
      // One phone: the seat's owner, fed by the seat's slot.
      const seat = Math.max(0, Math.min(PHONES_MAX - 1, Math.round(this.options.seat)));
      this.slotToPhones = new Map([[scatteredSlots(PHONES_MAX)[seat]!, [0]]]);
      const persona = { ...personaFor(seat), ...this.options.persona };
      this.phones = [new Phone(this.scene, this.tiles, 0, persona, env, now, { drive: this.options.mode, app: this.options.app })];
      return;
    }
    const slots = scatteredSlots(count);
    this.slotToPhones = new Map();
    slots.forEach((slot, index) => this.slotToPhones.set(slot, [...(this.slotToPhones.get(slot) ?? []), index]));
    this.pendingStrikes.length = 0;
    this.phones = Array.from({ length: count }, (_, index) => new Phone(this.scene, this.tiles, index, personaFor(index), env, now + index * 0.012));
  }

  private clockCache = { at: -1, time: "", date: "" };

  /** The phones' clock, formatted once a second. */
  private clockText() {
    const second = Math.floor(Date.now() / 1000);
    if (second !== this.clockCache.at) {
      const date = new Date();
      this.clockCache = {
        at: second,
        time: date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
        date: date.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
      };
    }
    return this.clockCache;
  }

  retune() {
    for (const phone of this.phones) phone.retune();
    this.layout(this.cssWidth, this.cssHeight);
  }

  private readonly labelOf = (keyword: string) => this.labels.get(keyword) ?? keyword;

  /** A keyword's colour: the screen's vocabulary spread evenly round the wheel, so no two of its keywords share one; a keyword outside it by its name. */
  private readonly hueOfKeyword = (keyword: string) => {
    const at = this.vocabulary.findIndex((entry) => entry.id === keyword);
    return at < 0 ? hueOf(keyword) : ((at * 7) % this.vocabulary.length) / this.vocabulary.length;
  };

  /**
   * 치환 (필터): content (1 치환, 2 콘텐츠만) and the interface around it (1 치환, 3 UI만) each fade to their state,
   * mobile by mobile as each hears of the switch, so between any two of 원본, 치환, 콘텐츠만 and UI만 the change
   * spreads over the field while what comes fades in and what goes fades out on each glass.
   */
  private substitute(now: number, dt: number) {
    const tuning = this.tuning();
    const first = this.subTold < 0;
    if (tuning.sub !== this.subTold) {
      // A switch: it crosses the field as a rumour, each mobile hearing it in its own time within SUB_WITHIN s.
      // What the route opens with is there at once.
      this.subTold = tuning.sub;
      this.subHears = first ? [] : rumour(this.seats, SUB_WITHIN - SUB_FADE).map((time) => now + time);
    }
    const smooth = (value: number) => value * value * (3 - 2 * value);
    const step = first ? 1 : dt / SUB_FADE;
    const filters = this.compositor.filters;
    let showing = tuning.sub > 0;
    this.phones.forEach((phone, index) => {
      if (first || now >= (this.subHears[index] ?? 0)) this.subHeard[index] = tuning.sub;
      const state = this.subHeard[index]!;
      const content = state === 1 || state === 2 ? 1 : 0;
      const ui = state === 1 || state === 3 ? 1 : 0;
      const c = this.subContent[index]!;
      const u = this.subUi[index]!;
      this.subContent[index] = content > c ? Math.min(content, c + step) : Math.max(content, c - step);
      this.subUi[index] = ui > u ? Math.min(ui, u + step) : Math.max(ui, u - step);
      if (this.subContent[index]! > 0 || this.subUi[index]! > 0) showing = true;
      filters[index * 4] = smooth(this.subUi[index]!);
      filters[index * 4 + 2] = smooth(this.subContent[index]!);
      filters[index * 4 + 1] = tuning.ground === 1 || (tuning.ground === 2 && phone.dark) ? 1 : 0;
    });
    // The cells stay packed until the last mobile's have faded out.
    this.scene.substitute(showing ? { words: tuning.words, label: this.labelOf, hue: this.hueOfKeyword } : null);
    this.compositor.sub = [0, tuning.frame, tuning.cells, tuning.ink];
  }

  /**
   * 물결, 어안 (필터): where each goldfish is on the canvas, and what it did to the water since the last frame —
   * a drop where it touched the glass, a push as strong as it is fast where it swam. Null when neither is on:
   * then the field is drawn straight to the canvas.
   */
  private after(now: number, dt: number): PostFrame | null {
    const tuning = this.tuning();
    if (tuning.ripple <= 0 && tuning.lens <= 0) {
      this.fishBefore.fill(-1e6);
      return null;
    }
    const post = this.post;
    post.ripple = tuning.ripple;
    post.lens = tuning.lens;
    post.lensAt = tuning.lensAt;
    post.water = tuning.water;
    post.time = now;
    post.dropCount = 0;
    const top = tuning.cropTop;
    const bottom = 844 - tuning.cropBottom;
    const drop = (x: number, y: number, amount: number) => {
      if (post.dropCount >= 512) return;
      post.drops.set([x, y, amount], post.dropCount * 3);
      post.dropCount += 1;
    };
    const ring = (index: number, x: number, y: number, amount: number) => {
      post.rings.set([x, y, now, amount], (index * RINGS + this.ringNext[index]!) * 4);
      this.ringNext[index] = (this.ringNext[index]! + 1) % RINGS;
    };
    this.phones.forEach((phone, index) => {
      const placement = this.placements[index];
      const fish = placement ? phone.fishAt(now) : null;
      const onGlass = fish && fish.x >= 0 && fish.x <= 390 && fish.y >= top && fish.y <= bottom;
      if (!placement || !fish || !onGlass) {
        post.fish[index * 2] = -1e6;
        this.fishBefore[index * 2] = -1e6;
        phone.takeTouches();
        return;
      }
      const x = placement.x + fish.x * placement.scale;
      const y = placement.y + fish.y * placement.scale;
      post.fish[index * 2] = x;
      post.fish[index * 2 + 1] = y;
      post.dropSize = Math.max(6, placement.scale * 44);
      if (tuning.ripple > 0) {
        for (const touch of phone.takeTouches()) {
          const tx = placement.x + touch.x * placement.scale;
          const ty = placement.y + touch.y * placement.scale;
          drop(tx, ty, TOUCH_DROP);
          ring(index, tx, ty, 1);
        }
        const beforeX = this.fishBefore[index * 2]!;
        if (beforeX > -1e5 && dt > 0) {
          // pt a second, whatever the mobile's size on the canvas.
          const moved = Math.hypot(x - beforeX, y - this.fishBefore[index * 2 + 1]!) / placement.scale;
          const speed = moved / dt;
          if (speed > 60) drop(x, y, Math.min(WAKE_MOST, speed * WAKE_A_PT));
          // As rings: one smaller ring for every stretch it swims.
          this.swum[index] = this.swum[index]! + moved;
          if (this.swum[index]! > WAKE_EVERY) {
            this.swum[index] = 0;
            ring(index, x, y, WAKE_RING);
          }
        }
      } else phone.takeTouches();
      this.fishBefore[index * 2] = x;
      this.fishBefore[index * 2 + 1] = y;
    });
    return post;
  }

  private receive(items: FeedItem[]) {
    const now = this.now;
    const tuning = this.tuning();
    for (const item of items) {
      const [index, ...sharing] = this.slotToPhones.get(item.slot) ?? [];
      if (index === undefined) continue;
      this.phones[index]?.strike(item, now);
      // A mobile sharing the slot takes the same strike 0.2–0.8 s later, so the two are never in step.
      for (const other of sharing) this.pendingStrikes.push({ t: now + 0.2 + (mix(item.seed ^ other) % 600) / 1000, phone: other, item });
      this.strikesThisFrame += 1;
      this.strikeTimes.push(now);
      this.recentKeywords.push({ t: now, keyword: item.keyword });
      let roll = mix(item.seed);
      const random = () => ((roll = mix(roll)) / 4_294_967_296);
      for (const echo of ripple(this.seats, index, item.rank, tuning.wave, random)) this.pendingEchoes.push({ t: now + echo.delay, phone: echo.phone, item });
    }
  }

  /** Every phone, the same notification, now: the hype owning the field. */
  private synchronise(now: number) {
    const counts = new Map<string, number>();
    for (const { t, keyword } of this.recentKeywords) if (t > now - 3) counts.set(keyword, (counts.get(keyword) ?? 0) + 1);
    const top = [...counts].sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!top) return;
    this.surges += 1;
    const seed = mix(Math.floor(now * 1000));
    this.phones.forEach((phone, index) => {
      this.pendingEchoes.push({ t: now + (index % 3) * 0.008, phone: index, item: { id: -1, slot: -1, fish: -1, page: -1, keyword: top, rank: 0.9, seed, at: Date.now() } });
    });
  }

  private placement = { x: 0, y: 0, scale: 1 };

  /** A pointer on the canvas (CSS px from its top-left), to the one phone's glass, in pt. */
  pointer(kind: "hover" | "down" | "move" | "up", cssX: number, cssY: number) {
    const phone = this.phones[0];
    if (!phone || this.options.mode === "field") return;
    const x = (cssX * this.dpr - this.placement.x) / this.placement.scale;
    const y = (cssY * this.dpr - this.placement.y) / this.placement.scale;
    phone.touch(kind, x, y, this.now);
  }

  wheel(deltaY: number) {
    if (this.options.mode !== "field") this.phones[0]?.wheel(deltaY, this.now);
  }

  start() {
    const loop = (time: number) => {
      this.frame = requestAnimationFrame(loop);
      this.step(time);
    };
    this.frame = requestAnimationFrame(loop);
  }

  private step(time: number) {
    if (this.last) {
      this.frameTimes.push(time - this.last);
      if (this.frameTimes.length > 600) this.frameTimes.shift();
    }
    const dt = this.last ? (time - this.last) / 1000 : 0;
    this.last = time;
    const now = this.now;
    const t0 = performance.now();
    this.tiles.pump(4);
    const t1 = performance.now();
    for (let index = 0; index < this.pendingStrikes.length; ) {
      const strike = this.pendingStrikes[index]!;
      if (strike.t <= now) {
        this.phones[strike.phone]?.strike(strike.item, now);
        this.pendingStrikes.splice(index, 1);
      } else index += 1;
    }
    for (let index = 0; index < this.pendingEchoes.length; ) {
      const echo = this.pendingEchoes[index]!;
      if (echo.t <= now) {
        this.pendingEchoes.splice(index, 1);
        this.phones[echo.phone]?.strike(echo.item, now, true);
      } else index += 1;
    }
    for (const phone of this.phones) phone.update(now);
    const t2 = performance.now();
    if (this.tuning().sync && this.surge.step(this.strikesThisFrame, dt, now)) this.synchronise(now);
    this.strikesThisFrame = 0;
    while (this.recentKeywords.length && this.recentKeywords[0]!.t < now - 4) this.recentKeywords.shift();
    while (this.strikeTimes.length && this.strikeTimes[0]! < now - 5) this.strikeTimes.shift();
    this.substitute(now, dt);
    const after = this.after(now, dt);
    const { data, count } = this.scene.pack();
    const t3 = performance.now();
    this.compositor.draw(now, data, count, [0, 0, 0], after);
    const t4 = performance.now();
    const k = 0.05;
    this.cost.pump += (t1 - t0 - this.cost.pump) * k;
    this.cost.phones += (t2 - t1 - this.cost.phones) * k;
    this.cost.pack += (t3 - t2 - this.cost.pack) * k;
    this.cost.draw += (t4 - t3 - this.cost.draw) * k;
  }

  stats(): EngineStats {
    const sorted = [...this.frameTimes].sort((a, b) => a - b);
    const mean = sorted.reduce((sum, value) => sum + value, 0) / Math.max(1, sorted.length);
    const showing: Record<string, number> = {};
    for (const phone of this.phones) showing[phone.showing] = (showing[phone.showing] ?? 0) + 1;
    const doses = this.phones.map((phone) => phone.dose).sort((a, b) => a - b);
    return {
      fps: Math.round(1000 / Math.max(1, mean)),
      p95: Math.round(sorted[Math.floor(sorted.length * 0.95)] ?? 0),
      worst: Math.round(sorted[sorted.length - 1] ?? 0),
      quads: this.scene.size,
      strikesPerSec: Math.round((this.strikeTimes.length / 5) * 10) / 10,
      tiles: this.tiles.stats(),
      showing,
      surges: this.surges,
      dose: { min: doses[0] ?? 0, median: doses[doses.length >> 1] ?? 0, max: doses[doses.length - 1] ?? 0 },
      cost: Object.fromEntries(Object.entries(this.cost).map(([key, value]) => [key, Math.round(value * 100) / 100])),
    };
  }

  dispose() {
    cancelAnimationFrame(this.frame);
    this.unsubscribe?.();
    for (const phone of this.phones) phone.dispose();
    this.tiles?.dispose();
  }
}
