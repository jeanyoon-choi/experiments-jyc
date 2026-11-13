// What a phone puts on its glass: quads (instances) in groups. A group is a
// moving frame — an app's layer, a feed's scroll, a banner, the thumb — and
// a quad sits in one. Moving a group moves everything in it on the GPU;
// the CPU writes a group only when its motion changes, and repacks the
// quads only when one is added, removed or restacked.

import { FLOATS_PER_INSTANCE, GROUPS_PER_PHONE } from "../gl/shaders";
import type { Compositor } from "../gl/renderer";
import { poseAt, still, type Motion, type Pose } from "../model/motion";
import type { Tile, Tiles } from "../paint/tiles";

export type Group = {
  index: number;
  parent: Group | null;
  motion: Motion;
};

export type Quad = {
  phone: number;
  /** Stacking within its phone: higher is nearer. */
  z: number;
  group: Group;
  x: number;
  y: number;
  w: number;
  h: number;
  radius: number;
  opacity: number;
  /** Premultiplied RGBA; a textured quad's tint. */
  color: [number, number, number, number];
  tile: Tile | null;
  /** Clip rect in `clipGroup`'s space; null: none. */
  clip: [number, number, number, number] | null;
  clipGroup: Group | null;
  /** Clipped to its phone's glass. */
  glass: boolean;
  /** A strip tile's frame count, played by the compositor (0: a still tile). */
  frames: number;
};

export function rgba(hex: string, alpha = 1): [number, number, number, number] {
  const value = hex.replace("#", "");
  const full = value.length === 3 ? value.replace(/./g, (c) => c + c) : value;
  const n = parseInt(full, 16);
  return [(((n >> 16) & 255) / 255) * alpha, (((n >> 8) & 255) / 255) * alpha, ((n & 255) / 255) * alpha, alpha];
}

const WHITE: [number, number, number, number] = [1, 1, 1, 1];

export class Scene {
  private readonly quads = new Set<Quad>();
  private readonly free: number[][] = [];
  private packed = new Float32Array(0);
  private count = 0;
  dirty = true;

  constructor(
    readonly compositor: Compositor,
    readonly tiles: Tiles,
    phones: number,
  ) {
    for (let phone = 0; phone < phones; phone += 1) {
      // Group 0 of each phone is its root; the rest are handed out.
      this.free.push(Array.from({ length: GROUPS_PER_PHONE - 1 }, (_, index) => phone * GROUPS_PER_PHONE + GROUPS_PER_PHONE - 1 - index));
    }
  }

  root(phone: number): Group {
    const group = { index: phone * GROUPS_PER_PHONE, parent: null, motion: still() };
    this.compositor.writeGroup(group.index, group.motion, -1);
    return group;
  }

  group(phone: number, parent: Group | null, motion: Motion = still()): Group {
    const index = this.free[phone]!.pop();
    if (index === undefined) throw new Error(`pc/mobiles/2: phone ${phone} is out of groups`);
    const group = { index, parent, motion };
    this.compositor.writeGroup(index, motion, parent?.index ?? -1);
    return group;
  }

  freeGroup(phone: number, group: Group) {
    this.free[phone]!.push(group.index);
  }

  groupsLeft(phone: number) {
    return this.free[phone]!.length;
  }

  move(group: Group, motion: Motion) {
    group.motion = motion;
    this.compositor.writeGroup(group.index, motion, group.parent?.index ?? -1);
  }

  /** Where a group is now: the start of a motion that must not jump. */
  pose(group: Group, time: number): Pose {
    return poseAt(group.motion, time);
  }

  /** Moves a group from wherever it is now to `to` (unset fields keep their current value). */
  glide(group: Group, time: number, duration: number, ease: Motion["ease"], to: Partial<Pose>, origin?: { x: number; y: number }) {
    const from = this.pose(group, time);
    this.move(group, { t0: time, t1: time + duration, ease, from, to: { ...from, ...to }, ox: origin?.x ?? group.motion.ox, oy: origin?.y ?? group.motion.oy });
  }

