// The objects' meshes, each one inflated volume as a bubble is one sphere.
// Coordinates are the raft's screen frame: x right, y down, z towards the
// camera; an object fills the unit disc (a bubble of radius 1) and rises
// from z 0. Only the side facing the camera is built: the raft is seen from
// above.
//
// A part is a flat outline inflated like a balloon: from its centre, every
// direction runs out to the outline, and the height falls from the top to
// nothing at the edge, as a sphere's does over its disc (profile 2), or
// flatter on top and rounder at the edge (higher profiles). An object is a
// few parts in one material: a part laid on another (the robot's eyes, the
// GPU's fans) rises from its height there.

import { gpuGeometry } from "./gpu.ts";
import { isModel, modelGeometry } from "./models.ts";
import type { ObjectKind } from "./objects";

export type ShapeMesh = {
  /** x y z per vertex. */
  positions: Float32Array;
  /** Unit normals, x y z per vertex. */
  normals: Float32Array;
  indices: Uint32Array;
};

type Part = {
  /** Inside the outline (outline coordinates, the part's centre at the origin); the outline must be star-shaped about it. */
  inside: (x: number, y: number) => boolean;
  /** How far out the outline may reach from the centre, for the search. */
  reach: number;
  x: number;
  y: number;
  /** Height at the top, and where it starts (another part's height under it). */
  height: number;
  base: number;
  /** 2: a sphere's fall to the edge; higher: flatter on top, a rounder edge. */
  profile: number;
  /**
   * Blown up as a balloon is, instead of by profile: the height is that of a
   * membrane under pressure over the outline (∇²u = −1 inside, u = 0 on the
   * edge; height = 2√u, exactly a sphere over a disc), so lobes swell into one
   * another without a ridge or crease, and `height` scales it (1: a sphere's).
   */
  balloon: boolean;
  sectors: number;
  rings: number;
};

