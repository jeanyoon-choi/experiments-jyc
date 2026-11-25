// 액체 모핑 (user, 2026-10-27): every object, and the bubble itself, as one
// field over the plane, so any shape can flow into any other. The raft is seen
// from above: an object is only what faces the camera, a height over the disc
// (shapes.ts). Baked once per kind from its mesh, the field holds per texel
//   r: the height of its top surface (0 outside),
//   g: the signed distance to its outline (negative inside, object units),
//   b, a: the top surface's normal, x and y (z is the rest of a unit vector).
// The object pass (pass/shader.ts) samples two kinds' fields and blends them as a liquid: the
// outlines' distances interpolate (the outline flows from one shape to the
// other), and while melted the height is that of a drop held by surface
// tension over the flowing outline instead of either object's.
//
// The drop's height is the outline's membrane (as shapes.ts's balloons: ∇²u = −1
// inside, u = 0 on the edge, height 2√u, exactly a sphere over a disc), kept
// coarser in a field of its own: a height made from the distance to the edge
// alone creases along the shape's middle (its medial axis), the membrane never does.

import { headSurface, type FaceBox, type Portrait } from "../shapes/faces.ts";
import { GLYPHS, GLYPH_BOLD } from "../shapes/currency.ts";
import { KIND, type CurrencyKind, type LogoKind, type ObjectKind } from "../kinds/groups.ts";
import { coverageOf, MARK_FILL, MARKS } from "../shapes/marks.ts";
import { shapeOf, type MeshKind, type ShapeMesh } from "../shapes/shapes.ts";
import { bubbleField } from "./bubble-field.ts";
import { FIELD_EXTENT, FIELD_SIZE, MEMBRANE_SIZE, SUPERSAMPLE, type Field } from "./frame.ts";

export { FIELD_EXTENT, FIELD_SIZE, MEMBRANE_SIZE, SUPERSAMPLE, type Field };

/** What the fields are kept for: the bubble (layer 0), then every kind. */
export type FieldKind = "bubble" | ObjectKind;

/**
 * The mesh seen from above: per fine texel, the highest surface over it and
 * its normal (interpolated from the vertices'), and whether anything covers it.
 */
export function rasterise(mesh: ShapeMesh, size: number) {
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
export function distanceTo(target: (at: number) => boolean, size: number) {
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
function fieldOfMesh(mesh: ShapeMesh): Field {
  const fine = FIELD_SIZE * SUPERSAMPLE;
  const { height, normal } = rasterise(mesh, fine);
  return fieldOfSurface(height, normal);
}

/** The membrane's grid for a mark: fine enough for its thinnest strokes (a few texels across). */
export const MARK_MEMBRANE = 256;
/** A mark's balloon height over its inscribed radius (shapes.ts's heart: 0.9). */
export const MARK_HEIGHT = 0.9;

/**
 * A mark's field (marks.ts): its fill blown up as one balloon, ∇²u = −1 inside, height 2√u (a sphere over a
 * disc), the normal from the height's slope. Solved on a coarser grid and read bilinearly at the fine one.
 */
export function fieldOfMark(kind: LogoKind): Field {
  return fieldOfFill(coverageOf(MARKS[kind].path, FIELD_SIZE * SUPERSAMPLE, FIELD_EXTENT));
}

/**
 * A currency sign's field (currency.ts): its glyph filled a little smaller than a mark, then grown by GLYPH_BOLD
 * all round (every texel within that distance of the fill), so a regular weight's thin strokes become plump,
 * round-ended tubes before they are blown up as a mark's are.
 */
export function fieldOfGlyph(kind: CurrencyKind): Field {
  const fine = FIELD_SIZE * SUPERSAMPLE;
  const thin = coverageOf(GLYPHS[kind], fine, FIELD_EXTENT, MARK_FILL - GLYPH_BOLD);
  const distance = distanceTo((at) => thin[at] === 1, fine);
  const radius = (GLYPH_BOLD / (FIELD_EXTENT * 2)) * fine;
  const coverage = new Uint8Array(fine * fine);
  for (let at = 0; at < coverage.length; at += 1) coverage[at] = distance[at]! <= radius * radius ? 1 : 0;
  return fieldOfFill(coverage);
}

/** A filled outline (1 inside, 0 outside, on the fine grid) blown up as one balloon (fieldOfMark). */
function fieldOfFill(coverage: Uint8Array): Field {
  const fine = FIELD_SIZE * SUPERSAMPLE;
  const size = MARK_MEMBRANE;
  const ratio = fine / size;
  // A coarse cell is inside where most of its fine texels are.
  const inside = new Uint8Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      let count = 0;
      for (let sy = 0; sy < ratio; sy += 1) for (let sx = 0; sx < ratio; sx += 1) count += coverage[(y * ratio + sy) * fine + x * ratio + sx]!;
      inside[y * size + x] = count * 2 > ratio * ratio ? 1 : 0;
    }
  }
  const u = solveMembrane(inside, size);
  const step = (FIELD_EXTENT * 2) / size;
  const heightAt = (gx: number, gy: number) => {
    const fx = Math.min(size - 1.001, Math.max(0, gx));
    const fy = Math.min(size - 1.001, Math.max(0, gy));
    const x = Math.floor(fx);
    const y = Math.floor(fy);
    const tx = fx - x;
    const ty = fy - y;
    const at = y * size + x;
    const value = (u[at]! * (1 - tx) + u[at + 1]! * tx) * (1 - ty) + (u[at + size]! * (1 - tx) + u[at + size + 1]! * tx) * ty;
    return MARK_HEIGHT * 2 * Math.sqrt(Math.max(0, value));
  };
  const height = new Float32Array(fine * fine).fill(-Infinity);
  const normal = new Float32Array(fine * fine * 2);
  for (let y = 0; y < fine; y += 1) {
    for (let x = 0; x < fine; x += 1) {
      const at = y * fine + x;
      if (!coverage[at]) continue;
      // This fine texel's centre on the coarse grid.
      const gx = (x + 0.5) / ratio - 0.5;
      const gy = (y + 0.5) / ratio - 0.5;
      const h = heightAt(gx, gy);
      const hx = (heightAt(gx + 0.5, gy) - heightAt(gx - 0.5, gy)) / step;
      const hy = (heightAt(gx, gy + 0.5) - heightAt(gx, gy - 0.5)) / step;
      const length = Math.hypot(hx, hy, 1);
      height[at] = h;
      normal[at * 2] = -hx / length;
      normal[at * 2 + 1] = -hy / length;
    }
  }
  return fieldOfSurface(height, normal);
}

