// The glasses: every phone of pc/2d-mobiles/2's field, drawn side by side on one sheet instead of on the page
// (pc/3d-mobiles/2, 2026-11-23). Each frame: upload the tiles painted since the last (a few), let every phone decide
// what moves next, pack the quads if any changed, draw once. Strikes from the feed go to their phone at once, ripple
// to its neighbours on the wall, and, when the field surges, reach every phone together.
//
// What changed from pc/2d-mobiles/2's engine: no canvas, no frame loop and no pointer of its own (../index.ts calls
// frame() inside three.js's frame, with the sheet bound); the phones are bare glass in a packed sheet, not bezelled
// phones fitted to a window; more phones than the feed has slots share slots; hand() tells where each glass is
// touched, for the fish drawn outside it.

import type { FeedItem, FeedKeyword } from "@/socket/experiments/feed/1/client";
import { KEYWORDS } from "../content/keywords";
import { ripple, Surge, type Seat } from "../model/field";
import { personaFor } from "../model/persona";
import { mix } from "../model/random";
import type { Tuning } from "../model/tuning";
import { Compositor } from "../gl/renderer";
import { MAX_PHONES } from "../gl/shaders";
import { Tiles } from "../paint/tiles";
import { subscribe, type FeedSource } from "./feed";
import { fishSpec, Phone } from "./phone";
import { GLASS } from "./geometry";
import { renderFishStrips } from "../objects/goldfish";
import { Scene } from "./scene";

/** The feed's slots (socket feed/1). */
const SLOTS = 64;

/** The screen's slots scattered over the seats (as pc/2d-mobiles/1); past the feed's 64 the seats share them. */
function scatteredSlots(count: number) {
  const order = Array.from({ length: SLOTS }, (_, index) => index);
  let state = 0x9e3779b9;
  for (let index = order.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0;
    const other = state % (index + 1);
    [order[index], order[other]] = [order[other]!, order[index]!];
  }
  return Array.from({ length: count }, (_, index) => order[index % SLOTS]!);
}

/** Where the glasses lie on the sheet, in its pixels from the top left. */
export type Sheet = {
  width: number;
  height: number;
  /** A glass's size. */
  glassWidth: number;
  glassHeight: number;
  /** Glass `index`'s top-left. */
  at(index: number): { x: number; y: number };
};

export type EngineStats = {
  quads: number;
  strikesPerSec: number;
  tiles: ReturnType<Tiles["stats"]>;
  showing: Record<string, number>;
  surges: number;
  cost: Record<string, number>;
};

export class Engine {
  readonly count: number;
  readonly sheet: Sheet;
  private readonly compositor: Compositor;
  private readonly tiles: Tiles;
  private readonly scene: Scene;
  private readonly phones: Phone[];
  private readonly seats: Seat[];
  private readonly slotToPhones = new Map<number, number[]>();
  private vocabulary: FeedKeyword[] = KEYWORDS;
  private readonly labels = new Map(KEYWORDS.map((keyword) => [keyword.id, keyword.label]));
  private readonly t0 = performance.now();
  private last = 0;
  private strikesThisFrame = 0;
  private readonly surge = new Surge();
  private readonly pendingEchoes: { t: number; phone: number; item: FeedItem }[] = [];
  private readonly recentKeywords: { t: number; keyword: string }[] = [];
  private strikeTimes: number[] = [];
  private surges = 0;
  /** Mean ms per frame spent in each part, for `stats()`. */
  private readonly cost = { pump: 0, phones: 0, pack: 0, draw: 0 };
  private readonly unsubscribe: () => void;

