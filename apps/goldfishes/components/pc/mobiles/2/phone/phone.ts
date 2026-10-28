// One phone: one goldfish's (NOTES 1023: Goldfish = 1 Mobile). It is always
// in use — flicking, swiping, liking, hopping apps — and every strike of the
// main screen's goldfish interrupts it with something you see at once: the
// device buzzes, a banner drops, the post is pushed into the feed and
// scrolled to, the island grows. The goldfish is the thumb, trapped on the
// glass. Too much stimulus, or too long on nothing new, and it dies: the
// screen dims and goes dark, as a phone left alone does; a new goldfish
// wakes it.
//
// Everything that moves is a group's motion (scene.ts); this class only
// decides what moves next. Times are seconds on the engine's clock.

import type { FeedItem } from "@/components/transport/feed/1";
import { APP_NAMES } from "../apps/icons";
import { APPS } from "../apps/registry";
import type { AppDef, AppId, ItemContext, ItemSpec, Persona } from "../apps/types";
import { eventFor } from "../content/events";
import { faceFor, photoFor } from "../content/media";
import { personFor } from "../content/people";
import { ui } from "../content/voice";
import { Dopamine } from "../model/field";
import { FISH_FRAMES } from "../objects/goldfish";
import { EASE } from "../model/motion";
import { hash01, mix, random, weighted, type Random } from "../model/random";
import type { Tuning } from "../model/tuning";
import type { Mode, TileSpec } from "../paint/types";
import type { Tile, Tiles } from "../paint/tiles";
import { BANNER, BEZEL, GLASS, GLASS_RADIUS, homeIcon, homeLayout } from "./geometry";
import { rgba, type Group, type Quad, type Scene } from "./scene";
import { AppView, LockView, PictureView, type Host, type View } from "./views";

type Banner = { group: Group; quad: Quad; h: number; leaving: boolean; app: AppDef; held: boolean };

/** Driven by hand: `focus`, one phone on a desktop (the goldfish takes it back after 12 s idle); `hand`, the page is the phone. */
export type Drive = "focus" | "hand";

export type PhoneOptions = { drive?: Drive; bare?: boolean; app?: AppId };

type Finger = { x0: number; y0: number; x: number; y: number; t: number; vx: number; vy: number; kind: "undecided" | "scroll" | "card" | "home" | "apps" | "none"; start: number; view: AppView | null };

export type PhoneEnv = {
  tuning(): Tuning;
  label(keyword: string): string;
  vocabulary(): readonly string[];
  clock(): { time: string; date: string };
  /** The main screen is sending strikes (no death while nothing feeds the field). */
  feeding(): boolean;
};

/** The goldfish strip of a palette, provided by the engine (objects/goldfish.ts). */
export function fishSpec(palette: string): TileSpec {
  return { painter: "main.goldfish", w: 72, h: palette === "spent" ? 72 : 72 * FISH_FRAMES, mode: "dark", lang: "en", data: { palette } };
}

const Z = { status: 9000, banner: 9100, hearts: 9400, island: 9500, thumb: 9800, ring: 9790, dim: 9900 } as const;

export class Phone implements Host {
  readonly root: Group;
  private readonly rng: Random;
  private views: View[] = [];
  private zNext = 100;
  private readonly scheduled: { t: number; fn: () => void }[] = [];
  private readonly banners: Banner[] = [];
  private readonly recent: string[] = [];
  private readonly dopamine: Dopamine;
  private state: "boot" | "alive" | "dying" | "dead" = "boot";
  private diedAt = 0;
  private busyUntil = 0;
  private nextAuto = 0;
  private nextHop = 0;
  private nextAd = 0;
  private statusQuad: Quad | null = null;
  private statusKey = "";
  private readonly thumb: Group;
  private thumbQuad: Quad | null = null;
  private spentQuad: Quad | null = null;
  /** The live fish and the spent one, cross-faded inside the thumb when it dies. */
  private readonly liveFish: Group;
  private readonly spentFish: Group;
  private readonly ring: Group;
  private readonly dim: Group;
  private readonly island: Group | null = null;
  private readonly islandContent: Group | null = null;
  private islandUntil = 0;
  private fills = 0;
  /** When this phone last answered a strike with something painted. */
  private lastAnswer = -Infinity;
  private bannerZ: number = Z.banner;
  /** Strikes this phone has taken (for the field's surge). */
  strikes = 0;

  constructor(
    readonly scene: Scene,
    readonly tiles: Tiles,
    readonly phone: number,
    readonly persona: Persona,
    private readonly env: PhoneEnv,
    now: number,
    private readonly options: PhoneOptions = {},
  ) {
    this.rng = random(persona.seed ^ 0x51ed);
    this.dopamine = new Dopamine(now);
    this.root = scene.root(phone);
    const radius = GLASS_RADIUS[persona.os];
    // The device: a bezel ring, black glass.
    if (!options.bare) scene.solid(phone, this.root, -BEZEL, -BEZEL, GLASS.w + BEZEL * 2, GLASS.h + BEZEL * 2, rgba(persona.os === "android" ? "#232326" : "#1b1b1d"), { z: -2, radius: radius + BEZEL, glass: false });
    if (!options.bare) scene.solid(phone, this.root, -1.2, -1.2, GLASS.w + 2.4, GLASS.h + 2.4, rgba("#3a3a3e"), { z: -1, radius: radius + 1.2, glass: false });
    scene.solid(phone, this.root, 0, 0, GLASS.w, GLASS.h, rgba("#000000"), { z: 0 });
    if (persona.os === "ios") {
      this.island = scene.group(phone, this.root);
      scene.set(this.island, {}, { x: GLASS.w / 2, y: 29 });
      scene.solid(phone, this.island, GLASS.w / 2 - 62, 11, 124, 36, rgba("#000000"), { z: Z.island, radius: 18 });
      this.islandContent = scene.group(phone, this.root);
      scene.set(this.islandContent, { opacity: 0 });
    } else scene.solid(phone, this.root, GLASS.w / 2 - 6.5, 13, 13, 13, rgba("#000000"), { z: Z.island, radius: 6.5 });

    this.thumb = scene.group(phone, this.root);
    scene.set(this.thumb, { x: GLASS.w * 0.72, y: GLASS.h + 80 });
    this.liveFish = scene.group(phone, this.thumb);
    this.spentFish = scene.group(phone, this.thumb);
    scene.set(this.spentFish, { opacity: 0 });
    this.ring = scene.group(phone, this.root);
    scene.set(this.ring, { opacity: 0 });
    scene.solid(phone, this.ring, -24, -24, 48, 48, [0.55, 0.55, 0.55, 0.55], { z: Z.ring, radius: 24 });
    this.dim = scene.group(phone, this.root);
    scene.set(this.dim, { opacity: 1 });
    scene.solid(phone, this.dim, -2, -2, GLASS.w + 4, GLASS.h + 4, rgba("#000000"), { z: Z.dim });
    tiles.request(fishSpec(persona.fish), { onReady: (tile) => this.setThumb(tile) });
    tiles.request(fishSpec("spent"), {
      onReady: (tile) => {
        if (!tile.failed) this.spentQuad = this.scene.tile(this.phone, this.spentFish, tile, 0, 0, { z: Z.thumb + 1, w: 72, h: 72 });
        this.retune();
      },
    });

    this.boot();
  }