const superellipse = (a: number, b: number, power: number) => (x: number, y: number) => Math.abs(x / a) ** power + Math.abs(y / b) ** power <= 1;
const circle = (radius: number) => (x: number, y: number) => x * x + y * y <= radius * radius;
const capsule = (ax: number, ay: number, bx: number, by: number, radius: number) => (x: number, y: number) => {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.min(1, Math.max(0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - ax - dx * t, y - ay - dy * t) <= radius;
};
/** Inside the triangle a b c. */
const triangle = (a: readonly [number, number], b: readonly [number, number], c: readonly [number, number]) => (x: number, y: number) => {
  const side = (p: readonly [number, number], q: readonly [number, number]) => (q[0] - p[0]) * (y - p[1]) - (q[1] - p[1]) * (x - p[0]);
  const ab = side(a, b);
  const bc = side(b, c);
  const ca = side(c, a);
  return (ab >= 0 && bc >= 0 && ca >= 0) || (ab <= 0 && bc <= 0 && ca <= 0);
};
const union =
  (...shapes: ((x: number, y: number) => boolean)[]) =>
  (x: number, y: number) =>
    shapes.some((shape) => shape(x, y));

function part(inside: Part["inside"], reach: number, options: Partial<Omit<Part, "inside" | "reach">> = {}): Part {
  return { inside, reach, x: 0, y: 0, height: 0.5, base: 0, profile: 2, balloon: false, sectors: 64, rings: 10, ...options };
}

/** The height of a part `profile` at a share `s` of the way from its centre to its edge. */
function rise(s: number, profile: number) {
  return Math.max(0, 1 - Math.min(1, s) ** profile) ** (1 / profile);
}

/**
 * The objects as they stand, each to fill the unit disc. Proportions follow
 * the emoji-like icon everyone reads: ✨'s four-pointed star, ☁'s puffed
 * cloud, a graphics card from above with its two fans, 🤖's head.
 */
function partsOf(kind: ObjectKind): Part[] {
  switch (kind) {
    case "sparkle":
      // One four-pointed star with concave sides, its points the longest reach.
      return [part(superellipse(1, 1, 0.62), 1.05, { height: 0.62, sectors: 128, rings: 12 })];
    case "cloud": {
      // One cloud: three puffs over a flat, rounded bottom, inflated as one.
      const cloud = union(
        (x, y) => (x - 0.02) ** 2 + (y + 0.2) ** 2 <= 0.47 ** 2,
        (x, y) => (x + 0.52) ** 2 + (y - 0.08) ** 2 <= 0.33 ** 2,
        (x, y) => (x - 0.5) ** 2 + (y - 0.04) ** 2 <= 0.37 ** 2,
        capsule(-0.55, 0.2, 0.55, 0.2, 0.21),
      );
      return [part(cloud, 1.1, { height: 0.8, profile: 2.2, sectors: 96, rings: 12 })];
    }
    case "gpu":
      // Hard-surface, not inflated: gpu.ts.
      return [];
    case "chat": {
      // A chatbot's speech bubble, its tail to the lower left, three dots on it (typing).
      const bubble = union(superellipse(0.95, 0.66, 4), (x, y) => {
        // The tail: a triangle from the bubble's lower left corner.
        const u = (x + 0.75) / 0.45;
        return y > 0.3 && y < 0.9 && u > 0 && u < 1 - (y - 0.3) / 0.6;
      });
      return [
        part(bubble, 1.2, { height: 0.6, profile: 2.6, sectors: 128, rings: 12 }),
        ...[-0.38, 0, 0.38].map((x) => part(circle(0.13), 0.15, { x, y: -0.02, base: 0.58, height: 0.13, sectors: 24, rings: 5 })),
      ];
    }
    case "humanoid":
    case "robotDog":
    case "roadster":
    case "headset":
    case "ape":
    case "rocket":
    case "spinner":
      // Hard-surface: models.ts.
      return [];
    case "heart":
      // Koons's heart: the heart's outline blown up as one balloon, its two lobes swelling into each other
      // with no ridge down the middle.
      return [part((x, y) => (x * x + y * y - 1) ** 3 + x * x * y * y * y <= 0, 1.4, { y: 0.05, height: 0.9, balloon: true, sectors: 160, rings: 18 })];
    case "comment":
      // A comment's speech bubble as a balloon: a wide round body, its tail to the lower right, one membrane.
      return [
        part(
          // The tail leans off the radius, rooted on the lower rim, as a speech bubble's does (radial, it read as a drop).
          union(superellipse(0.9, 0.78, 2), triangle([0.18, 0.62], [0.55, 0.52], [0.78, 1.05])),
          1.2,
          { height: 0.9, balloon: true, sectors: 160, rings: 18 },
        ),
      ];
    case "like":
      // A thumbs-up made of balloons, as a balloon twister would: the fist, its finger rolls, the thumb up, the cuff.
      return [
        part(capsule(0, 0, 0, -0.5, 0.17), 0.75, { x: -0.02, y: -0.08, height: 0.55, sectors: 64, rings: 10 }),
        part(superellipse(0.42, 0.38, 3), 0.5, { x: 0.12, y: 0.3, height: 0.72, profile: 2.4, sectors: 96, rings: 12 }),
        ...[0.1, 0.27, 0.44].map((y) => part(capsule(-0.22, 0, 0.22, 0, 0.085), 0.32, { x: 0.18, y: y + 0.02, base: 0.56, height: 0.18, sectors: 40, rings: 6 })),
        part(superellipse(0.15, 0.42, 4), 0.48, { x: -0.33, y: 0.3, height: 0.6, profile: 3, sectors: 64, rings: 10 }),
      ];
    case "robot": {
      // 🤖's head: a rounded box with ears, an antenna and its ball, two eyes and a mouth on its face.
      const head = 0.68;
      return [
        part(superellipse(0.66, 0.54, 4), 0.9, { y: 0.16, height: head, profile: 3, sectors: 96, rings: 10 }),
        part(superellipse(0.1, 0.2, 2.5), 0.25, { x: -0.71, y: 0.16, height: 0.26, sectors: 24, rings: 5 }),
        part(superellipse(0.1, 0.2, 2.5), 0.25, { x: 0.71, y: 0.16, height: 0.26, sectors: 24, rings: 5 }),
        part(capsule(0, 0, 0, -0.26, 0.05), 0.3, { y: -0.36, height: 0.12, sectors: 32, rings: 4 }),
        part(circle(0.13), 0.15, { y: -0.72, height: 0.15, sectors: 24, rings: 5 }),
        part(circle(0.13), 0.15, { x: -0.25, y: 0.08, base: head * 0.97, height: 0.1, sectors: 24, rings: 5 }),
        part(circle(0.13), 0.15, { x: 0.25, y: 0.08, base: head * 0.97, height: 0.1, sectors: 24, rings: 5 }),
        part(capsule(-0.2, 0, 0.2, 0, 0.055), 0.28, { y: 0.4, base: head * 0.9, height: 0.05, sectors: 32, rings: 4 }),
      ];
    }
  }
}

/** The balloon's membrane over the part's outline (see Part.balloon): heights at any point of it, in its own units. */
function membraneOf(part: Part, cells: number) {
  const size = cells + 1;
  const step = (part.reach * 2) / cells;
  const inside = new Uint8Array(size * size);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) inside[row * size + column] = part.inside(-part.reach + column * step, -part.reach + row * step) ? 1 : 0;
  }
  // ∇²u = −1 inside, 0 outside, by over-relaxed Gauss–Seidel.
  const u = new Float64Array(size * size);
  const relax = 2 / (1 + Math.sin(Math.PI / cells));
  for (let sweep = 0; sweep < cells * 3; sweep += 1) {
    for (let row = 1; row < size - 1; row += 1) {
      for (let column = 1; column < size - 1; column += 1) {
        const at = row * size + column;
        if (!inside[at]) continue;
        const next = (u[at - 1]! + u[at + 1]! + u[at - size]! + u[at + size]! + step * step) / 4;
        u[at] = u[at]! + relax * (next - u[at]!);
      }
    }
  }
  return (x: number, y: number) => {
    const fx = Math.min(cells - 1e-6, Math.max(0, (x + part.reach) / step));
    const fy = Math.min(cells - 1e-6, Math.max(0, (y + part.reach) / step));
    const column = Math.floor(fx);
    const row = Math.floor(fy);
    const tx = fx - column;
    const ty = fy - row;
    const at = row * size + column;
    const value = (u[at]! * (1 - tx) + u[at + 1]! * tx) * (1 - ty) + (u[at + size]! * (1 - tx) + u[at + size + 1]! * tx) * ty;
    return 2 * Math.sqrt(Math.max(0, value));
  };
}