  /**
   * `count` glasses at `pxPerPt` sheet pixels a point, `columns` of them across the wall they stand in (for the
   * ripple between neighbours). The caller's GL state must be the sheet's (see ../index.ts) here and in frame().
   */
  constructor(
    gl: WebGL2RenderingContext,
    count: number,
    columns: number,
    pxPerPt: number,
    private readonly tuning: () => Tuning,
    source: FeedSource,
  ) {
    this.count = count = Math.max(1, Math.min(MAX_PHONES, Math.round(count)));
    // Atlas: 2048² layers; enough for the visible screens of every phone, twice over.
    this.compositor = new Compositor(gl, 2048, 12);

    // The sheet: as square as the glasses allow, a margin between them (a buzzing glass moves a few points; the
    // sheet's smaller copies must not mix neighbours).
    const pad = Math.max(8, Math.ceil(12 * pxPerPt));
    const pitchX = Math.ceil(GLASS.w * pxPerPt) + pad;
    const pitchY = Math.ceil(GLASS.h * pxPerPt) + pad;
    const across = Math.max(1, Math.min(count, Math.ceil(Math.sqrt((count * pitchY) / pitchX))));
    const down = Math.ceil(count / across);
    const at = (index: number) => ({ x: pad / 2 + (index % across) * pitchX, y: pad / 2 + Math.floor(index / across) * pitchY });
    this.sheet = { width: across * pitchX, height: down * pitchY, glassWidth: GLASS.w * pxPerPt, glassHeight: GLASS.h * pxPerPt, at };
    this.compositor.resize(this.sheet.width, this.sheet.height);

    const workers = Math.max(2, Math.min(4, (navigator.hardwareConcurrency || 4) - 2));
    // Tiles painted at the size they are shown (never above 2 px per pt).
    this.tiles = new Tiles(this.compositor, Math.min(2, Math.max(0.3, pxPerPt)), workers);
    this.scene = new Scene(this.compositor, this.tiles, count);
    // The glass's own goldfish (pc/2d-mobiles/2's thumb) stays in the engine, drawn at no opacity while `thumb` is 0.
    const fishPx = Math.min(160, this.tiles.columnWidth, Math.max(48, Math.round(72 * pxPerPt * 1.3)));
    for (const strip of renderFishStrips(fishPx)) this.tiles.provide(fishSpec(strip.palette), strip.pixels, strip.size, strip.size * strip.frames);
    const env = {
      tuning: this.tuning,
      label: (keyword: string) => this.labels.get(keyword) ?? keyword,
      vocabulary: () => this.vocabulary.map((keyword) => keyword.id),
      clock: () => this.clockText(),
      feeding: () => this.strikeTimes.length > 0 && this.strikeTimes[this.strikeTimes.length - 1]! > this.now - 5,
    };
    const now = this.now;
    scatteredSlots(count).forEach((slot, index) => {
      const phones = this.slotToPhones.get(slot);
      if (phones) phones.push(index);
      else this.slotToPhones.set(slot, [index]);
    });
    this.phones = Array.from({ length: count }, (_, index) => new Phone(this.scene, this.tiles, index, personaFor(index), env, now + index * 0.012, { bare: true }));
    this.seats = this.phones.map((_, index) => ({ column: index % columns, row: Math.floor(index / columns) }));
    // The mobile's own screen is cut to its corners (mobile/mobile.ts): the glass here is square.
    this.phones.forEach((_, index) => this.compositor.place(index, { ...at(index), scale: pxPerPt }, 0));

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

  get now() {
    return (performance.now() - this.t0) / 1000;
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

  /** The option menu changed (the glass's own goldfish on or off, its size). */
  retune() {
    for (const phone of this.phones) phone.retune();
  }

  private receive(items: FeedItem[]) {
    const now = this.now;
    const tuning = this.tuning();
    for (const item of items) {
      for (const index of this.slotToPhones.get(item.slot) ?? []) {
        this.phones[index]?.strike(item, now);
        this.strikesThisFrame += 1;
        this.strikeTimes.push(now);
        this.recentKeywords.push({ t: now, keyword: item.keyword });
        let roll = mix(item.seed + index);
        const random = () => ((roll = mix(roll)) / 4_294_967_296);
        for (const echo of ripple(this.seats, index, item.rank, tuning.wave, random)) this.pendingEchoes.push({ t: now + echo.delay, phone: echo.phone, item });
      }
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
    this.phones.forEach((_, index) => {
      this.pendingEchoes.push({ t: now + (index % 3) * 0.008, phone: index, item: { id: -1, slot: -1, fish: -1, page: -1, keyword: top, rank: 0.9, seed, at: Date.now() } });
    });
  }

  /** Where glass `index` is touched (pt; below the glass's 844 it is let go) and whether its goldfish is spent. */
  hand(index: number, out: { x: number; y: number; spent: boolean }) {
    return this.phones[index]!.hand(this.now, out);
  }

  /** One frame onto the bound sheet. */
  frame() {
    const time = performance.now();
    const dt = this.last ? (time - this.last) / 1000 : 0;
    this.last = time;
    const now = this.now;
    const t0 = performance.now();
    this.tiles.pump(4);
    const t1 = performance.now();
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
    const { data, count } = this.scene.pack();
    const t3 = performance.now();
    this.compositor.draw(now, data, count, [0, 0, 0]);
    const t4 = performance.now();
    const k = 0.05;
    this.cost.pump += (t1 - t0 - this.cost.pump) * k;
    this.cost.phones += (t2 - t1 - this.cost.phones) * k;
    this.cost.pack += (t3 - t2 - this.cost.pack) * k;
    this.cost.draw += (t4 - t3 - this.cost.draw) * k;
  }

  stats(): EngineStats {
    const showing: Record<string, number> = {};
    for (const phone of this.phones) showing[phone.showing] = (showing[phone.showing] ?? 0) + 1;
    return {
      quads: this.scene.size,
      strikesPerSec: Math.round((this.strikeTimes.length / 5) * 10) / 10,
      tiles: this.tiles.stats(),
      showing,
      surges: this.surges,
      cost: Object.fromEntries(Object.entries(this.cost).map(([key, value]) => [key, Math.round(value * 100) / 100])),
    };
  }

  dispose() {
    this.unsubscribe();
    for (const phone of this.phones) phone.dispose();
    this.tiles.dispose();
    this.compositor.dispose();
  }
}