  /** The first app, shown when painted, the screen turning on. */
  private boot() {
    const scene = this.scene;
    const first = this.open(this.favourite());
    first.whenReady(() => {
      const t = this.clock;
      first.shown = true;
      scene.set(first.group, {});
      scene.glide(this.dim, t, 0.6, EASE.out, { opacity: 0 });
      this.state = "alive";
      this.dopamine.reset(t);
      this.thumbHome(t + 0.2);
      this.nextAuto = t + 0.6 + this.rng() * 0.6;
      this.nextHop = t + this.hopDelay();
      this.nextAd = t + this.adDelay();
    });
  }

  // ——— Host ———

  private clockAt = 0;
  get clock() {
    return this.clockAt;
  }

  context(keyword: string, fresh: boolean, seed?: number): ItemContext {
    // Ambient content repeats across the field (12 variants a keyword, per
    // language and mode): the same ready-made, many phones (Warhol).
    const base = seed ?? mix(hash01(keyword.length, keyword.charCodeAt(0), keyword.charCodeAt(keyword.length - 1), this.fills++ % 12) * 4e9);
    const rng = random(base);
    const lang = this.persona.lang;
    return {
      event: eventFor(keyword, this.env.label(keyword), base),
      label: this.env.label(keyword),
      keyword,
      rng,
      lang,
      mode: this.persona.mode,
      persona: this.persona,
      photo: (kind = "any") => photoFor(keyword, rng, kind),
      face: () => faceFor(rng),
      person: () => personFor(lang, rng),
      fresh,
    };
  }

  ambientKeyword() {
    if (this.recent.length && this.rng.chance(0.75)) return this.rng.pick(this.recent);
    const vocabulary = this.env.vocabulary();
    return vocabulary.length ? this.rng.pick(vocabulary) : "sparkle";
  }

  spec(item: ItemSpec, mode: Mode, w: number = GLASS.w): TileSpec {
    return { painter: item.painter, w: item.w ?? w, h: item.h, data: item.data, mode, lang: this.persona.lang, os: this.persona.os };
  }

  // ——— time ———

  private at(t: number, fn: () => void) {
    this.scheduled.push({ t, fn });
  }

  private get tempo() {
    return this.persona.tempo * this.env.tuning().speed * (1 + Math.min(0.6, this.dopamine.level(this.clock) / 30));
  }

  private hopDelay() {
    return (this.env.tuning().hop * this.rng.range(0.55, 1.45)) / Math.max(0.2, this.persona.tempo * this.env.tuning().speed);
  }

  private adDelay() {
    const perMinute = this.env.tuning().ads;
    return perMinute <= 0 ? Infinity : -Math.log(1 - this.rng()) * (60 / perMinute);
  }

  /** The top view on the glass. */
  private get current(): View | undefined {
    let top: View | undefined;
    for (const view of this.views) if (view.shown && !view.closing && (!top || view.z > top.z)) top = view;
    return top;
  }

  private get currentApp(): AppView | null {
    const view = this.current;
    return view instanceof AppView ? view : null;
  }

  // ——— the frame ———

  update(now: number) {
    this.clockAt = now;
    for (let index = 0; index < this.scheduled.length; ) {
      const job = this.scheduled[index]!;
      if (job.t <= now) {
        this.scheduled.splice(index, 1);
        job.fn();
      } else index += 1;
    }
    for (const view of this.views) view.step?.(now);
    if (this.state === "alive") for (const view of this.views) if (!view.shown && !view.ready && now - view.born > 4) this.close(view, now);
    if (this.state === "boot" && this.views.length === 0) this.boot();
    this.updateStatus();
    if (this.state !== "alive" || this.driving) return;
    const tuning = this.env.tuning();
    if (tuning.death !== "off" && this.env.feeding()) {
      const verdict = this.dopamine.verdict(now, tuning.overdose, tuning.stillness);
      if (verdict) {
        this.die(now);
        return;
      }
    }
    if (now < this.busyUntil || now < this.nextAuto) return;
    if (now >= this.nextAd) {
      this.nextAd = now + this.adDelay();
      if (this.showAd(now)) return;
    }
    if (now >= this.nextHop) {
      this.nextHop = now + this.hopDelay();
      if (this.hop(now)) return;
    }
    this.autopilot(now);
  }

  private updateStatus() {
    const view = this.current;
    if (!view || !view.ready) return;
    const { time } = this.env.clock();
    const key = `${view.tone}|${time}`;
    if (key === this.statusKey) return;
    this.statusKey = key;
    const tile = this.tiles.request({ painter: "system.status", w: GLASS.w, h: 54, mode: "dark", lang: "en", os: this.persona.os, data: { time, tone: view.tone, battery: 0.35 + (this.persona.seed % 60) / 100 } }, { urgent: true });
    this.tiles.whenReady(tile).then((ready) => {
      if (ready.failed || this.statusKey !== key) return;
      if (this.statusQuad) this.scene.update(this.statusQuad, { tile: ready, h: ready.h });
      else this.statusQuad = this.scene.tile(this.phone, this.root, ready, 0, 0, { z: Z.status });
    });
  }

  // ——— the thumb ———

  private setThumb(tile: Tile) {
    if (tile.failed) return;
    const size = 72 * this.env.tuning().thumbSize;
    this.thumbQuad = this.scene.tile(this.phone, this.liveFish, tile, -size / 2, -size * 0.32, { z: Z.thumb, w: size, h: size, frames: FISH_FRAMES, opacity: this.env.tuning().thumb ? 1 : 0 });
  }

  /** Re-reads the thumb's on/off and size. */
  retune() {
    const size = 72 * this.env.tuning().thumbSize;
    const opacity = this.env.tuning().thumb ? 1 : 0;
    for (const quad of [this.thumbQuad, this.spentQuad]) if (quad) this.scene.update(quad, { w: size, h: size, x: -size / 2, y: -size * 0.32, opacity });
  }

  /** Swims the thumb to a point, heading along its way; returns when it arrives. */
  private swim(now: number, x: number, y: number, speed = 1) {
    const from = this.scene.pose(this.thumb, now);
    const dx = x - from.x;
    const dy = y - from.y;
    const distance = Math.hypot(dx, dy);
    const duration = Math.min(0.42, 0.1 + distance / 2600) / (this.tempo * speed);
    let rot = from.rot;
    if (distance > 12) {
      const heading = Math.atan2(dy, dx) + Math.PI / 2;
      rot = from.rot + Math.atan2(Math.sin(heading - from.rot), Math.cos(heading - from.rot));
    }
    this.scene.glide(this.thumb, now, duration, EASE.inOut, { x, y, rot });
    return now + duration;
  }