/** Along each direction from the part's centre, how far its outline reaches (bisection on `inside`). */
function outlineOf(part: Part) {
  const reaches = new Float64Array(part.sectors);
  for (let sector = 0; sector < part.sectors; sector += 1) {
    const angle = (sector / part.sectors) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // The furthest point inside, stepping in from beyond the reach, then refined.
    let outside = part.reach;
    let inside = 0;
    for (let step = 160; step >= 0; step -= 1) {
      const t = (step / 160) * part.reach;
      if (part.inside(cos * t, sin * t)) {
        inside = t;
        outside = Math.min(part.reach, t + part.reach / 160);
        break;
      }
    }
    for (let round = 0; round < 24; round += 1) {
      const middle = (inside + outside) / 2;
      if (part.inside(cos * middle, sin * middle)) inside = middle;
      else outside = middle;
    }
    reaches[sector] = inside;
  }
  return reaches;
}

/**
 * How far past the disc each object reaches, so it covers about as much of
 * the screen as the bubble would (a star or a card covers far less of its
 * disc: measured 33% sparkle, 57% cloud, 42% GPU, 66% robot), without the
 * star's points reaching far into its neighbours.
 */
const FILL: Record<ObjectKind, number> = {
  sparkle: 1.4,
  cloud: 1.3,
  gpu: 1.4,
  robot: 1.2,
  humanoid: 1.3,
  robotDog: 1.25,
  roadster: 1.2,
  headset: 1.15,
  ape: 1.1,
  rocket: 1.3,
  chat: 1.15,
  spinner: 1.05,
  heart: 1.12,
  like: 1.15,
  comment: 1.08,
};

