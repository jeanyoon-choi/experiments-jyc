// The main thread's side of painting: one cache of tiles by spec, a pool of
// painting workers, and the atlas they land in. A tile is asked for, painted
// off-thread, uploaded a few per frame (so no frame pays for many), and
// counted while a glass shows it; tiles no glass shows are evicted a whole
// atlas layer at a time, least recently used first. The same spec twice is
// the same tile — the phones repeat each other's content for free.

import { ColumnAtlas, type Slot } from "../gl/atlas";
import type { Compositor } from "../gl/renderer";
import type { Hotspot, PaintRequest, PaintResult, TileSpec } from "./types";

export type Tile = {
  key: string;
  spec: TileSpec;
  ready: boolean;
  failed: boolean;
  /** Height in pt (known once painted). */
  h: number;
  slot: Slot | null;
  uv: [number, number, number, number];
  hotspots: Hotspot[];
  refs: number;
  lastUsed: number;
  waiting: ((tile: Tile) => void)[];
};

const keyOf = (spec: TileSpec) => `${spec.painter}|${spec.w}|${spec.h ?? ""}|${spec.mode}|${spec.lang}|${spec.os ?? ""}|${JSON.stringify(spec.data)}`;

export class Tiles {
  private readonly cache = new Map<string, Tile>();
  private readonly byId = new Map<number, Tile>();
  private readonly workers: Worker[] = [];
  private readonly inflight: number[] = [];
  private readonly queue: { tile: Tile; urgent: boolean }[] = [];
  private readonly arrived: { tile: Tile; pixels: Uint8Array; width: number; height: number }[] = [];
  private readonly atlas: ColumnAtlas;
  private nextId = 1;
  private warned = false;
  /** Painted and uploaded since the last `stats()`. */
  private painted = 0;
  private paintMs = 0;
  /** Mean paint ms by painter, for finding the slow ones. */
  readonly byPainter = new Map<string, { n: number; ms: number }>();
  private decodeMs = 0;

  constructor(
    private readonly compositor: Compositor,
    /** Device px per pt. */
    readonly scale: number,
    workers: number,
  ) {
    this.atlas = new ColumnAtlas(compositor.atlasSize, compositor.atlasLayers, Math.ceil(390 * scale));
    for (let index = 0; index < workers; index += 1) {
      const worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
      worker.onmessage = (event: MessageEvent<PaintResult>) => this.receive(index, event.data);
      this.workers.push(worker);
      this.inflight.push(0);
    }
  }

  request(spec: TileSpec, { urgent = false, onReady }: { urgent?: boolean; onReady?: (tile: Tile) => void } = {}): Tile {
    const key = keyOf(spec);
    let tile = this.cache.get(key);
    if (!tile) {
      tile = { key, spec, ready: false, failed: false, h: spec.h ?? 0, slot: null, uv: [0, 0, 0, 0], hotspots: [], refs: 0, lastUsed: performance.now(), waiting: [] };
      this.cache.set(key, tile);
      this.queue[urgent ? "unshift" : "push"]({ tile, urgent });
      if (!spec.painter.startsWith("main.")) this.dispatch();
    } else if (urgent && !tile.ready) {
      const at = this.queue.findIndex((entry) => entry.tile === tile);
      if (at > 0) this.queue.unshift(...this.queue.splice(at, 1));
    }
    if (onReady) {
      if (tile.ready || tile.failed) onReady(tile);
      else tile.waiting.push(onReady);
    }
    return tile;
  }

  /** Tiles waiting to be painted or uploaded. */
  get backlog() {
    return this.queue.length + this.arrived.length;
  }

  /** Resolves when the tile can be drawn (or has failed: then it is drawn as nothing). */
  whenReady(tile: Tile) {
    return new Promise<Tile>((resolve) => {
      if (tile.ready || tile.failed) resolve(tile);
      else tile.waiting.push(resolve);
    });
  }

  retain(tile: Tile) {
    tile.refs += 1;
    tile.lastUsed = performance.now();
  }

  release(tile: Tile) {
    tile.refs = Math.max(0, tile.refs - 1);
    tile.lastUsed = performance.now();
  }