  private thumbHome(now: number) {
    this.swim(now, GLASS.w * this.rng.range(0.55, 0.8), GLASS.h * this.rng.range(0.62, 0.78), 0.6);
  }

  /** The thumb taps a point: swims there, a ripple where it touches. Returns the moment of touch. */
  private tap(now: number, x: number, y: number) {
    const touch = this.swim(now, x, y);
    this.at(touch, () => {
      this.scene.set(this.ring, { x, y, sx: 0.35, sy: 0.35, opacity: 0.9 });
      this.scene.glide(this.ring, touch, 0.36, EASE.out, { sx: 1.5, sy: 1.5, opacity: 0 });
    });
    return touch;
  }

  /** The thumb drags along a path (a flick, a swipe), touching down at its start. */
  private drag(now: number, x0: number, y0: number, x1: number, y1: number, duration: number) {
    const down = this.swim(now, x0, y0, 1.6);
    this.at(down, () => this.scene.glide(this.thumb, down, duration, EASE.out, { x: x1, y: y1, rot: this.scene.pose(this.thumb, down).rot }));
    return down;
  }

  // ——— gestures ———

  private autopilot(now: number) {
    const view = this.currentApp;
    if (!view || !view.ready) {
      // Left on the home screen by a visitor: the goldfish opens something again.
      if (this.current && this.current === this.homeView && !this.pendingView) this.openFromIcon(now, this.pickApp().id);
      this.nextAuto = now + 0.3;
      return;
    }
    const tempo = this.tempo;
    const kind = view.app.kind;
    if (kind === "feed") {
      if (this.rng.chance(0.24)) {
        const spot = view.hotspot(now, "like");
        if (spot) {
          const touch = this.tap(now, spot.x, spot.y);
          this.at(touch, () => this.hearts(touch, spot.x, spot.y, 4 + this.rng.int(4)));
          this.nextAuto = touch + this.rng.range(0.12, 0.35) / tempo;
          return;
        }
      }
      const duration = this.rng.range(0.55, 1.15) / tempo;
      const distance = this.rng.range(260, 720) * Math.min(1.6, tempo);
      const x = GLASS.w * this.rng.range(0.4, 0.75);
      const down = this.drag(now, x, view.bottomEdge - 90, x + this.rng.range(-30, 30), view.bottomEdge - 90 - Math.min(380, distance * 0.6), 0.16 / tempo);
      this.at(down, () => {
        if (!view.flick(down, distance, duration)) this.thumbHome(down + 0.2);
      });
      this.nextAuto = down + duration * this.rng.range(0.45, 0.8);
      return;
    }
    if (kind === "pager") {
      if (this.rng.chance(0.22)) {
        const x = GLASS.w * this.rng.range(0.35, 0.65);
        const y = GLASS.h * this.rng.range(0.35, 0.55);
        const touch = this.tap(now, x, y);
        this.at(touch, () => this.bigHeart(touch, x, y));
        this.nextAuto = touch + 0.3 / tempo;
        return;
      }
      const down = this.drag(now, GLASS.w * 0.55, GLASS.h * 0.72, GLASS.w * 0.58, GLASS.h * 0.32, 0.18 / tempo);
      this.at(down, () => view.advance(down, 0.42 / tempo));
      this.nextAuto = down + this.rng.range(0.9, 2.2) / tempo;
      return;
    }
    if (kind === "stack") {
      const right = this.rng.chance(0.62);
      const down = this.drag(now, GLASS.w / 2, GLASS.h * 0.48, GLASS.w / 2 + (right ? 160 : -160), GLASS.h * 0.44, 0.24 / tempo);
      this.at(down, () => view.swipe(down, 0.34 / tempo, right));
      this.nextAuto = down + this.rng.range(0.55, 1.3) / tempo;
      return;
    }
    // chat
    view.advance(now, 0.3);
    if (this.rng.chance(0.3)) {
      const spot = view.hotspot(now, "like");
      if (spot) {
        const touch = this.tap(now, spot.x, spot.y);
        this.at(touch, () => this.hearts(touch, spot.x, spot.y, 3));
      }
    } else this.swim(now, GLASS.w * this.rng.range(0.3, 0.8), GLASS.h - 70, 0.5);
    this.nextAuto = now + this.rng.range(0.55, 1.3) / tempo;
  }

  private hearts(now: number, x: number, y: number, n: number) {
    this.tiles.request({ painter: "system.heart", w: 48, h: 48, mode: "dark", lang: "en", data: { color: "#ff2d55" } }, {
      onReady: (tile) => {
        if (tile.failed) return;
        for (let index = 0; index < n; index += 1) {
          if (this.scene.groupsLeft(this.phone) < 12) return;
          const group = this.scene.group(this.phone, this.root);
          const quad = this.scene.tile(this.phone, group, tile, -24, -24, { z: Z.hearts + index });
          const scale = this.rng.range(0.5, 0.9);
          this.scene.set(group, { x, y, sx: 0.2, sy: 0.2, rot: this.rng.range(-0.3, 0.3) });
          const life = this.rng.range(0.7, 1.05);
          this.scene.glide(group, now, life, EASE.out, { x: x + this.rng.range(-70, 70), y: y - this.rng.range(110, 260), sx: scale, sy: scale, rot: this.rng.range(-0.6, 0.6), opacity: 0 });
          this.at(now + life + 0.02, () => {
            this.scene.remove(quad);
            this.scene.freeGroup(this.phone, group);
          });
        }
      },
    });
  }

  private bigHeart(now: number, x: number, y: number) {
    this.tiles.request({ painter: "system.heart", w: 48, h: 48, mode: "dark", lang: "en", data: { color: "#ff2d55" } }, {
      onReady: (tile) => {
        if (tile.failed || this.scene.groupsLeft(this.phone) < 12) return;
        const group = this.scene.group(this.phone, this.root);
        const quad = this.scene.tile(this.phone, group, tile, -24, -24, { z: Z.hearts + 9 });
        this.scene.set(group, { x, y, sx: 0.4, sy: 0.4, rot: this.rng.range(-0.25, 0.25) });
        this.scene.glide(group, now, 0.35, EASE.spring, { sx: 2.6, sy: 2.6 });
        this.at(now + 0.5, () => this.scene.glide(group, now + 0.5, 0.35, EASE.in, { y: y - 160, sx: 1.2, sy: 1.2, opacity: 0 }));
        this.at(now + 0.9, () => {
          this.scene.remove(quad);
          this.scene.freeGroup(this.phone, group);
        });
        this.hearts(now, x, y, 3);
      },
    });
  }

  /** The device buzzes: a notification's haptic, felt as a shiver of the whole phone. */
  private buzz(now: number, strength: number) {
    const amount = 1.2 + strength * 2.2;
    this.scene.set(this.root, { x: amount, rot: amount * 0.0018 }, { x: GLASS.w / 2, y: GLASS.h / 2 });
    this.scene.glide(this.root, now, 0.32, EASE.spring, { x: 0, rot: 0 });
  }

  // ——— views ———

  private favourite(): AppDef {
    return APPS[this.options.app ?? this.persona.apps[0]!];
  }

