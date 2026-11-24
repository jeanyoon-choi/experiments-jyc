// A model (types.ts ModelMake) baked into a field: its parts merged (positions and normals only, unindexed, so any
// parts merge), fitted to the disc as bubble/5–8's models are (shapes.ts fitted), seen from above as every mesh is,
// then softened a little (bubble/9, user 2026-11-05: the first models were too super-real, every grille and wire
// drawn): the height and normals blurred over SOFT, so fine detail melts into the form and every edge rounds, as
// bubble/5–8's chunky models are. One material covers it whole (no paint).

import type * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { FIELD_EXTENT, FIELD_SIZE, fieldOfSurface, rasterise, SUPERSAMPLE, type Field } from "../fields/fields.ts";
import { fitted } from "../shapes/shapes.ts";
import type { ModelMake } from "./types.ts";

function plain(geometry: THREE.BufferGeometry) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  for (const name of Object.keys(flat.attributes)) if (name !== "position" && name !== "normal") flat.deleteAttribute(name);
  if (!flat.getAttribute("normal")) flat.computeVertexNormals();
  return flat;
}

/** The model's mesh in the raft's frame, fitted to the disc. */
function meshOfModel(make: ModelMake, detailed = true) {
  const parts = make.parts(detailed).map(plain);
  const merged = mergeGeometries(parts, false);
  if (!merged) throw new Error("model: its parts do not merge (mixed attributes?)");
  const positions = new Float32Array((merged.getAttribute("position") as THREE.BufferAttribute).array);
  const normals = new Float32Array((merged.getAttribute("normal") as THREE.BufferAttribute).array);
  for (const part of parts) part.dispose();
  merged.dispose();
  return fitted({ positions, normals }, make.fill ?? 1.2);
}

/** How far the softening reaches, in object units (the disc's radius is 1). */
const SOFT = 0.035;

/** One box pass along x or y, over covered texels only (normalised), in place via `scratch`. */
function boxPass(values: Float32Array, weight: Float32Array, size: number, radius: number, alongX: boolean, scratch: Float32Array, wScratch: Float32Array) {
  for (let line = 0; line < size; line += 1) {
    let sum = 0;
    let w = 0;
    const at = (k: number) => (alongX ? line * size + k : k * size + line);
    for (let k = -radius; k < size + radius; k += 1) {
      const head = k + radius;
      if (head < size) {
        sum += values[at(head)]!;
        w += weight[at(head)]!;
      }
      const tail = k - radius - 1;
      if (tail >= 0) {
        sum -= values[at(tail)]!;
        w -= weight[at(tail)]!;
      }
      if (k >= 0 && k < size) {
        scratch[at(k)] = sum;
        wScratch[at(k)] = w;
      }
    }
  }
  values.set(scratch);
  weight.set(wScratch);
}

export function fieldOfModel(make: ModelMake): Field {
  const fine = FIELD_SIZE * SUPERSAMPLE;
  const { height, normal } = rasterise(meshOfModel(make, true), fine);
  const radius = Math.max(1, Math.round((SOFT / (FIELD_EXTENT * 2)) * fine));
  const count = fine * fine;
  const covered = new Uint8Array(count);
  for (let at = 0; at < count; at += 1) covered[at] = height[at]! > -Infinity ? 1 : 0;
  // Each channel premultiplied by coverage, blurred twice (≈ a Gaussian), then divided by the blurred coverage.
  const channels = [new Float32Array(count), new Float32Array(count), new Float32Array(count)];
  for (let at = 0; at < count; at += 1) {
    if (!covered[at]) continue;
    channels[0]![at] = height[at]!;
    channels[1]![at] = normal[at * 2]!;
    channels[2]![at] = normal[at * 2 + 1]!;
  }
  const scratch = new Float32Array(count);
  const wScratch = new Float32Array(count);
  let weight = new Float32Array(count);
  for (const channel of channels) {
    weight = new Float32Array(count);
    for (let at = 0; at < count; at += 1) weight[at] = covered[at]!;
    for (let pass = 0; pass < 2; pass += 1) {
      boxPass(channel, weight, fine, radius, true, scratch, wScratch);
      boxPass(channel, weight, fine, radius, false, scratch, wScratch);
    }
  }
  // The blurred coverage (box window of (2r+1)² twice: 1 deep inside) falls towards the outline; the height falls
  // with it, so the rim rounds over as a cast edge does, its slope added to the blurred normals'.
  const full = (2 * radius + 1) ** 4;
  const soft = new Float32Array(count);
  for (let at = 0; at < count; at += 1) {
    if (!covered[at]) continue;
    const w = Math.max(1e-6, weight[at]!);
    soft[at] = (channels[0]![at]! / w) * Math.min(1, (2 * weight[at]!) / full);
  }
  const step = (FIELD_EXTENT * 2) / fine;
  for (let y = 0; y < fine; y += 1) {
    for (let x = 0; x < fine; x += 1) {
      const at = y * fine + x;
      if (!covered[at]) continue;
      const w = Math.max(1e-6, weight[at]!);
      const nx = channels[1]![at]! / w;
      const ny = channels[2]![at]! / w;
      const nz = Math.sqrt(Math.max(0.04, 1 - nx * nx - ny * ny));
      const mean = channels[0]![at]! / w;
      // Slope of what the rim takes away (mean − soft), from its neighbours (outside: the rim's own value).
      const cut = (k: number) => (covered[k] ? (channels[0]![k]! / Math.max(1e-6, weight[k]!)) - soft[k]! : mean - soft[at]!);
      const gx = (cut(x < fine - 1 ? at + 1 : at) - cut(x > 0 ? at - 1 : at)) / (2 * step);
      const gy = (cut(y < fine - 1 ? at + fine : at) - cut(y > 0 ? at - fine : at)) / (2 * step);
      const sx = nx / nz + gx;
      const sy = ny / nz + gy;
      const length = Math.hypot(sx, sy, 1);
      height[at] = soft[at]!;
      normal[at * 2] = sx / length;
      normal[at * 2 + 1] = sy / length;
    }
  }
  return fieldOfSurface(height, normal);
}