/** One object's mesh, its parts together, scaled to fill the unit disc; `detailed` false: lighter, for small ones. */
export function shapeOf(kind: ObjectKind, detailed = true): ShapeMesh {
  if (kind === "gpu") {
    const { positions, normals } = gpuGeometry(detailed);
    for (let index = 0; index < positions.length; index += 3) {
      positions[index] = positions[index]! * FILL.gpu;
      positions[index + 1] = positions[index + 1]! * FILL.gpu;
    }
    return { positions, normals, indices: Uint32Array.from({ length: positions.length / 3 }, (_, index) => index) };
  }
  if (isModel(kind)) return fitted(modelGeometry(kind, detailed), FILL[kind]);
  const parts = partsOf(kind).map((part) => (detailed ? part : { ...part, sectors: Math.max(12, Math.round(part.sectors / 2)), rings: Math.max(3, Math.round(part.rings / 2)) }));
  const positions: number[] = [];
  const indices: number[] = [];
  /** Vertices whose heights are in the outline's own units (balloons), to scale with it. */
  const scaled: number[] = [];
  /** A balloon's normals, from its membrane's slope rather than its triangles (no seam where the mesh pinches). */
  const exact = new Map<number, readonly [number, number, number]>();
  let furthest = 0;
  for (const part of parts) {
    const reaches = outlineOf(part);
    const first = positions.length / 3;
    const membrane = part.balloon ? membraneOf(part, detailed ? 160 : 72) : null;
    const heightAt = (localX: number, localY: number, s: number) =>
      membrane ? (s >= 1 ? 0 : part.height * membrane(localX, localY)) : part.base + part.height * rise(s, part.profile);
    positions.push(part.x, part.y, heightAt(0, 0, 0));
    if (membrane) scaled.push(first);
    // Rings closer together towards the edge, where the height falls fastest.
    for (let ring = 1; ring <= part.rings; ring += 1) {
      const s = Math.sin((ring / part.rings) * (Math.PI / 2));
      for (let sector = 0; sector < part.sectors; sector += 1) {
        const angle = (sector / part.sectors) * Math.PI * 2;
        const localX = Math.cos(angle) * reaches[sector]! * s;
        const localY = Math.sin(angle) * reaches[sector]! * s;
        const x = part.x + localX;
        const y = part.y + localY;
        furthest = Math.max(furthest, Math.hypot(x, y));
        if (membrane) {
          const vertex = positions.length / 3;
          scaled.push(vertex);
          // The slope a hair inside the edge for the edge itself, where it turns straight down.
          const inner = Math.min(s, 0.995);
          const px = Math.cos(angle) * reaches[sector]! * inner;
          const py = Math.sin(angle) * reaches[sector]! * inner;
          // Over about a cell of the membrane, so its bilinear facets do not show.
          const step = part.reach / 70;
          const gx = (part.height * (membrane(px + step, py) - membrane(px - step, py))) / (2 * step);
          const gy = (part.height * (membrane(px, py + step) - membrane(px, py - step))) / (2 * step);
          const length = Math.hypot(gx, gy, 1);
          exact.set(vertex, [-gx / length, -gy / length, 1 / length]);
        }
        positions.push(x, y, heightAt(localX, localY, s));
      }
    }
    const at = (ring: number, sector: number) => first + 1 + (ring - 1) * part.sectors + (sector % part.sectors);
    // Wound counter-clockwise as seen from the camera (y down on screen).
    for (let sector = 0; sector < part.sectors; sector += 1) indices.push(first, at(1, sector + 1), at(1, sector));
    for (let ring = 1; ring < part.rings; ring += 1) {
      for (let sector = 0; sector < part.sectors; sector += 1) {
        const a = at(ring, sector);
        const b = at(ring, sector + 1);
        const c = at(ring + 1, sector);
        const d = at(ring + 1, sector + 1);
        indices.push(a, b, c, b, d, c);
      }
    }
  }
  // Fill the unit disc, and past it by FILL; a balloon's heights scale with its outline.
  const scale = FILL[kind] / furthest;
  for (const vertex of scaled) positions[vertex * 3 + 2] = positions[vertex * 3 + 2]! * scale;
  for (let index = 0; index < positions.length; index += 3) {
    positions[index] = positions[index]! * scale;
    positions[index + 1] = positions[index + 1]! * scale;
  }
  const normals = normalsOf(positions, indices);
  for (const [vertex, normal] of exact) normals.set(normal, vertex * 3);
  return { positions: new Float32Array(positions), normals, indices: new Uint32Array(indices) };
}