  private pickApp(except?: AppId): AppDef {
    const weights = Object.fromEntries(this.persona.apps.filter((app) => app !== except).map((app, index) => [app, 1 / (1 + index * 0.35)])) as Record<AppId, number>;
    return APPS[weighted(this.rng(), weights)];
  }

  /** Builds an app's view hidden on top, to be shown by a transition once painted. */
  private get roomy() {
    return this.scene.groupsLeft(this.phone) > 16;
  }

  private open(app: AppDef): AppView {
    this.recentApps = [...this.recentApps.filter((id) => id !== app.id), app.id].slice(-8);
    const view = new AppView(this, (this.zNext += 100), app);
    this.scene.set(view.group, { opacity: 0 });
    this.views.push(view);
    return view;
  }

  private picture(spec: Omit<TileSpec, "w" | "h" | "lang" | "os"> & { mode?: Mode }, tone: "light" | "dark", background?: string, Kind: typeof PictureView = PictureView) {
    const view = new Kind(this, (this.zNext += 100), { w: GLASS.w, h: GLASS.h, lang: this.persona.lang, os: this.persona.os, mode: spec.mode ?? this.persona.mode, painter: spec.painter, data: spec.data }, tone, background);
    this.scene.set(view.group, { opacity: 0 });
    this.views.push(view);
    return view;
  }

  private close(view: View, at: number) {
    if (view.closing) return;
    view.closing = true;
    this.at(at, () => {
      view.dispose();
      this.views = this.views.filter((each) => each !== view);
    });
  }

  /** Removes every view under `keep` that is no longer seen. */
  private closeUnder(keep: View, at: number) {
    for (const view of this.views) if (view !== keep && view.z < keep.z && view.shown) this.close(view, at);
  }

  /** A view still being painted: no other is opened meanwhile. */
  private get pendingView() {
    return this.views.some((view) => !view.shown);
  }

  private hop(now: number) {
    const from = this.currentApp;
    if (!from || !from.ready || this.pendingView || !this.roomy) return false;
    const tuning = this.env.tuning();
    const style = weighted(this.rng(), { banner: tuning.viaBanner, swipe: tuning.viaSwipe, switcher: tuning.viaSwitcher, home: tuning.viaHome });
    const app = this.pickApp(from.app.id);
    if (style === "banner") {
      const keyword = this.ambientKeyword();
      this.notify(now, keyword, app, 0.5, true);
      return true;
    }
    const to = this.open(app);
    this.busyUntil = now + 2.4;
    to.whenReady(() => {
      const t = this.clock;
      if (style === "swipe") this.swipeTo(t, from, to);
      else if (style === "switcher") this.switcherTo(t, from, to);
      else this.homeTo(t, from, to);
    });
    return true;
  }

  private settle(view: View, at: number) {
    this.busyUntil = Math.max(this.busyUntil, at);
    this.at(at, () => {
      this.busyUntil = Math.min(this.busyUntil, this.clock);
      this.nextAuto = this.clock + 0.1;
    });
    this.closeUnder(view, at + 0.05);
  }

  /** Along the home bar: `dir` −1 sends the old app left (the next one comes from the right), +1 the other way. */
  private swipeTo(now: number, from: View, to: View, dir = -1, byHand = false) {
    to.shown = true;
    const d = 0.46 / this.tempo;
    const scene = this.scene;
    const down = byHand ? now : this.drag(now, GLASS.w * 0.82, GLASS.h - 14, GLASS.w * 0.12, GLASS.h - 22, d * 0.8);
    scene.set(to.group, { x: -dir * (GLASS.w + 12) });
    scene.glide(to.group, down, d, EASE.out, { x: 0 });
    scene.glide(from.group, down, d, EASE.out, { x: dir * (GLASS.w + 12) });
    this.settle(to, down + d);
  }

  private switcherTo(now: number, from: View, to: View) {
    to.shown = true;
    const scene = this.scene;
    const k = 0.62;
    const step = 0.34 / this.tempo;
    const centre = { x: GLASS.w / 2, y: GLASS.h / 2 };
    const down = this.drag(now, GLASS.w / 2, GLASS.h - 10, GLASS.w / 2, GLASS.h * 0.62, step);
    scene.glide(from.group, down, step, EASE.out, { sx: k, sy: k, y: -10 }, centre);
    scene.set(to.group, { x: GLASS.w * 1.3, sx: k, sy: k, y: -10 }, centre);
    scene.glide(to.group, down, step, EASE.out, { x: GLASS.w * 0.66 });
    const slide = down + step + 0.12 / this.tempo;
    this.at(slide, () => {
      this.drag(slide - 0.05, GLASS.w * 0.85, GLASS.h * 0.5, GLASS.w * 0.2, GLASS.h * 0.5, step);
      scene.glide(from.group, slide, step, EASE.out, { x: -GLASS.w * 0.66 });
      scene.glide(to.group, slide, step, EASE.out, { x: 0 });
    });
    const pick = slide + step + 0.1 / this.tempo;
    this.at(pick, () => {
      this.tap(pick - 0.12, GLASS.w / 2, GLASS.h / 2);
      scene.glide(to.group, pick, 0.42 / this.tempo, EASE.snap, { sx: 1, sy: 1, y: 0 });
      scene.glide(from.group, pick, 0.42 / this.tempo, EASE.out, { x: -GLASS.w * 1.4 });
    });
    this.settle(to, pick + 0.45 / this.tempo);
  }

  private iconOf(app: AppId) {
    return homeIcon(this.persona.apps, app);
  }

  private homeTo(now: number, from: AppView, to: AppView) {
    const scene = this.scene;
    const home = this.picture({ painter: "system.home", mode: "dark", data: { hue: this.persona.hue, apps: this.persona.apps, badges: [...homeLayout(this.persona.apps).grid, ...homeLayout(this.persona.apps).dock].map((_, index) => (hash01(this.persona.seed, index) < 0.45 ? 1 + Math.floor(hash01(index, this.persona.seed) * 140) : 0)) } }, "light", "#000000");
    // Home goes under the app being left, the app being opened above both.
    home.restack(from.z - 50);
    this.views = [home, ...this.views.filter((view) => view !== home)];
    home.whenReady(() => {
      const t = this.clock;
      home.shown = true;
      const d = 0.4 / this.tempo;
      const down = this.drag(t, GLASS.w / 2, GLASS.h - 10, GLASS.w / 2, GLASS.h * 0.7, d * 0.6);
      const icon = this.iconOf(from.app.id);
      scene.set(home.group, { sx: 1.12, sy: 1.12 }, { x: GLASS.w / 2, y: GLASS.h / 2 });
      scene.glide(home.group, down, d, EASE.out, { sx: 1, sy: 1 });
      scene.glide(from.group, down, d, EASE.out, { x: icon.x, y: icon.y, sx: icon.size / GLASS.w, sy: icon.size / GLASS.h, opacity: 0.2 }, { x: 0, y: 0 });
      this.close(from, down + d);
      const target = this.iconOf(to.app.id);
      const touch = this.tap(down + d + 0.05, target.x + target.size / 2, target.y + target.size / 2);
      this.at(touch, () => {
        to.shown = true;
        scene.set(to.group, { x: target.x, y: target.y, sx: target.size / GLASS.w, sy: target.size / GLASS.h }, { x: 0, y: 0 });
        scene.glide(to.group, touch, 0.5 / this.tempo, EASE.snap, { x: 0, y: 0, sx: 1, sy: 1 });
        this.settle(to, touch + 0.5 / this.tempo);
      });
    });
  }

