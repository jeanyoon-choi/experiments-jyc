// A relief (types.ts ReliefMake) baked into a field as bubble/5–8 make every object: a volume the material covers
// whole (bubble/9, user 2026-11-05: the first relief — flat slabs, engraved lines, each layer's own paint — let the
// kinds' own colours and lines show through the material and had no volume; docs/screen/bubble/9.md). Each layer
// with a height is blown up as its own balloon (∇²u = −1 over its outline, height 2√u, as fields.ts's marks; strokes
// a little bolder first); the first is the body, later ones swell on it (0.5) or
// press into it (negative heights, 0.3). Paint-only layers (height 0) and `paint` make no volume and are ignored:
// the object is one material.
import { distanceTo, FIELD_EXTENT, FIELD_SIZE, fieldOfSurface, MARK_HEIGHT, MARK_MEMBRANE, solveMembrane, SUPERSAMPLE, type Field } from "../fields/fields.ts";
import { MARK_FILL, subpathsOf } from "../shapes/marks.ts";
import type { ReliefMake } from "./types.ts";

type Point = [number, number];

/** The fine grid's side. */
const FINE = FIELD_SIZE * SUPERSAMPLE;
const UNIT = (FIELD_EXTENT * 2) / FINE;

/** From the viewBox into fine-grid texels: centred on the viewBox, the furthest point of every layer at `fill`. */
function frameOf(make: ReliefMake) {
  const [vx, vy, vw, vh] = make.viewBox;
  const cx = vx + vw / 2;
  const cy = vy + vh / 2;
  let far = 1e-6;
  for (const layer of make.layers) {
    if (layer.height <= 0) continue;
    const pad = (layer.stroke ?? 0) / 2;
    for (const subpath of subpathsOf(layer.d)) for (const [px, py] of subpath.points) far = Math.max(far, Math.hypot(px - cx, py - cy) + pad);
  }
  const scale = (make.fill ?? MARK_FILL) / far;
  return {
    scale,
    toGrid: (px: number, py: number): Point => [((px - cx) * scale) / UNIT + FINE / 2 - 0.5, ((py - cy) * scale) / UNIT + FINE / 2 - 0.5],
    toBox: (gx: number, gy: number): Point => [((gx + 0.5 - FINE / 2) * UNIT) / scale + cx, ((gy + 0.5 - FINE / 2) * UNIT) / scale + cy],
  };
}

/** A filled path's coverage (non-zero winding) on the fine grid. */
function fillCoverage(d: string, toGrid: (x: number, y: number) => Point) {
  const edges: { x0: number; y0: number; x1: number; y1: number }[] = [];
  for (const { points } of subpathsOf(d)) {
    if (points.length < 3) continue;
    for (let index = 0; index < points.length; index += 1) {
      const [ax, ay] = toGrid(...points[index]!);
      const [bx, by] = toGrid(...points[(index + 1) % points.length]!);
      if (ay !== by) edges.push({ x0: ax, y0: ay, x1: bx, y1: by });
    }
  }
  const covered = new Uint8Array(FINE * FINE);
  const crossings: { x: number; winding: number }[] = [];
  for (let row = 0; row < FINE; row += 1) {
    crossings.length = 0;
    for (const edge of edges) {
      const up = edge.y1 > edge.y0;
      const low = up ? edge.y0 : edge.y1;
      const high = up ? edge.y1 : edge.y0;
      if (row < low || row >= high) continue;
      crossings.push({ x: edge.x0 + ((row - edge.y0) / (edge.y1 - edge.y0)) * (edge.x1 - edge.x0), winding: up ? 1 : -1 });
    }
    crossings.sort((a, b) => a.x - b.x);
    let winding = 0;
    for (let index = 0; index < crossings.length - 1; index += 1) {
      winding += crossings[index]!.winding;
      if (winding === 0) continue;
      const from = Math.max(0, Math.ceil(crossings[index]!.x));
      const to = Math.min(FINE - 1, Math.floor(crossings[index + 1]!.x));
      if (to >= from) covered.fill(1, row * FINE + from, row * FINE + to + 1);
    }
  }
  return covered;
}

/** A stroked path's coverage: every texel within half the width of its centre line (round caps and joins). */
function strokeCoverage(d: string, width: number, toGrid: (x: number, y: number) => Point, scale: number) {
  const line = new Uint8Array(FINE * FINE);
  for (const { points, closed } of subpathsOf(d)) {
    const count = closed ? points.length : points.length - 1;
    for (let index = 0; index < count; index += 1) {
      const [ax, ay] = toGrid(...points[index]!);
      const [bx, by] = toGrid(...points[(index + 1) % points.length]!);
      const steps = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay) * 2));
      for (let step = 0; step <= steps; step += 1) {
        const x = Math.round(ax + ((bx - ax) * step) / steps);
        const y = Math.round(ay + ((by - ay) * step) / steps);
        if (x >= 0 && y >= 0 && x < FINE && y < FINE) line[y * FINE + x] = 1;
      }
    }
  }
  const distance = distanceTo((at) => line[at] === 1, FINE);
  const radius = (width * scale) / 2 / UNIT;
  const covered = new Uint8Array(FINE * FINE);
  for (let at = 0; at < covered.length; at += 1) covered[at] = distance[at]! <= radius * radius ? 1 : 0;
  return covered;
}

