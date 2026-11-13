// The screens a phone stacks on its glass: an app (feed, pager, card stack
// or chat), the lock screen, the home screen, a full-screen ad. Each is one
// group (its layer) holding its quads, so a transition moves it whole; a
// feed adds a scroll group inside. A view only appears once its first tiles
// are painted (`ready`), so nothing pops in.

import type { AppDef, ItemContext, ItemSpec, Persona } from "../apps/types";
import { EASE } from "../model/motion";
import type { Hotspot, Mode, TileSpec } from "../paint/types";
import type { Tile, Tiles } from "../paint/tiles";
import { GLASS } from "./geometry";
import { rgba, type Group, type Quad, type Scene } from "./scene";

export type Host = {
  scene: Scene;
  tiles: Tiles;
  phone: number;
  persona: Persona;
  root: Group;
  /** A context for an item about `keyword` (fresh: the goldfish's own strike). */
  context(keyword: string, fresh: boolean): ItemContext;
  /** A keyword the hype is about right now, for posts nobody struck. */
  ambientKeyword(): string;
  spec(item: ItemSpec, mode: Mode, w?: number): TileSpec;
};

export type Placed = { tile: Tile; quad: Quad; y: number; h: number; group?: Group };

export abstract class View {
  readonly group: Group;
  protected readonly quads: Quad[] = [];
  protected readonly groups: Group[] = [];
  ready = false;
  /** On the glass (a transition has brought it in); a view being prepared is not. */
  shown = false;
  /** Set once its close is scheduled: never closed twice. */
  closing = false;
  /** When it was made, to give up on one that never gets painted. */
  readonly born = performance.now() / 1000;
  protected waiting = 0;
  private readyCallbacks: (() => void)[] = [];
  /** Status-bar text over this view. */
  abstract tone: "light" | "dark";

  constructor(
    protected readonly host: Host,
    readonly z: number,
  ) {
    this.group = this.newGroup(host.root);
  }

  protected newGroup(parent: Group) {
    const group = this.host.scene.group(this.host.phone, parent);
    this.groups.push(group);
    return group;
  }

  protected request(spec: TileSpec, urgent = false) {
    this.waiting += 1;
    const tile = this.host.tiles.request(spec, { urgent });
    this.host.tiles.whenReady(tile).then(() => {
      this.waiting -= 1;
      if (this.waiting === 0 && !this.ready) {
        this.ready = true;
        this.host.scene.touch();
        for (const callback of this.readyCallbacks.splice(0)) callback();
      }
    });
    return tile;
  }

  whenReady(callback: () => void) {
    if (this.ready) callback();
    else this.readyCallbacks.push(callback);
  }

  protected quad(quad: Quad) {
    this.quads.push(quad);
    return quad;
  }

  protected drop(quad: Quad) {
    const at = this.quads.indexOf(quad);
    if (at >= 0) this.quads.splice(at, 1);
    this.host.scene.remove(quad);
  }

  protected dropGroup(group: Group) {
    const at = this.groups.indexOf(group);
    if (at >= 0) this.groups.splice(at, 1);
    this.host.scene.freeGroup(this.host.phone, group);
  }

  /** Every frame, for views with something to keep up (feeds). */
  step?(now: number): void;

  /** Restacks this view (newest on top). */
  restack(z: number) {
    const shift = z - this.z;
    if (!shift) return;
    (this as { z: number }).z = z;
    for (const quad of this.quads) this.host.scene.update(quad, { z: quad.z + shift });
  }

  dispose() {
    for (const quad of this.quads.splice(0)) this.host.scene.remove(quad);
    for (const group of this.groups.splice(0)) this.host.scene.freeGroup(this.host.phone, group);
  }
}

/** A full-glass picture: lock screen, home screen, ad, Screen Time's sheet. */
export class PictureView extends View {
  tile: Tile;
  hotspots: Hotspot[] = [];

