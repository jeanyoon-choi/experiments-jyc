// 액체 모핑 (user, 2026-10-27): every object, and the bubble itself, as one
// field over the plane, so any shape can flow into any other. The raft is seen
// from above: an object is only what faces the camera, a height over the disc
// (shapes.ts). Baked once per kind from its mesh, the field holds per texel
//   r: the height of its top surface (0 outside),
//   g: the signed distance to its outline (negative inside, object units),
//   b, a: the top surface's normal, x and y (z is the rest of a unit vector).
// object-pass.ts samples two kinds' fields and blends them as a liquid: the
// outlines' distances interpolate (the outline flows from one shape to the
// other), and while melted the height is that of a drop held by surface
// tension over the flowing outline instead of either object's.
//
// The drop's height is the outline's membrane (as shapes.ts's balloons: ∇²u = −1
// inside, u = 0 on the edge, height 2√u, exactly a sphere over a disc), kept
// coarser in a field of its own: a height made from the distance to the edge
// alone creases along the shape's middle (its medial axis), the membrane never does.

import { shapeOf, type ShapeMesh } from "./shapes.ts";
import type { ObjectKind } from "./objects";

/** The field covers [−EXTENT, EXTENT]² of the object's frame (objects reach at most 1.4 of the disc). */
export const FIELD_EXTENT = 1.5;
/** Texels per side. */
export const FIELD_SIZE = 512;
/** The membrane's texels per side. */
export const MEMBRANE_SIZE = 128;
/** Rasterised this many times finer, then averaged down, so the outline's distance is exact to a fraction of a texel. */
const SUPERSAMPLE = 2;

export type Field = {
  /** FIELD_SIZE² texels, RGBA: height, signed distance, normal x, normal y. */
  data: Float32Array;
  /** The deepest point inside the outline (its inscribed radius), object units. */
  thickness: number;
  /** The highest point of its top surface. */
  peak: number;
  /** MEMBRANE_SIZE² texels: the outline's membrane height (see the header). */
  membrane: Float32Array;
  /** How far the outline reaches from the centre along x or y at most (the square it is drawn in). */
  reach: number;
};

/** What the fields are kept for: the bubble (layer 0), then every kind. */
export type FieldKind = "bubble" | ObjectKind;

/**
 * The mesh seen from above: per fine texel, the highest surface over it and
 * its normal (interpolated from the vertices'), and whether anything covers it.
 */
function rasterise(mesh: ShapeMesh, size: number) {
  const height = new Float32Array(size * size).fill(-Infinity);
  const normal = new Float32Array(size * size * 2);
  const { positions, normals, indices } = mesh;
  const toTexel = (value: number) => ((value / FIELD_EXTENT) * 0.5 + 0.5) * size - 0.5;
  for (let index = 0; index < indices.length; index += 3) {
    const a = indices[index]! * 3;
    const b = indices[index + 1]! * 3;
    const c = indices[index + 2]! * 3;
    const ax = toTexel(positions[a]!);
    const ay = toTexel(positions[a + 1]!);
    const bx = toTexel(positions[b]!);
    const by = toTexel(positions[b + 1]!);
    const cx = toTexel(positions[c]!);
    const cy = toTexel(positions[c + 1]!);
    const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    if (Math.abs(area) < 1e-12) continue;
    const minX = Math.max(0, Math.ceil(Math.min(ax, bx, cx)));
    const maxX = Math.min(size - 1, Math.floor(Math.max(ax, bx, cx)));
    const minY = Math.max(0, Math.ceil(Math.min(ay, by, cy)));
    const maxY = Math.min(size - 1, Math.floor(Math.max(ay, by, cy)));
    for (let y = minY; y <= maxY; y += 1) {
      for (let x = minX; x <= maxX; x += 1) {
        const wa = ((bx - x) * (cy - y) - (by - y) * (cx - x)) / area;
        const wb = ((cx - x) * (ay - y) - (cy - y) * (ax - x)) / area;
        const wc = 1 - wa - wb;
        if (wa < -1e-7 || wb < -1e-7 || wc < -1e-7) continue;
        const z = wa * positions[a + 2]! + wb * positions[b + 2]! + wc * positions[c + 2]!;
        const at = y * size + x;
        if (z <= height[at]!) continue;
        height[at] = z;
        let nx = wa * normals[a]! + wb * normals[b]! + wc * normals[c]!;
        let ny = wa * normals[a + 1]! + wb * normals[b + 1]! + wc * normals[c + 1]!;
        let nz = wa * normals[a + 2]! + wb * normals[b + 2]! + wc * normals[c + 2]!;
        // The surface seen from above faces the camera.
        if (nz < 0) {
          nx = -nx;
          ny = -ny;
          nz = -nz;
        }
        const length = Math.hypot(nx, ny, nz) || 1;
        normal[at * 2] = nx / length;
        normal[at * 2 + 1] = ny / length;
      }
    }
  }
  return { height, normal };
}