  /** Sets a group's pose at once (only for groups not on view). */
  set(group: Group, pose: Partial<Pose>, origin?: { x: number; y: number }) {
    this.move(group, still(pose, origin?.x ?? group.motion.ox, origin?.y ?? group.motion.oy));
  }

  add(quad: Partial<Quad> & Pick<Quad, "phone" | "group" | "w" | "h">): Quad {
    const full: Quad = { z: 0, x: 0, y: 0, radius: 0, opacity: 1, color: WHITE, tile: null, clip: null, clipGroup: null, glass: true, frames: 0, ...quad };
    if (full.tile) this.tiles.retain(full.tile);
    this.quads.add(full);
    this.dirty = true;
    return full;
  }

  /** A quad showing a tile at its painted height. */
  tile(phone: number, group: Group, tile: Tile, x: number, y: number, extra: Partial<Quad> = {}) {
    return this.add({ phone, group, tile, x, y, w: tile.spec.w, h: tile.h, ...extra });
  }

  solid(phone: number, group: Group, x: number, y: number, w: number, h: number, color: [number, number, number, number], extra: Partial<Quad> = {}) {
    return this.add({ phone, group, x, y, w, h, color, ...extra });
  }

  remove(quad: Quad | null | undefined) {
    if (!quad || !this.quads.delete(quad)) return;
    if (quad.tile) this.tiles.release(quad.tile);
    this.dirty = true;
  }

  /** Changes a quad in place (restack, recolour, swap tile). */
  update(quad: Quad, change: Partial<Quad>) {
    if (change.tile !== undefined && change.tile !== quad.tile) {
      if (quad.tile) this.tiles.release(quad.tile);
      if (change.tile) this.tiles.retain(change.tile);
    }
    Object.assign(quad, change);
    this.dirty = true;
  }

  get size() {
    return this.quads.size;
  }

  /** Packs the quads, phone by phone and back to front; only when something changed. */
  pack() {
    if (!this.dirty) return { data: this.packed, count: this.count };
    this.dirty = false;
    const list = [...this.quads].filter((quad) => !quad.tile || quad.tile.ready);
    list.sort((a, b) => a.phone - b.phone || a.z - b.z);
    const needed = list.length * FLOATS_PER_INSTANCE;
    if (this.packed.length < needed) this.packed = new Float32Array(Math.max(needed, this.packed.length * 2));
    const out = this.packed;
    let at = 0;
    for (const quad of list) {
      const tile = quad.tile;
      out[at++] = quad.x;
      out[at++] = quad.y;
      out[at++] = quad.w;
      out[at++] = quad.h;
      if (tile?.slot) {
        out[at++] = tile.uv[0];
        out[at++] = tile.uv[1];
        out[at++] = tile.uv[2];
        out[at++] = tile.uv[3];
        out[at++] = tile.slot.layer;
      } else {
        out[at++] = 0;
        out[at++] = 0;
        out[at++] = 0;
        out[at++] = 0;
        out[at++] = -1;
      }
      out[at++] = quad.radius;
      out[at++] = quad.group.index;
      out[at++] = quad.opacity;
      out[at++] = quad.color[0];
      out[at++] = quad.color[1];
      out[at++] = quad.color[2];
      out[at++] = quad.color[3];
      if (quad.clip) {
        out[at++] = quad.clip[0];
        out[at++] = quad.clip[1];
        out[at++] = quad.clip[2];
        out[at++] = quad.clip[3];
      } else {
        out[at++] = 0;
        out[at++] = 0;
        out[at++] = -1;
        out[at++] = -1;
      }
      out[at++] = quad.clipGroup?.index ?? -1;
      out[at++] = quad.phone;
      out[at++] = quad.glass ? 1 : 0;
      out[at++] = quad.frames;
    }
    this.count = list.length;
    return { data: out, count: this.count };
  }

  /** A tile becoming ready changes what can be packed. */
  touch() {
    this.dirty = true;
  }
}