  constructor(
    host: Host,
    z: number,
    spec: TileSpec,
    readonly tone: "light" | "dark",
    background = "#000000",
  ) {
    super(host, z);
    this.quad(host.scene.solid(host.phone, this.group, 0, 0, GLASS.w, GLASS.h, rgba(background), { z }));
    this.tile = this.request(spec, true);
    host.tiles.whenReady(this.tile).then((tile) => {
      this.hotspots = tile.hotspots;
      if (!tile.failed) this.quad(host.scene.tile(host.phone, this.group, tile, 0, 0, { z: this.z + 1 }));
    });
  }
}

/** Notifications stacked on the lock screen, newest on top. */
export class LockView extends PictureView {
  private readonly cards: { quad: Quad; group: Group; h: number }[] = [];

  push(tile: Tile, now: number) {
    const scene = this.host.scene;
    let y = 236;
    const group = this.newGroup(this.group);
    scene.set(group, { y: y - 30, opacity: 0, sx: 0.94, sy: 0.94 }, { x: GLASS.w / 2, y: 0 });
    scene.glide(group, now, 0.42, EASE.spring, { y, opacity: 1, sx: 1, sy: 1 });
    const quad = this.quad(scene.tile(this.host.phone, group, tile, 8, 0, { z: this.z + 40 }));
    for (const card of this.cards) {
      y += tile.h + 8;
      scene.glide(card.group, now, 0.42, EASE.spring, { y });
    }
    this.cards.unshift({ quad, group, h: tile.h });
    y = 236 + tile.h + 8;
    while (this.cards.length > 4) {
      const old = this.cards.pop()!;
      this.drop(old.quad);
      this.dropGroup(old.group);
    }
  }
}

/** An app with content: feed, pager, card stack or chat. */
export class AppView extends View {
  readonly mode: Mode;
  readonly tone: "light" | "dark";
  readonly scroll: Group;
  private readonly items: Placed[] = [];
  private readonly pending: Tile[] = [];
  private contentEnd: number;
  /** Where the scroll is headed (pt scrolled). */
  private target = 0;
  private readonly viewTop: number;
  private readonly viewBottom: number;
  /** Cards (stack): top card first. */
  private readonly cards: Placed[] = [];
  private fills = 0;

  constructor(
    host: Host,
    z: number,
    readonly app: AppDef,
  ) {
    super(host, z);
    const scene = host.scene;
    this.mode = app.mode(host.persona);
    this.tone = this.mode === "dark" || app.kind === "pager" ? "light" : "dark";
    this.viewTop = app.kind === "pager" ? 0 : app.top;
    this.viewBottom = GLASS.h - (app.kind === "pager" ? 0 : app.bottom);
    this.contentEnd = this.viewTop;
    this.scroll = this.newGroup(this.group);
    this.quad(scene.solid(host.phone, this.group, 0, 0, GLASS.w, GLASS.h, rgba(app.bg(this.mode)), { z }));

    const chromeContext = host.context(host.ambientKeyword(), false);
    const chrome = app.chrome?.(chromeContext) ?? {};
    for (const [part, h, y] of [
      ["top", app.top, 0],
      ["bottom", app.bottom, GLASS.h - app.bottom],
    ] as const) {
      if (h <= 0) continue;
      const tile = this.request({ painter: `${app.id}.${part}`, w: GLASS.w, h, mode: this.mode, lang: host.persona.lang, os: host.persona.os, data: chrome }, true);
      host.tiles.whenReady(tile).then((ready) => {
        if (!ready.failed) this.quad(scene.tile(host.phone, this.group, ready, 0, y, { z: this.z + 60 }));
      });
    }
    const opening = app.opening?.(host.context(host.ambientKeyword(), false)) ?? [];
    for (const item of opening) this.enqueue(host.spec(item, this.mode), true);
    const first = app.kind === "pager" ? 2 : app.kind === "stack" ? 3 : app.kind === "chat" ? 7 : 3;
    for (let index = 0; index < first; index += 1) this.enqueue(this.fill(), true);
  }

  private fill() {
    this.fills += 1;
    const item = this.app.item(this.host.context(this.host.ambientKeyword(), false));
    return this.host.spec(item, this.mode, item.w);
  }