/** Squared distance transform along one line (Felzenszwalb & Huttenlocher): `f` in, `d` out. */
function transformLine(f: Float64Array, n: number, d: Float64Array, v: Int32Array, z: Float64Array) {
  let k = 0;
  v[0] = 0;
  z[0] = -Infinity;
  z[1] = Infinity;
  for (let q = 1; q < n; q += 1) {
    if (f[q] === Infinity) continue;
    if (f[v[0]!] === Infinity) {
      v[0] = q;
      continue;
    }
    let s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    while (s <= z[k]!) {
      k -= 1;
      s = (f[q]! + q * q - (f[v[k]!]! + v[k]! * v[k]!)) / (2 * q - 2 * v[k]!);
    }
    k += 1;
    v[k] = q;
    z[k] = s;
    z[k + 1] = Infinity;
  }
  if (f[v[0]!] === Infinity) {
    d.fill(Infinity, 0, n);
    return;
  }
  k = 0;
  for (let q = 0; q < n; q += 1) {
    while (z[k + 1]! < q) k += 1;
    d[q] = (q - v[k]!) ** 2 + f[v[k]!]!;
  }
}

/** Per texel, the squared distance (texels) to the nearest texel where `target` holds. */
function distanceTo(target: (at: number) => boolean, size: number) {
  const grid = new Float64Array(size * size);
  for (let at = 0; at < grid.length; at += 1) grid[at] = target(at) ? 0 : Infinity;
  const f = new Float64Array(size);
  const d = new Float64Array(size);
  const v = new Int32Array(size);
  const z = new Float64Array(size + 1);
  for (let x = 0; x < size; x += 1) {
    for (let y = 0; y < size; y += 1) f[y] = grid[y * size + x]!;
    transformLine(f, size, d, v, z);
    for (let y = 0; y < size; y += 1) grid[y * size + x] = d[y]!;
  }
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) f[x] = grid[y * size + x]!;
    transformLine(f, size, d, v, z);
    for (let x = 0; x < size; x += 1) grid[y * size + x] = d[x]!;
  }
  return grid;
}

/** A mesh's field (see the header). */
export function fieldOfMesh(mesh: ShapeMesh): Field {
  const fine = FIELD_SIZE * SUPERSAMPLE;
  const { height, normal } = rasterise(mesh, fine);
  const covered = (at: number) => height[at]! > -Infinity;
  const toInside = distanceTo(covered, fine);
  const toOutside = distanceTo((at) => !covered(at), fine);
  const unit = (FIELD_EXTENT * 2) / fine;
  const data = new Float32Array(FIELD_SIZE * FIELD_SIZE * 4);
  let thickness = 0;
  let peak = 0;
  const cells = SUPERSAMPLE * SUPERSAMPLE;
  for (let y = 0; y < FIELD_SIZE; y += 1) {
    for (let x = 0; x < FIELD_SIZE; x += 1) {
      let h = 0;
      let s = 0;
      let nx = 0;
      let ny = 0;
      let inside = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const at = (y * SUPERSAMPLE + sy) * fine + x * SUPERSAMPLE + sx;
          // Half a fine texel either side of the outline, so the zero falls on the edge between texels.
          if (covered(at)) {
            s -= (Math.sqrt(toOutside[at]!) - 0.5) * unit;
            h += Math.max(0, height[at]!);
            nx += normal[at * 2]!;
            ny += normal[at * 2 + 1]!;
            inside += 1;
          } else {
            s += (Math.sqrt(toInside[at]!) - 0.5) * unit;
          }
        }
      }
      const at = (y * FIELD_SIZE + x) * 4;
      s /= cells;
      data[at] = inside > 0 ? h / inside : 0;
      data[at + 1] = s;
      data[at + 2] = inside > 0 ? nx / inside : 0;
      data[at + 3] = inside > 0 ? ny / inside : 0;
      thickness = Math.max(thickness, -s);
      peak = Math.max(peak, data[at]!);
    }
  }
  return { data, thickness, peak, membrane: membraneOf(data), reach: reachOf(data) };
}