/**
 * A face's field (faces.ts): its head, the portrait's relief on it, read at the fine grid and made a field
 * as every other kind's. The portrait comes decoded (faces.ts loadPortrait), so this stays synchronous.
 */
export function fieldOfHead(portrait: Portrait, box: FaceBox): Field {
  const { height, normal } = headSurface(portrait, box, FIELD_SIZE * SUPERSAMPLE, FIELD_EXTENT);
  return fieldOfSurface(height, normal);
}

/** The field of a surface seen from above: per fine texel its height (−∞ where nothing covers it) and normal x, y. */
export function fieldOfSurface(height: Float32Array, normal: Float32Array): Field {
  const fine = FIELD_SIZE * SUPERSAMPLE;
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
  return { data, thickness, peak, membrane: membraneOf(data), ...reachOf(data) };
}

/** The furthest texel inside the outline from the centre, along x or y (reach) and in any direction (outline); object units, a texel's margin. */
function reachOf(data: Float32Array) {
  const unit = (FIELD_EXTENT * 2) / FIELD_SIZE;
  let reach = 0;
  let outline = 0;
  for (let y = 0; y < FIELD_SIZE; y += 1) {
    for (let x = 0; x < FIELD_SIZE; x += 1) {
      if (data[(y * FIELD_SIZE + x) * 4 + 1]! >= 0) continue;
      const px = Math.abs((x + 0.5) * unit - FIELD_EXTENT);
      const py = Math.abs((y + 0.5) * unit - FIELD_EXTENT);
      reach = Math.max(reach, px, py);
      outline = Math.max(outline, px * px + py * py);
    }
  }
  return { reach: Math.min(FIELD_EXTENT, reach + 2 * unit), outline: Math.sqrt(outline) + 2 * unit };
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
  const u = solveMembrane(inside, size);
  const membrane = new Float32Array(size * size);
  for (let at = 0; at < membrane.length; at += 1) membrane[at] = 2 * Math.sqrt(Math.max(0, u[at]!));
  return membrane;
}

/**
 * ∇²u = −1 where `inside`, 0 elsewhere, over [−EXTENT, EXTENT]² on a `size`² grid, by over-relaxed Gauss–Seidel:
 * size × 3 sweeps, each cell in turn u ← u + relax × ((left + right + up + down + step²) / 4 − u), row by row.
 *
 * Most of a bake's time is here, and a sweep in that order is one long chain (each cell waits for the one to its
 * left). So four rows are swept abreast, each one column behind the row above it, over the rows and columns that
 * hold any cell: a cell still reads its left and upper neighbours as this sweep left them and its right and lower
 * ones as the sweep before did, so every value is, bit for bit, the row-by-row sweep's (fields.test.ts holds the
 * two against each other), in about half the time.
 */
export function solveMembrane(inside: Uint8Array, size: number) {
  const step = (FIELD_EXTENT * 2) / size;
  const u = new Float64Array(size * size);
  const relax = 2 / (1 + Math.sin(Math.PI / size));
  const source = step * step;
  let top = size;
  let bottom = 0;
  let left = size;
  let right = 0;
  for (let y = 1; y < size - 1; y += 1) {
    for (let x = 1; x < size - 1; x += 1) {
      if (!inside[y * size + x]) continue;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  for (let sweep = 0; sweep < size * 3; sweep += 1) {
    for (let y = top; y <= bottom; y += 4) {
      const rows = Math.min(4, bottom - y + 1);
      const row = y * size;
      for (let column = left; column < right + rows; column += 1) {
        for (let lag = 0; lag < rows; lag += 1) {
          const x = column - lag;
          if (x < left || x > right) continue;
          const at = row + lag * size + x;
          if (!inside[at]) continue;
          const was = u[at]!;
          u[at] = was + relax * ((u[at - 1]! + u[at + 1]! + u[at - size]! + u[at + size]! + source) / 4 - was);
        }
      }
    }
  }
  return u;
}

/** The field of a kind, or of the bubble; a face's needs its portrait first (fieldOfHead, field-worker.ts). */
export function fieldOf(kind: FieldKind): Field {
  if (kind === "bubble") return bubbleField();
  if (KIND[kind].source === "mark") return fieldOfMark(kind as LogoKind);
  if (KIND[kind].source === "glyph") return fieldOfGlyph(kind as CurrencyKind);
  if (KIND[kind].source === "face") throw new Error(`${kind}: a face's field is baked from its portrait (fieldOfHead)`);
  if (KIND[kind].make) throw new Error(`${kind}: a catalogue kind is baked by bake.ts (catalogue/relief.ts, catalogue/model.ts)`);
  return fieldOfMesh(shapeOf(kind as MeshKind));
}