  /** Queues a tile to be placed after those before it, in order; `urgent` when the view is about to run dry. */
  private enqueue(spec: TileSpec, opening = false, urgent = false) {
    const tile = opening ? this.request(spec, true) : this.host.tiles.request(spec, { urgent });
    this.pending.push(tile);
    this.host.tiles.retain(tile);
  }

  private get viewHeight() {
    return this.viewBottom - this.viewTop;
  }

  /** Scroll offset now (pt scrolled). */
  scrolled(now: number) {
    return -this.host.scene.pose(this.scroll, now).y;
  }

  step(now: number) {
    // Place painted tiles in order.
    while (this.pending.length && (this.pending[0]!.ready || this.pending[0]!.failed)) {
      const tile = this.pending.shift()!;
      this.host.tiles.release(tile);
      if (!tile.failed) this.place(tile, now);
    }
    if (!this.ready) return;
    const kind = this.app.kind;
    if (kind === "stack") {
      if (this.cards.length + this.pending.length < 3) this.enqueue(this.fill(), false, this.cards.length < 2);
      return;
    }
    const s = this.scrolled(now);
    const ahead = kind === "pager" ? GLASS.h * 2 : this.viewHeight * 2.2;
    // A chat grows only when a message comes (advance); feeds and pagers keep content waiting below.
    const left = this.contentEnd - (this.target + this.viewBottom);
    if (kind !== "chat" && left < ahead && this.pending.length < 2) this.enqueue(this.fill(), false, left < this.viewHeight * 1.2);
    // Recycle what has gone well above.
    while (this.items.length > 2 && this.items[0]!.y + this.items[0]!.h < s + this.viewTop - 400) {
      const gone = this.items.shift()!;
      this.drop(gone.quad);
    }
  }

  private place(tile: Tile, now: number) {
    const scene = this.host.scene;
    if (this.app.kind === "stack") {
      const group = this.newGroup(this.group);
      const x = (GLASS.w - tile.spec.w) / 2;
      const y = this.viewTop + 6;
      const under = this.cards.length > 0;
      scene.set(group, { sx: under ? 0.95 : 1, sy: under ? 0.95 : 1 }, { x: GLASS.w / 2, y: y + tile.h / 2 });
      const z = this.z + 30 - this.cards.length * 2;
      const quad = this.quad(scene.tile(this.host.phone, group, tile, x, y, { z, radius: 12 }));
      this.cards.push({ tile, quad, y, h: tile.h, group });
      return;
    }
    const y = this.contentEnd;
    const quad = this.quad(scene.tile(this.host.phone, this.scroll, tile, (GLASS.w - tile.spec.w) / 2, y, { z: this.z + 10, clip: [0, this.viewTop, GLASS.w, this.viewBottom], clipGroup: this.group }));
    this.items.push({ tile, quad, y, h: tile.h });
    this.contentEnd += tile.h;
    if (this.app.kind === "chat") {
      // A new message pushes the thread up so it lands just above the composer.
      const to = Math.max(0, this.contentEnd + 10 - this.viewBottom);
      if (to > this.target) {
        this.target = to;
        scene.glide(this.scroll, now, this.items.length <= 7 ? 0 : 0.32, EASE.out, { y: -to });
      }
    }
  }

  /** Scrolls on by about `distance` pt with a flick; returns false when there is nothing below yet. */
  flick(now: number, distance: number, duration: number) {
    if (this.app.kind !== "feed") return false;
    const max = this.contentEnd - this.viewBottom;
    const to = Math.min(max, this.target + distance);
    if (to - this.target < 60) return false;
    this.target = to;
    this.host.scene.glide(this.scroll, now, duration, EASE.flick, { y: -to });
    return true;
  }

  /** Next clip (pager) or next message (chat); false when not ready. */
  advance(now: number, duration: number) {
    if (this.app.kind === "pager") {
      const index = Math.round(this.target / GLASS.h) + 1;
      if (this.contentEnd < (index + 1) * GLASS.h) return false;
      this.target = index * GLASS.h;
      this.host.scene.glide(this.scroll, now, duration, EASE.snap, { y: -this.target });
      return true;
    }
    if (this.app.kind === "chat") {
      this.enqueue(this.fill());
      return true;
    }
    return false;
  }