/** A stroked layer grows this much all round (object units) before it is blown up, so it reads as a plump tube. Fills are not
 * grown: lettering stays the letters' own shapes, readable (user, 2026-11-05). */
const BOLD = 0.035;
/** A later layer's balloon over the body's, by sign. */
const SWELL = 0.5;
const PRESS = 0.3;

/** A coverage grown by `radius` texels all round. */
function grown(coverage: Uint8Array, radius: number) {
  const distance = distanceTo((at) => coverage[at] === 1, FINE);
  const out = new Uint8Array(FINE * FINE);
  for (let at = 0; at < out.length; at += 1) out[at] = distance[at]! <= radius * radius ? 1 : 0;
  return out;
}

/** A coverage's balloon on the membrane grid: height 2√u, ∇²u = −1 where most of a cell's fine texels are inside. */
function balloonOf(coverage: Uint8Array) {
  const size = MARK_MEMBRANE;
  const ratio = FINE / size;
  const inside = new Uint8Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let count = 0;
      for (let sy = 0; sy < ratio; sy += 1) for (let sx = 0; sx < ratio; sx += 1) count += coverage[(y * ratio + sy) * FINE + x * ratio + sx]!;
      inside[y * size + x] = count * 2 > ratio * ratio ? 1 : 0;
    }
  }
  const u = solveMembrane(inside, size);
  const out = new Float32Array(size * size);
  for (let at = 0; at < out.length; at += 1) out[at] = 2 * Math.sqrt(Math.max(0, u[at]!));
  return out;
}

/** A relief's field (no paint: the material covers it whole). */
export function fieldOfRelief(make: ReliefMake): { field: Field; albedo: null } {
  const { scale, toGrid } = frameOf(make);
  const size = MARK_MEMBRANE;
  const ratio = FINE / size;
  const bold = BOLD / UNIT;
  const sum = new Float32Array(size * size);
  const covered = new Uint8Array(FINE * FINE);
  let body = true;
  for (const layer of make.layers) {
    if (layer.height === 0) continue;
    const drawn = layer.stroke ? strokeCoverage(layer.d, layer.stroke, toGrid, scale) : fillCoverage(layer.d, toGrid);
    const grow = layer.stroke ? bold : (layer.bold ?? 0) / UNIT;
    const coverage = layer.height > 0 && grow > 0 ? grown(drawn, grow) : drawn;
    const weight = (layer.height < 0 ? -PRESS : body ? 1 : SWELL) * (layer.puff ?? 1);
    if (layer.height > 0) {
      body = false;
      for (let at = 0; at < covered.length; at += 1) if (coverage[at]) covered[at] = 1;
    }
    const balloon = balloonOf(coverage);
    for (let at = 0; at < sum.length; at += 1) sum[at] = sum[at]! + weight * balloon[at]!;
  }
  const heightAt = (gx: number, gy: number) => {
    const fx = Math.min(size - 1.001, Math.max(0, gx));
    const fy = Math.min(size - 1.001, Math.max(0, gy));
    const x = Math.floor(fx);
    const y = Math.floor(fy);
    const tx = fx - x;
    const ty = fy - y;
    const at = y * size + x;
    const value = (sum[at]! * (1 - tx) + sum[at + 1]! * tx) * (1 - ty) + (sum[at + size]! * (1 - tx) + sum[at + size + 1]! * tx) * ty;
    return MARK_HEIGHT * Math.max(0, value);
  };
  const step = (FIELD_EXTENT * 2) / size;
  const height = new Float32Array(FINE * FINE).fill(-Infinity);
  const normal = new Float32Array(FINE * FINE * 2);
  for (let y = 0; y < FINE; y += 1) {
    for (let x = 0; x < FINE; x += 1) {
      const at = y * FINE + x;
      if (!covered[at]) continue;
      const gx = (x + 0.5) / ratio - 0.5;
      const gy = (y + 0.5) / ratio - 0.5;
      const hx = (heightAt(gx + 0.5, gy) - heightAt(gx - 0.5, gy)) / step;
      const hy = (heightAt(gx, gy + 0.5) - heightAt(gx, gy - 0.5)) / step;
      const length = Math.hypot(hx, hy, 1);
      height[at] = heightAt(gx, gy);
      normal[at * 2] = -hx / length;
      normal[at * 2 + 1] = -hy / length;
    }
  }
  return { field: fieldOfSurface(height, normal), albedo: null };
}