  /** Opens `to` out of the banner's rect; the banner is absorbed into it. */
  private bannerTo(now: number, banner: Banner, to: View) {
    const scene = this.scene;
    const from = this.current;
    const pose = scene.pose(banner.group, now);
    const touch = this.tap(now, BANNER.x + BANNER.w * 0.45, pose.y + banner.h / 2);
    this.at(touch, () => {
      if (to.z < (this.current?.z ?? 0)) to.restack((this.zNext += 100));
      to.shown = true;
      const top = scene.pose(banner.group, touch).y;
      scene.set(to.group, { x: BANNER.x, y: top, sx: BANNER.w / GLASS.w, sy: banner.h / GLASS.h }, { x: 0, y: 0 });
      const d = 0.5 / this.tempo;
      scene.glide(to.group, touch, d, EASE.snap, { x: 0, y: 0, sx: 1, sy: 1 });
      this.leaveBanner(banner, touch, 0.16, true);
      if (from && from !== to) scene.glide(from.group, touch, d, EASE.out, { sx: 0.93, sy: 0.93 }, { x: GLASS.w / 2, y: GLASS.h / 2 });
      this.settle(to, touch + d);
    });
  }

  // ——— notifications ———

  private notify(now: number, keyword: string, app: AppDef, rank: number, open: boolean, seed?: number) {
    const ctx = this.context(keyword, true, seed);
    const { title, body } = app.notify(ctx);
    const face = app.id === "messages" || app.id === "tinder" ? ctx.face() : undefined;
    const spec: TileSpec = { painter: "system.banner", w: BANNER.w, mode: this.persona.mode, lang: this.persona.lang, os: this.persona.os, data: { app: app.id, title: title || APP_NAMES[app.id], body, time: ui(this.persona.lang).now, ...(face ? { face } : {}) } };
    const target = open ? this.open(app) : null;
    if (target) this.busyUntil = now + 3;
    this.tiles.request(spec, {
      urgent: true,
      onReady: (tile) => {
        if (tile.failed) return;
        const t = this.clock;
        if (this.current instanceof LockView) {
          (this.current as LockView).push(tile, t);
          if (target) this.close(target, t);
          return;
        }
        const banner = this.drop(t, tile, app);
        const hold = (0.55 + rank * 0.5) / this.tempo;
        if (target) {
          const go = () => {
            const at = this.clock;
            if (!target.ready || banner.leaving || this.state !== "alive") {
              this.close(target, at);
              this.busyUntil = Math.min(this.busyUntil, at);
              return;
            }
            this.bannerTo(at, banner, target);
          };
          this.at(t + hold, () => (target.ready ? go() : target.whenReady(() => (this.clock - t < hold + 0.9 ? go() : this.close(target, this.clock)))));
        } else this.at(t + hold + 0.9 / this.tempo, () => this.leaveBanner(banner, this.clock, 0.32));
      },
    });
  }

  private drop(now: number, tile: Tile, app: AppDef): Banner {
    const scene = this.scene;
    // Older banners sink behind, as iOS stacks them.
    this.banners.forEach((banner, index) => {
      if (banner.leaving) return;
      const depth = index + 1;
      scene.glide(banner.group, now, 0.4, EASE.out, { y: BANNER.y + depth * 9, sx: 1 - depth * 0.045, sy: 1 - depth * 0.045 }, { x: GLASS.w / 2, y: 0 });
      if (depth >= 3) this.leaveBanner(banner, now + 0.1, 0.3);
    });
    const group = scene.group(this.phone, this.root);
    scene.set(group, { y: -tile.h - 30 }, { x: GLASS.w / 2, y: 0 });
    scene.glide(group, now, 0.55, EASE.spring, { y: BANNER.y });
    const quad = scene.tile(this.phone, group, tile, BANNER.x, 0, { z: (this.bannerZ += 1) });
    const banner: Banner = { group, quad, h: tile.h, leaving: false, app, held: false };
    this.banners.unshift(banner);
    return banner;
  }

  private leaveBanner(banner: Banner, now: number, duration: number, absorbed = false) {
    if (banner.leaving || (banner.held && !absorbed)) return;
    banner.leaving = true;
    if (absorbed) this.scene.glide(banner.group, now, duration, EASE.out, { opacity: 0, sy: 1.6 });
    else this.scene.glide(banner.group, now, duration, EASE.in, { y: -banner.h - 40 });
    this.at(now + duration + 0.02, () => {
      this.scene.remove(banner.quad);
      this.scene.freeGroup(this.phone, banner.group);
      const at = this.banners.indexOf(banner);
      if (at >= 0) this.banners.splice(at, 1);
    });
  }

  /** The Dynamic Island grows into a live activity for a strong strike. */
  private live(now: number, keyword: string, app: AppId) {
    if (!this.island || !this.islandContent || now < this.islandUntil) return;
    const scene = this.scene;
    const up = this.rng.chance(0.7);
    const value = `${up ? "+" : "−"}${(this.rng.range(2, 48) + this.rng()).toFixed(1)}%`;
    this.tiles.request({ painter: "system.live", w: 352, h: 58, mode: "dark", lang: this.persona.lang, data: { app, label: this.env.label(keyword), value, up } }, {
      urgent: true,
      onReady: (tile) => {
        if (tile.failed) return;
        const t = this.clock;
        this.islandUntil = t + 3;
        const quad = scene.tile(this.phone, this.islandContent!, tile, (GLASS.w - 352) / 2, 0, { z: Z.island + 1 });
        scene.glide(this.island!, t, 0.5, EASE.spring, { sx: 352 / 124, sy: 58 / 36 });
        scene.set(this.islandContent!, { opacity: 0, y: 0 });
        scene.glide(this.islandContent!, t + 0.16, 0.18, EASE.out, { opacity: 1 });
        const hold = t + 2.1;
        this.at(hold, () => {
          scene.glide(this.islandContent!, hold, 0.12, EASE.out, { opacity: 0 });
          scene.glide(this.island!, hold + 0.05, 0.42, EASE.snap, { sx: 1, sy: 1 });
        });
        this.at(hold + 0.2, () => scene.remove(quad));
      },
    });
  }

  // ——— strikes ———