  /** The top card thrown aside (stack); returns the direction, or 0 when not ready. */
  swipe(now: number, duration: number, right: boolean) {
    if (this.app.kind !== "stack" || this.cards.length < 2) return 0;
    const scene = this.host.scene;
    const top = this.cards.shift()!;
    const dir = right ? 1 : -1;
    scene.glide(top.group!, now, duration, EASE.in, { x: dir * 560, y: 60, rot: dir * 0.42 });
    const next = this.cards[0]!;
    scene.glide(next.group!, now, duration * 1.3, EASE.spring, { sx: 1, sy: 1 });
    this.cards.forEach((card, index) => scene.update(card.quad, { z: this.z + 30 - index * 2 }));
    setTimeout(() => {
      this.drop(top.quad);
      this.dropGroup(top.group!);
    }, (duration + 0.05) * 1000);
    return dir;
  }

  /** The goldfish's own post: placed just below the view (or as the next clip/card/message), ready to be scrolled to. */
  insert(spec: TileSpec, now: number, onPlaced: (y: number) => void) {
    const tile = this.host.tiles.request(spec, { urgent: true });
    this.host.tiles.retain(tile);
    this.host.tiles.whenReady(tile).then(() => {
      this.host.tiles.release(tile);
      if (tile.failed) return;
      if (this.app.kind === "stack") {
        this.place(tile, now);
        const card = this.cards.pop()!;
        this.cards.splice(1, 0, card);
        this.cards.forEach((each, index) => this.host.scene.update(each.quad, { z: this.z + 30 - index * 2 }));
        onPlaced(0);
        return;
      }
      if (this.app.kind === "chat") {
        this.place(tile, performance.now() / 1000);
        onPlaced(this.contentEnd - tile.h);
        return;
      }
      const below = this.target + (this.app.kind === "pager" ? GLASS.h : this.viewBottom);
      const at = this.items.findIndex((item) => item.y >= below - 1);
      const y = at < 0 ? this.contentEnd : this.items[at]!.y;
      const scene = this.host.scene;
      for (let index = at < 0 ? this.items.length : at; index < this.items.length; index += 1) {
        const item = this.items[index]!;
        item.y += tile.h;
        scene.update(item.quad, { y: item.y });
      }
      const quad = this.quad(scene.tile(this.host.phone, this.scroll, tile, (GLASS.w - tile.spec.w) / 2, y, { z: this.z + 10, clip: [0, this.viewTop, GLASS.w, this.viewBottom], clipGroup: this.group }));
      this.items.splice(at < 0 ? this.items.length : at, 0, { tile, quad, y, h: tile.h });
      this.contentEnd += tile.h;
      onPlaced(y);
    });
  }

  /** Scrolls so that content y lands near the top of the view. */
  bring(now: number, y: number, duration: number) {
    const max = Math.max(0, this.contentEnd - this.viewBottom);
    const to = Math.min(max, Math.max(this.target, y - this.viewTop - (this.app.kind === "pager" ? 0 : 6)));
    if (to <= this.target + 1) return false;
    this.target = to;
    this.host.scene.glide(this.scroll, now, duration, this.app.kind === "pager" ? EASE.snap : EASE.flick, { y: -to });
    return true;
  }

  /** A visible item's like (or other) spot, in glass coordinates, for the thumb. */
  hotspot(now: number, kind: Hotspot["kind"] = "like") {
    if (this.app.kind === "stack") {
      const card = this.cards[0];
      return card ? { x: GLASS.w / 2, y: card.y + card.h * 0.55 } : null;
    }
    const s = this.scrolled(now);
    const visible: { x: number; y: number }[] = [];
    for (const item of this.items) {
      for (const spot of item.tile.hotspots) {
        if (spot.kind !== kind) continue;
        const y = item.y + spot.y - s;
        if (y > this.viewTop + 30 && y < this.viewBottom - 30) visible.push({ x: (GLASS.w - item.tile.spec.w) / 2 + spot.x, y });
      }
    }
    return visible.length ? visible[Math.floor(Math.random() * visible.length)]! : null;
  }