/**
 * A model from three.js's frame (y up) into the raft's (y down), centred on
 * its outline, its furthest point at `fill`, standing on z 0.
 */
function fitted({ positions, normals }: { positions: Float32Array; normals: Float32Array }, fill: number): ShapeMesh {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let minZ = Infinity;
  for (let index = 0; index < positions.length; index += 3) {
    minX = Math.min(minX, positions[index]!);
    maxX = Math.max(maxX, positions[index]!);
    minY = Math.min(minY, positions[index + 1]!);
    maxY = Math.max(maxY, positions[index + 1]!);
    minZ = Math.min(minZ, positions[index + 2]!);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  let furthest = 0;
  for (let index = 0; index < positions.length; index += 3) furthest = Math.max(furthest, Math.hypot(positions[index]! - cx, positions[index + 1]! - cy));
  const scale = fill / furthest;
  for (let index = 0; index < positions.length; index += 3) {
    positions[index] = (positions[index]! - cx) * scale;
    positions[index + 1] = -(positions[index + 1]! - cy) * scale;
    positions[index + 2] = (positions[index + 2]! - minZ) * scale;
    normals[index + 1] = -normals[index + 1]!;
  }
  return { positions, normals, indices: Uint32Array.from({ length: positions.length / 3 }, (_, index) => index) };
}

/** Smooth normals: each vertex's faces' normals, by area, turned towards the camera. */
function normalsOf(positions: number[], indices: number[]) {
  const normals = new Float32Array(positions.length);
  for (let index = 0; index < indices.length; index += 3) {
    const a = indices[index]! * 3;
    const b = indices[index + 1]! * 3;
    const c = indices[index + 2]! * 3;
    const ux = positions[b]! - positions[a]!;
    const uy = positions[b + 1]! - positions[a + 1]!;
    const uz = positions[b + 2]! - positions[a + 2]!;
    const vx = positions[c]! - positions[a]!;
    const vy = positions[c + 1]! - positions[a + 1]!;
    const vz = positions[c + 2]! - positions[a + 2]!;
    let nx = uy * vz - uz * vy;
    let ny = uz * vx - ux * vz;
    let nz = ux * vy - uy * vx;
    // Facing the camera (+z) whatever the winding.
    if (nz < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    for (const vertex of [a, b, c]) {
      normals[vertex] = normals[vertex]! + nx;
      normals[vertex + 1] = normals[vertex + 1]! + ny;
      normals[vertex + 2] = normals[vertex + 2]! + nz;
    }
  }
  for (let index = 0; index < normals.length; index += 3) {
    const length = Math.hypot(normals[index]!, normals[index + 1]!, normals[index + 2]!) || 1;
    normals[index] = normals[index]! / length;
    normals[index + 1] = normals[index + 1]! / length;
    normals[index + 2] = normals[index + 2]! / length;
  }
  return normals;
}