  /** The main screen's goldfish has reached a bubble: `echo` when it is a neighbour's ripple. */
  strike(item: FeedItem, now: number, echo = false) {
    if (this.state === "dead") {
      if (!echo && now - this.diedAt >= this.env.tuning().rest) this.wake(now, item);
      return;
    }
    if (this.state !== "alive") return;
    this.strikes += 1;
    if (!this.recent.includes(item.keyword)) {
      this.recent.push(item.keyword);
      if (this.recent.length > 6) this.recent.shift();
    }
    if (!echo) this.dopamine.strike(item.keyword, now);
    this.buzz(now, echo ? 0.2 : item.rank);
    // Strikes come faster than a hand can answer them: between answers they are
    // felt (the buzz) and counted (dopamine), not painted.
    if (now - this.lastAnswer < 1.1 / this.tempo) return;
    // When painting falls behind, strikes are felt, not painted: the feeds come first.
    if (this.tiles.backlog > 90) return;
    this.lastAnswer = now;
    // Content repeats: six variants of each keyword's event (tiles are shared).
    item = { ...item, seed: mix(item.seed % 6) };
    if (this.driving) {
      // In a hand, strikes arrive as notifications only: the feed never jumps under a finger.
      this.notify(now, item.keyword, this.pickApp(this.currentApp?.app.id), item.rank, false, item.seed);
      return;
    }
    const current = this.currentApp;
    const busy = now < this.busyUntil || this.pendingView;
    if (!echo && current?.ready && !busy && this.rng.chance(0.42)) {
      // Into this very app: the post is pushed just below, and scrolled to.
      const ctx = this.context(item.keyword, true, item.seed);
      const spec = this.spec(current.app.item(ctx), current.mode);
      this.busyUntil = now + 1.2;
      current.insert(spec, now, (y) => {
        const t = this.clock;
        const kind = current.app.kind;
        if (kind === "stack") {
          current.swipe(t, 0.3 / this.tempo, true);
        } else if (kind !== "chat") {
          const d = (kind === "pager" ? 0.4 : 0.7) / this.tempo;
          const x = GLASS.w * 0.6;
          const down = this.drag(t, x, current.bottomEdge - 80, x, current.bottomEdge - 380, 0.14);
          this.at(down, () => current.bring(down, y, d));
          this.at(down + d * 0.9, () => {
            const spot = current.hotspot(this.clock, "like");
            if (spot) {
              const touch = this.tap(this.clock, spot.x, spot.y);
              this.at(touch, () => this.hearts(touch, spot.x, spot.y, 5 + Math.round(item.rank * 4)));
            }
          });
        }
        this.busyUntil = Math.min(this.busyUntil, t + 0.9);
      });
    } else {
      const app = this.rng.chance(0.3) && current ? current.app : this.pickApp(current?.app.id);
      const open = !echo && !busy && this.roomy && this.rng.chance(this.env.tuning().open);
      this.notify(now, item.keyword, app, item.rank, open, item.seed);
    }
    if (!echo && item.rank > 0.72 && this.rng.chance(0.45)) this.live(now, item.keyword, this.pickApp().id);
  }

  // ——— ads and checkouts ———

  private showAd(now: number) {
    const from = this.currentApp;
    if (!from?.ready || this.pendingView || !this.roomy) return false;
    const keyword = this.ambientKeyword();
    const ctx = this.context(keyword, false);
    const words = ui(this.persona.lang);
    const ad = this.picture(
      { painter: "system.ad", mode: "dark", data: { photo: ctx.photo("object"), brand: ctx.event.org, headline: ctx.event.headline, cta: words.shopNow, accent: this.rng.pick(["#ff2d7a", "#00e0c6", "#ffe600", "#3d7bff", "#ff8a00"]), skip: words.skip, ad: words.ad } },
      "light",
    );
    this.busyUntil = now + 5;
    ad.whenReady(() => {
      const t = this.clock;
      ad.shown = true;
      const scene = this.scene;
      scene.set(ad.group, { y: GLASS.h });
      scene.glide(ad.group, t, 0.5 / this.tempo, EASE.snap, { y: 0 });
      const hold = t + this.rng.range(1.4, 2.6) / this.tempo;
      const buy = this.rng.chance(0.4);
      const spot = ad.hotspots[buy ? 0 : 1] ?? { x: GLASS.w - 74, y: 79 };
      this.swim(t + 0.5, spot.x + 30, spot.y + 60, 0.5);
      this.at(hold, () => {
        const touch = this.tap(hold, spot.x, spot.y);
        this.at(touch, () => {
          scene.glide(ad.group, touch, 0.36 / this.tempo, EASE.in, { y: GLASS.h });
          this.close(ad, touch + 0.4 / this.tempo);
          if (buy) this.checkout(touch + 0.2, keyword);
          else this.settle(from, touch + 0.36 / this.tempo);
        });
      });
    });
    return true;
  }

  /** The pay sheet rises over the deals app, Face ID, gone: a purchase. */
  private checkout(now: number, keyword: string) {
    const shop = this.open(APPS.shop);
    shop.whenReady(() => {
      const t = Math.max(now, this.clock);
      shop.shown = true;
      const scene = this.scene;
      scene.set(shop.group, { y: GLASS.h });
      scene.glide(shop.group, t, 0.45 / this.tempo, EASE.snap, { y: 0 });
      const ctx = this.context(keyword, true);
      const words = ui(this.persona.lang);
      const price = `${this.persona.lang === "ko" ? "₩" : this.persona.lang === "ja" ? "¥" : this.persona.lang === "es" ? "€" : "$"}${(this.rng.range(9, 499) * (this.persona.lang === "ko" ? 1300 : this.persona.lang === "ja" ? 150 : 1)).toFixed(0)}`;
      this.tiles.request({ painter: "system.sheet", w: GLASS.w, h: 420, mode: this.persona.mode, lang: this.persona.lang, os: this.persona.os, data: { item: ctx.event.headline, price, photo: ctx.photo("object"), title: ctx.event.org, pay: words.pay, total: words.total } }, {
        urgent: true,
        onReady: (tile) => {
          if (tile.failed) return;
          const s = this.clock + 0.35;
          const group = scene.group(this.phone, this.root);
          const quad = scene.tile(this.phone, group, tile, 0, GLASS.h - 420, { z: shop.z + 90, radius: 0 });
          scene.set(group, { y: 460 });
          scene.glide(group, s, 0.5 / this.tempo, EASE.spring, { y: 0 });
          const confirm = this.tap(s + 0.6 / this.tempo, GLASS.w / 2, GLASS.h - 420 + 334);
          this.at(confirm + 0.5, () => scene.glide(group, confirm + 0.5, 0.38, EASE.in, { y: 460 }));
          this.at(confirm + 0.95, () => {
            scene.remove(quad);
            scene.freeGroup(this.phone, group);
          });
          this.settle(shop, confirm + 0.9);
        },
      });
    });
  }

  // ——— death and waking ———