  private dispatch() {
    while (this.queue.length) {
      let best = 0;
      for (let index = 1; index < this.workers.length; index += 1) if (this.inflight[index]! < this.inflight[best]!) best = index;
      if (this.inflight[best]! >= 4) return;
      const { tile } = this.queue.shift()!;
      const id = this.nextId++;
      this.byId.set(id, tile);
      this.inflight[best]! += 1;
      const request: PaintRequest = { id, spec: tile.spec, scale: this.scale };
      this.workers[best]!.postMessage(request);
    }
  }

  private receive(worker: number, result: PaintResult) {
    this.inflight[worker]! -= 1;
    const tile = this.byId.get(result.id);
    this.byId.delete(result.id);
    if (tile) {
      if ("error" in result) {
        console.warn(`[pc/mobiles/2] paint ${tile.spec.painter}: ${result.error}`);
        tile.failed = true;
        this.settle(tile);
      } else {
        tile.h = result.h;
        this.paintMs += (result.ms - this.paintMs) * 0.05;
        const entry = this.byPainter.get(tile.spec.painter) ?? { n: 0, ms: 0 };
        entry.n += 1;
        entry.ms += (result.ms - entry.ms) / entry.n;
        this.byPainter.set(tile.spec.painter, entry);
        this.decodeMs += (result.decode - this.decodeMs) * 0.05;
        tile.hotspots = result.hotspots;
        this.arrived.push({ tile, pixels: result.pixels, width: result.width, height: result.height });
      }
    }
    this.dispatch();
  }

  private settle(tile: Tile) {
    const waiting = tile.waiting;
    tile.waiting = [];
    for (const callback of waiting) callback(tile);
  }

  /** Room for a strip of square frames this many px wide. */
  get columnWidth() {
    return this.atlas.columnWidth - this.atlas.pad * 2;
  }

  /** Uploads painted tiles, up to `budget` ms of them; call once a frame, before the phones step. */
  pump(budget = 4) {
    const start = performance.now();
    let uploaded = 0;
    while (this.arrived.length && (uploaded === 0 || performance.now() - start < budget)) {
      const { tile, pixels, width, height } = this.arrived[0]!;
      const slot = this.allocate(width, height);
      if (!slot) {
        if (!this.warned) console.warn("[pc/mobiles/2] atlas full of tiles on glass; waiting");
        this.warned = true;
        return;
      }
      this.arrived.shift();
      this.compositor.upload(slot, pixels);
      const size = this.compositor.atlasSize;
      tile.slot = slot;
      tile.uv = [(slot.x + 0.5) / size, (slot.y + 0.5) / size, (slot.x + slot.w - 0.5) / size, (slot.y + slot.h - 0.5) / size];
      tile.ready = true;
      uploaded += 1;
      this.painted += 1;
      this.settle(tile);
    }
  }

  private allocate(w: number, h: number) {
    let slot = this.atlas.alloc(w, h);
    if (slot) return slot;
    // Full: free the least recently used tiles no glass shows, one by one, until it fits.
    const idle = [...this.cache.values()].filter((tile) => tile.slot && tile.refs === 0).sort((a, b) => a.lastUsed - b.lastUsed);
    for (const tile of idle) {
      this.atlas.release(tile.slot!);
      tile.slot = null;
      tile.ready = false;
      this.cache.delete(tile.key);
      slot = this.atlas.alloc(w, h);
      if (slot) return slot;
    }
    return null;
  }

  /** A tile painted on the main thread (the goldfish strips): premultiplied pixels, `width` × `height`. */
  provide(spec: TileSpec, pixels: Uint8Array, width: number, height: number) {
    const tile = this.request(spec, { onReady: () => {} });
    if (tile.ready) return tile;
    // Not for a worker: take it out of the queue and hand the pixels straight to the upload.
    const at = this.queue.findIndex((entry) => entry.tile === tile);
    if (at >= 0) this.queue.splice(at, 1);
    tile.h = spec.h ?? height / this.scale;
    this.arrived.unshift({ tile, pixels, width, height });
    return tile;
  }

  stats() {
    const painted = this.painted;
    this.painted = 0;
    let onGlass = 0;
    for (const tile of this.cache.values()) if (tile.refs > 0) onGlass += 1;
    return { cached: this.cache.size, onGlass, queued: this.queue.length + this.arrived.length, painted, paintMs: Math.round(this.paintMs * 10) / 10, decodeMs: Math.round(this.decodeMs * 10) / 10 };
  }

  /** After a lost context: every tile must be painted again. */
  dispose() {
    for (const worker of this.workers) worker.terminate();
  }
}
