// The field: one canvas, every phone on it, one frame loop. Each frame:
// upload the tiles painted since the last (a few), let every phone decide
// what moves next, pack the quads if any changed, draw once. Strikes from
// the feed go to their phone at once, ripple to its neighbours, and, when
// the field surges, reach every phone together.

import type { FeedItem, FeedKeyword } from "@/components/transport/feed/1";
import { KEYWORDS } from "../content/keywords";
import { ripple, Surge, type Seat } from "../model/field";
import { fitPhoneGrid, phoneConfig } from "../model/layout";
import { personaFor } from "../model/persona";
import { mix } from "../model/random";
import type { Tuning } from "../model/tuning";
import { Compositor } from "../gl/renderer";
import { Tiles } from "../paint/tiles";
import { BEZEL, GLASS_RADIUS } from "./geometry";
import { subscribe, type FeedSource } from "./feed";
import { fishSpec, Phone, type Drive } from "./phone";
import type { AppId, Persona } from "../apps/types";
import { renderFishStrips } from "../objects/goldfish";
import { Scene } from "./scene";

/** Seat → slot: the screen's slots scattered over the grid (as pc/mobiles/1). */
function scatteredSlots(count: number) {
  const order = Array.from({ length: 64 }, (_, index) => index);
  let state = 0x9e3779b9;
  for (let index = order.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state ^ (state >>> 15), 0x2c1b3c6d) + 0x6d2b79f5) >>> 0;
    const other = state % (index + 1);
    [order[index], order[other]] = [order[other]!, order[index]!];
  }
  return order.slice(0, count);
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
  private slotToPhone = new Map<number, number>();
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

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly tuning: () => Tuning,
    source: FeedSource,
    private readonly options: EngineOptions = { mode: "field", seat: 0 },
  ) {
    const dpr = Math.min(window.devicePixelRatio || 1, tuning().dpr);
    // Atlas: 2048² layers; enough for the visible screens of every phone, twice over.
    this.compositor = new Compositor(canvas, 2048, 12, () => window.location.reload());
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
    const phones = mode === "field" ? this.tuning().phones : 1;
    const grid = fitPhoneGrid(width, height, phones);
    // hand: the glass is the page, as large as it fits; focus: one phone with its bezel, a margin around.
    const scale = mode === "hand" ? Math.min(width / 390, height / 844) : mode === "focus" ? Math.min((width * 0.9) / phoneConfig.phoneWidth, (height * 0.92) / phoneConfig.phoneHeight) : grid.width / phoneConfig.phoneWidth;
    this.compositor.resize(width * this.dpr, height * this.dpr);
    const key = `${phones}|${Math.round(scale * this.dpr * 40)}`;
    if (key !== this.builtFor) {
      this.builtFor = key;
      this.build(phones, scale * this.dpr);
    }
    const totalWidth = grid.columns * grid.width + (grid.columns - 1) * grid.gap;
    const rows = Math.ceil(phones / grid.columns);
    const totalHeight = rows * grid.height + (rows - 1) * grid.gap;
    const left = (width - totalWidth) / 2;
    const top = (height - totalHeight) / 2;
    this.seats = [];
    if (mode !== "field") {
      const phone = this.phones[0]!;
      const x = (width - 390 * scale) / 2;
      const y = (height - 844 * scale) / 2;
      this.placement = { x: x * this.dpr, y: y * this.dpr, scale: scale * this.dpr };
      this.seats.push({ column: 0, row: 0 });
      this.compositor.place(0, this.placement, mode === "hand" ? 0 : GLASS_RADIUS[phone.persona.os]);
      return;
    }
    this.phones.forEach((phone, index) => {
      const column = index % grid.columns;
      const row = Math.floor(index / grid.columns);
      this.seats.push({ column, row });
      const x = left + column * (grid.width + grid.gap) + BEZEL * scale;
      const y = top + row * (grid.height + grid.gap) + BEZEL * scale;
      this.compositor.place(index, { x: x * this.dpr, y: y * this.dpr, scale: scale * this.dpr }, GLASS_RADIUS[phone.persona.os]);
    });
  }

  private build(count: number, pxPerPt: number) {
    for (const phone of this.phones) phone.dispose();
    this.tiles?.dispose();
    const workers = Math.max(2, Math.min(4, (navigator.hardwareConcurrency || 4) - 2));
    // Tiles painted at the size they are shown (never above 2 px per pt).
    this.tiles = new Tiles(this.compositor, Math.min(2, Math.max(0.3, pxPerPt)), workers);
    this.scene = new Scene(this.compositor, this.tiles, count);
    // bubble/7's goldfish, its tail beat in frames, at the size a thumb is shown (≤ 160 px a frame: 12 fit a layer).
    const fishPx = Math.min(160, this.tiles.columnWidth, Math.max(48, Math.round(72 * pxPerPt * 1.3)));
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
      const seat = Math.max(0, Math.min(63, Math.round(this.options.seat)));
      this.slotToPhone = new Map([[scatteredSlots(64)[seat]!, 0]]);
      const persona = { ...personaFor(seat), ...this.options.persona };
      this.phones = [new Phone(this.scene, this.tiles, 0, persona, env, now, { drive: this.options.mode, bare: this.options.mode === "hand", app: this.options.app })];
      return;
    }
    const slots = scatteredSlots(count);
    this.slotToPhone = new Map(slots.map((slot, index) => [slot, index]));
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

  private receive(items: FeedItem[]) {
    const now = this.now;
    const tuning = this.tuning();
    for (const item of items) {
      const index = this.slotToPhone.get(item.slot);
      if (index === undefined) continue;
      this.phones[index]?.strike(item, now);
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