  private die(now: number) {
    const death = this.env.tuning().death;
    if (death === "limit") {
      this.limit(now);
      return;
    }
    this.state = "dying";
    for (const banner of [...this.banners]) this.leaveBanner(banner, now, 0.3);
    const scene = this.scene;
    // The thumb lets go, as bubble/7's fish do when spent: it greys, rolls onto its side, its tail still, and sinks off the glass.
    scene.glide(this.liveFish, now, 0.8, EASE.inOut, { opacity: 0 });
    scene.glide(this.spentFish, now, 0.8, EASE.inOut, { opacity: 1 });
    const pose = scene.pose(this.thumb, now);
    scene.glide(this.thumb, now, 2.6, EASE.in, { y: GLASS.h + 120, x: pose.x + this.rng.range(-40, 40), rot: pose.rot + this.rng.range(-0.8, 0.8) });
    // The screen dims, as an untouched phone's does, then goes dark.
    scene.glide(this.dim, now + 0.4, 1.1, EASE.out, { opacity: 0.6 });
    const off = now + 2.6;
    this.at(off, () => scene.glide(this.dim, off, 0.32, EASE.in, { opacity: 1 }));
    this.at(off + 0.34, () => {
      this.state = "dead";
      this.diedAt = this.clock;
    });
  }

  /** NOTES 1023's death made bearable: the limit sheet rises, the goldfish ignores it. */
  private limit(now: number) {
    const words = ui(this.persona.lang);
    const app = this.currentApp?.app.id ?? this.persona.apps[0]!;
    const sheet = this.picture({ painter: "system.limit", mode: "dark", data: { app, title: words.limitTitle, body: words.limitBody, ignore: words.ignore, ok: words.ok } }, "light", "#1c1c1e");
    this.busyUntil = now + 4;
    this.dopamine.reset(now);
    sheet.whenReady(() => {
      const t = this.clock;
      sheet.shown = true;
      const scene = this.scene;
      scene.set(sheet.group, { y: GLASS.h });
      scene.glide(sheet.group, t, 0.55, EASE.snap, { y: 0 });
      const spot = sheet.hotspots[0] ?? { x: GLASS.w / 2, y: GLASS.h - 90 };
      const touch = this.tap(t + 1.5, spot.x, spot.y);
      this.at(touch + 0.1, () => {
        scene.glide(sheet.group, touch + 0.1, 0.4, EASE.in, { y: GLASS.h });
        this.close(sheet, touch + 0.55);
        this.busyUntil = touch + 0.6;
      });
    });
  }

  /** A new goldfish: the screen lights on the lock screen, its notification lands, it swipes in. */
  private wake(now: number, item: FeedItem) {
    this.state = "boot";
    const scene = this.scene;
    const app = this.pickApp();
    const under = this.open(app);
    const lockData = { time: this.env.clock().time, date: this.env.clock().date, hue: this.persona.hue };
    const lock = this.picture({ painter: "system.lock", mode: "dark", data: lockData }, "light", "#000000", LockView as typeof PictureView) as LockView;
    let shown = false;
    const show = () => {
      if (shown || !lock.ready || !under.ready) return;
      shown = true;
      lock.shown = under.shown = true;
      const t = this.clock;
      for (const view of this.views) if (view !== lock && view !== under) this.close(view, t);
      scene.set(under.group, { sx: 0.94, sy: 0.94 }, { x: GLASS.w / 2, y: GLASS.h / 2 });
      scene.set(lock.group, {});
      scene.glide(this.dim, t, 0.35, EASE.out, { opacity: 0 });
      this.dopamine.reset(t);
      this.notifyOnLock(t + 0.3, item, app);
      scene.set(this.thumb, { x: GLASS.w * 0.5, y: GLASS.h + 70, rot: 0 });
      scene.set(this.liveFish, {});
      scene.set(this.spentFish, { opacity: 0 });
      this.swim(t + 0.45, GLASS.w * 0.5, GLASS.h - 120, 0.5);
      const unlock = t + 1.5 / this.persona.tempo;
      this.at(unlock, () => {
        const down = this.drag(unlock, GLASS.w / 2, GLASS.h - 12, GLASS.w / 2, GLASS.h * 0.45, 0.3);
        scene.glide(lock.group, down, 0.45, EASE.out, { y: -GLASS.h });
        scene.glide(under.group, down, 0.5, EASE.snap, { sx: 1, sy: 1 });
        this.close(lock, down + 0.5);
        this.at(down + 0.5, () => {
          this.state = "alive";
          this.nextAuto = this.clock + 0.1;
          this.nextHop = this.clock + this.hopDelay();
        });
      });
    };
    lock.whenReady(show);
    under.whenReady(show);
  }

  private notifyOnLock(now: number, item: FeedItem, app: AppDef) {
    const ctx = this.context(item.keyword, true, item.seed);
    const { title, body } = app.notify(ctx);
    this.tiles.request({ painter: "system.banner", w: BANNER.w, mode: "dark", lang: this.persona.lang, os: this.persona.os, data: { app: app.id, title, body, time: ui(this.persona.lang).now } }, {
      urgent: true,
      onReady: (tile) => {
        const lock = this.views.find((view) => view instanceof LockView) as LockView | undefined;
        if (!tile.failed && lock) this.at(now, () => lock.push(tile, this.clock));
      },
    });
  }

  /** Seen on the glass now: the app's id, or the system surface. */
  /** Strikes in the last ten seconds. */
  get dose() {
    return this.dopamine.level(this.clock);
  }

  get showing() {
    const view = this.current;
    if (this.state === "dead") return "off";
    return view instanceof AppView ? view.app.id : view instanceof LockView ? "lock" : "system";
  }

  // ——— by hand (focus and hand modes): the same phone, its thumb the visitor's ———

  private recentApps: AppId[] = [];
  private lastInput = -Infinity;
  private finger: Finger | null = null;
  private lastTap = { t: -1, x: 0, y: 0 };
  private homeView: View | null = null;
  private wheelTurn = { sum: 0, at: -1 };

  /** A visitor is using this phone now. */
  get driving() {
    return this.options.drive === "hand" || (this.options.drive === "focus" && this.clock - this.lastInput < 12);
  }

  private ripple(now: number, x: number, y: number) {
    this.scene.set(this.ring, { x, y, sx: 0.35, sy: 0.35, opacity: 0.9 });
    this.scene.glide(this.ring, now, 0.36, EASE.out, { sx: 1.5, sy: 1.5, opacity: 0 });
  }