  /** Bottom of the viewport, for a thumb's flick path. */
  get bottomEdge() {
    return this.viewBottom;
  }

  // ——— by hand (focus and hand modes): the same views, moved by a finger ———

  /** Scroll limits: content above the first kept item has been recycled. */
  private get scrollRange() {
    const min = Math.max(0, (this.items[0]?.y ?? this.viewTop) - this.viewTop);
    return { min, max: Math.max(min, this.contentEnd - this.viewBottom) };
  }

  /** Where the scroll stood when a finger came down. */
  grab(now: number) {
    const s = this.scrolled(now);
    this.target = s;
    this.host.scene.set(this.scroll, { y: -s });
    if (this.app.kind === "stack" && this.cards[0]) this.host.scene.set(this.cards[0].group!, this.host.scene.pose(this.cards[0].group!, now));
    return s;
  }

  /** The content follows the finger: `scroll` pt scrolled, rubber-banded past the ends. */
  hold(scroll: number) {
    const { min, max } = this.scrollRange;
    const band = (over: number) => Math.sign(over) * Math.min(Math.abs(over), 120 * (1 - Math.exp(-Math.abs(over) / 120)));
    const s = scroll < min ? min + band(scroll - min) : scroll > max ? max + band(scroll - max) : scroll;
    this.host.scene.set(this.scroll, { y: -s });
    return s;
  }

  /** The finger lifts: a feed or chat coasts on its velocity (pt/s, + is content moving up); a pager turns or settles back. */
  release(now: number, scroll: number, velocity: number) {
    const scene = this.host.scene;
    const { min, max } = this.scrollRange;
    if (this.app.kind === "pager") {
      const index = Math.round(this.target / GLASS.h);
      const turn = scroll - this.target > 90 || velocity > 650 ? 1 : scroll - this.target < -90 || velocity < -650 ? -1 : 0;
      const next = Math.max(0, Math.min(Math.floor((this.contentEnd - 1) / GLASS.h), index + turn));
      this.target = Math.max(min, next * GLASS.h);
      scene.glide(this.scroll, now, 0.38, EASE.snap, { y: -this.target });
      return;
    }
    const coast = Math.max(min, Math.min(max, scroll + velocity * 0.32));
    this.target = coast;
    const back = scroll < min || scroll > max;
    scene.glide(this.scroll, now, back ? 0.45 : Math.min(1.1, 0.35 + Math.abs(velocity) / 4000), back ? EASE.out : EASE.flick, { y: -coast });
  }

  /** The top card follows the finger sideways. */
  holdCard(dx: number) {
    const card = this.cards[0];
    if (card) this.host.scene.set(card.group!, { x: dx, y: Math.abs(dx) * 0.08, rot: dx * 0.0011 });
  }

  /** The card is let go: thrown aside past a threshold, else springs back. */
  releaseCard(now: number, dx: number, velocity: number) {
    const card = this.cards[0];
    if (!card) return;
    if (Math.abs(dx) > 110 || Math.abs(velocity) > 800) this.swipe(now, 0.26, dx + velocity * 0.1 > 0);
    else this.host.scene.glide(card.group!, now, 0.45, EASE.spring, { x: 0, y: 0, rot: 0 });
  }

  /** A hotspot within reach of a tap, in glass coordinates. */
  hit(now: number, x: number, y: number, reach = 36) {
    if (this.app.kind === "stack") return null;
    const s = this.scrolled(now);
    for (const item of this.items) {
      for (const spot of item.tile.hotspots) {
        const sx = (GLASS.w - item.tile.spec.w) / 2 + spot.x;
        const sy = item.y + spot.y - s;
        if (Math.hypot(sx - x, sy - y) <= reach) return { x: sx, y: sy, kind: spot.kind };
      }
    }
    return null;
  }

  dispose() {
    for (const tile of this.pending.splice(0)) this.host.tiles.release(tile);
    super.dispose();
  }
}