/** The furthest texel inside the outline from the centre, along x or y (object units, a texel's margin). */
function reachOf(data: Float32Array) {
  const unit = (FIELD_EXTENT * 2) / FIELD_SIZE;
  let reach = 0;
  for (let y = 0; y < FIELD_SIZE; y += 1) {
    for (let x = 0; x < FIELD_SIZE; x += 1) {
      if (data[(y * FIELD_SIZE + x) * 4 + 1]! >= 0) continue;
      reach = Math.max(reach, Math.abs((x + 0.5) * unit - FIELD_EXTENT), Math.abs((y + 0.5) * unit - FIELD_EXTENT));
    }
  }
  return Math.min(FIELD_EXTENT, reach + 2 * unit);
}

/** The bubble's field, exactly and at once (the raft's first frames need it): a unit sphere over its disc. */
function bubbleField(): Field {
  const unit = (FIELD_EXTENT * 2) / FIELD_SIZE;
  const data = new Float32Array(FIELD_SIZE * FIELD_SIZE * 4);
  for (let y = 0; y < FIELD_SIZE; y += 1) {
    for (let x = 0; x < FIELD_SIZE; x += 1) {
      const px = (x + 0.5) * unit - FIELD_EXTENT;
      const py = (y + 0.5) * unit - FIELD_EXTENT;
      const r = Math.hypot(px, py);
      const at = (y * FIELD_SIZE + x) * 4;
      const h = r < 1 ? Math.sqrt(1 - r * r) : 0;
      data[at] = h;
      data[at + 1] = r - 1;
      data[at + 2] = r < 1 ? px : 0;
      data[at + 3] = r < 1 ? py : 0;
    }
  }
  const membrane = new Float32Array(MEMBRANE_SIZE * MEMBRANE_SIZE);
  const cell = (FIELD_EXTENT * 2) / MEMBRANE_SIZE;
  for (let y = 0; y < MEMBRANE_SIZE; y += 1) {
    for (let x = 0; x < MEMBRANE_SIZE; x += 1) {
      const r = Math.hypot((x + 0.5) * cell - FIELD_EXTENT, (y + 0.5) * cell - FIELD_EXTENT);
      membrane[y * MEMBRANE_SIZE + x] = r < 1 ? Math.sqrt(1 - r * r) : 0;
    }
  }
  return { data, thickness: 1, peak: 1, membrane, reach: 1 + 2 * unit };
}

/** The membrane over the outline (negative distance) in `data`, by over-relaxed Gauss–Seidel on a coarse grid. */
function membraneOf(data: Float32Array) {
  const size = MEMBRANE_SIZE;
  const ratio = FIELD_SIZE / size;
  const inside = new Uint8Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      // The field's distance at this cell's centre.
      const fx = Math.min(FIELD_SIZE - 1, Math.round((x + 0.5) * ratio - 0.5));
      const fy = Math.min(FIELD_SIZE - 1, Math.round((y + 0.5) * ratio - 0.5));
      inside[y * size + x] = data[(fy * FIELD_SIZE + fx) * 4 + 1]! < 0 ? 1 : 0;
    }
  }
  const step = (FIELD_EXTENT * 2) / size;
  const u = new Float64Array(size * size);
  const relax = 2 / (1 + Math.sin(Math.PI / size));
  for (let sweep = 0; sweep < size * 3; sweep += 1) {
    for (let y = 1; y < size - 1; y += 1) {
      for (let x = 1; x < size - 1; x += 1) {
        const at = y * size + x;
        if (!inside[at]) continue;
        const next = (u[at - 1]! + u[at + 1]! + u[at - size]! + u[at + size]! + step * step) / 4;
        u[at] = u[at]! + relax * (next - u[at]!);
      }
    }
  }
  const membrane = new Float32Array(size * size);
  for (let at = 0; at < membrane.length; at += 1) membrane[at] = 2 * Math.sqrt(Math.max(0, u[at]!));
  return membrane;
}

/** The field of a kind, or of the bubble. */
export function fieldOf(kind: FieldKind): Field {
  return kind === "bubble" ? bubbleField() : fieldOfMesh(shapeOf(kind));
}