  /** A pointer on the glass, in pt: `hover` (a mouse with no button: the goldfish follows it), `down`, `move`, `up`. */
  touch(kind: "hover" | "down" | "move" | "up", x: number, y: number, now: number) {
    if (!this.options.drive || this.state !== "alive") return;
    this.lastInput = now;
    const scene = this.scene;
    if (kind === "hover") {
      this.swim(now, x, y, 2.5);
      return;
    }
    if (kind === "down") {
      this.busyUntil = 0;
      const view = this.currentApp?.ready ? this.currentApp : null;
      this.finger = { x0: x, y0: y, x, y, t: now, vx: 0, vy: 0, kind: "undecided", start: view ? view.grab(now) : 0, view };
      this.swim(now, x, y, 3);
      return;
    }
    const finger = this.finger;
    if (!finger) return;
    const dx = x - finger.x0;
    const dy = y - finger.y0;
    if (kind === "move") {
      const dt = Math.max(1e-3, now - finger.t);
      finger.vx = finger.vx * 0.5 + ((x - finger.x) / dt) * 0.5;
      finger.vy = finger.vy * 0.5 + ((y - finger.y) / dt) * 0.5;
      finger.x = x;
      finger.y = y;
      finger.t = now;
      // The goldfish keeps to the fingertip.
      const pose = scene.pose(this.thumb, now);
      const heading = Math.atan2(finger.vy, finger.vx) + Math.PI / 2;
      const rot = Math.hypot(finger.vx, finger.vy) > 60 ? pose.rot + Math.atan2(Math.sin(heading - pose.rot), Math.cos(heading - pose.rot)) * 0.35 : pose.rot;
      scene.glide(this.thumb, now, 0.05, EASE.out, { x, y, rot });
      if (finger.kind === "undecided" && Math.hypot(dx, dy) > 8) {
        const sideways = Math.abs(dx) > Math.abs(dy);
        if (finger.y0 > GLASS.h - 46) finger.kind = sideways ? "apps" : "home";
        else if (finger.view?.app.kind === "stack") finger.kind = sideways ? "card" : "none";
        else if (finger.view && !sideways) finger.kind = "scroll";
        else finger.kind = "none";
      }
      if (finger.kind === "scroll") finger.view!.hold(finger.start - dy);
      else if (finger.kind === "card") finger.view!.holdCard(dx);
      return;
    }
    this.finger = null;
    if (finger.kind === "scroll") finger.view!.release(now, finger.view!.hold(finger.start - dy), -finger.vy);
    else if (finger.kind === "card") finger.view!.releaseCard(now, dx, finger.vx);
    else if (finger.kind === "home" && dy < -50) this.goHome(now);
    else if (finger.kind === "apps" && Math.abs(dx) > 50) this.appSwipe(now, dx < 0 ? -1 : 1);
    else if (finger.kind === "undecided") this.tapAt(now, x, y);
  }

  /** A mouse wheel or trackpad: feeds and chats move with it; a pager turns once per gesture. */
  wheel(deltaY: number, now: number) {
    if (!this.options.drive || this.state !== "alive") return;
    this.lastInput = now;
    const view = this.currentApp;
    if (!view?.ready || this.finger) return;
    if (view.app.kind === "pager") {
      this.wheelTurn.sum = now - this.wheelTurn.at > 0.5 ? deltaY : this.wheelTurn.sum + deltaY;
      if (Math.abs(this.wheelTurn.sum) > 60 && now - this.wheelTurn.at > 0.5) {
        const s = view.grab(now);
        view.release(now, s + Math.sign(this.wheelTurn.sum) * 100, 0);
        this.wheelTurn.sum = 0;
        this.wheelTurn.at = now;
      }
      return;
    }
    if (view.app.kind === "stack") return;
    view.hold(view.grab(now) + deltaY);
    view.release(now, view.grab(now), 0);
  }

  private tapAt(now: number, x: number, y: number) {
    const scene = this.scene;
    this.ripple(now, x, y);
    // Banners lie on top.
    for (const banner of this.banners) {
      if (banner.leaving) continue;
      const top = scene.pose(banner.group, now).y;
      if (x >= BANNER.x && x <= BANNER.x + BANNER.w && y >= top && y <= top + banner.h) {
        this.openBanner(banner);
        return;
      }
    }
    const view = this.current;
    if (view && view === this.homeView) {
      const { grid, dock } = homeLayout(this.persona.apps);
      for (const app of [...grid, ...dock]) {
        const icon = homeIcon(this.persona.apps, app);
        if (x >= icon.x && x <= icon.x + icon.size && y >= icon.y && y <= icon.y + icon.size) {
          this.openFromIcon(now, app);
          return;
        }
      }
      return;
    }
    const app = this.currentApp;
    if (!app?.ready) return;
    const double = now - this.lastTap.t < 0.32 && Math.hypot(x - this.lastTap.x, y - this.lastTap.y) < 40;
    this.lastTap = { t: now, x, y };
    if (app.app.kind === "pager" && double) {
      this.bigHeart(now, x, y);
      return;
    }
    const spot = app.hit(now, x, y);
    if (spot?.kind === "like") this.hearts(now, spot.x, spot.y, 5);
    else if (app.app.kind === "chat") app.advance(now, 0.3);
  }

  private openBanner(banner: Banner) {
    banner.held = true;
    const to = this.open(banner.app);
    to.whenReady(() => this.bannerTo(this.clock, banner, to));
  }

  /** Swipe up from the home bar: the app shrinks into its icon, the home screen waits for a tap. */
  private goHome(now: number) {
    const from = this.currentApp;
    if (!from || this.pendingView) return;
    const scene = this.scene;
    const home = this.picture({ painter: "system.home", mode: "dark", data: { hue: this.persona.hue, apps: this.persona.apps, badges: [...homeLayout(this.persona.apps).grid, ...homeLayout(this.persona.apps).dock].map((_, index) => (hash01(this.persona.seed, index) < 0.45 ? 1 + Math.floor(hash01(index, this.persona.seed) * 140) : 0)) } }, "light", "#000000");
    home.restack(from.z - 50);
    this.homeView = home;
    home.whenReady(() => {
      const t = Math.max(now, this.clock);
      home.shown = true;
      const icon = this.iconOf(from.app.id);
      scene.set(home.group, { sx: 1.12, sy: 1.12 }, { x: GLASS.w / 2, y: GLASS.h / 2 });
      scene.glide(home.group, t, 0.4, EASE.out, { sx: 1, sy: 1 });
      scene.glide(from.group, t, 0.4, EASE.out, { x: icon.x, y: icon.y, sx: icon.size / GLASS.w, sy: icon.size / GLASS.h, opacity: 0.2 }, { x: 0, y: 0 });
      this.close(from, t + 0.4);
    });
  }

  private openFromIcon(now: number, app: AppId) {
    if (this.pendingView) return;
    const scene = this.scene;
    const to = this.open(APPS[app]);
    const icon = this.iconOf(app);
    to.whenReady(() => {
      const t = Math.max(now, this.clock);
      to.shown = true;
      scene.set(to.group, { x: icon.x, y: icon.y, sx: icon.size / GLASS.w, sy: icon.size / GLASS.h }, { x: 0, y: 0 });
      scene.glide(to.group, t, 0.5, EASE.snap, { x: 0, y: 0, sx: 1, sy: 1 });
      this.settle(to, t + 0.5);
      this.homeView = null;
    });
  }

  /** Sideways along the home bar: left for another app, right back to the one before. */
  private appSwipe(now: number, dir: number) {
    const from = this.currentApp;
    if (!from || this.pendingView) return;
    const before = this.recentApps.filter((id) => id !== from.app.id);
    const app = dir > 0 && before.length ? APPS[before[before.length - 1]!] : this.pickApp(from.app.id);
    const to = this.open(app);
    to.whenReady(() => this.swipeTo(Math.max(now, this.clock), from, to, dir < 0 ? -1 : 1, true));
  }

  dispose() {
    for (const view of this.views) view.dispose();
    this.views = [];
  }
}
