// Sculpting helpers for 금붕어의 천적 (foes.ts): bodies as lofted volumes rather than boxes and capsules, so an
// animal's masses (a heron's S-neck, a bass's deep flank, a turtle's dome) are one continuous form. Everything is
// three.js geometry in three.js's frame (x right, y up, z towards the camera), baked by model.ts as every model is:
// seen from +z, fitted to the disc, softened. Nothing here runs per frame; a kind is built once, in a bake worker.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export type Geometry = THREE.BufferGeometry;

/**
 * One station of a loft: x, y, z of the spine, then the section's radii — `up` (to the left of the spine's travel
 * in the picture plane: the back of an animal heading +x), `down` (default `up`) and `w`, half its depth towards the
 * camera (default the mean of the two).
 */
export type Station = readonly [x: number, y: number, z: number, up: number, down?: number, w?: number];

export type LoftOptions = {
  /** Vertices round each section (default 18). */
  readonly seg?: number;
  /** Sections between two stations (default 6). */
  readonly sub?: number;
  /** How far each end rounds over, in its own mean radius: 1 a hemisphere, 0 cut flat (default 1; or [start, end]). */
  readonly cap?: number | readonly [number, number];
  /** The section's superellipse power: 2 an ellipse, higher boxier (default 2). */
  readonly sq?: number;
};

const CAP_RINGS = 3;

/**
 * A volume lofted through its stations: the spine a centripetal Catmull–Rom curve, the radii flowing with it, every
 * section a (super)ellipse standing across the spine, both ends rounded over. Smooth normals.
 */
export function loft(stations: readonly Station[], options: LoftOptions = {}): Geometry {
  const seg = options.seg ?? 18;
  const sub = options.sub ?? 6;
  const power = 2 / (options.sq ?? 2);
  const [capStart, capEnd] = typeof options.cap === "number" ? [options.cap, options.cap] : (options.cap ?? [1, 1]);
  const points = stations.map((s) => new THREE.Vector3(s[0], s[1], s[2]));
  const sizes = stations.map((s) => new THREE.Vector3(s[3], s[4] ?? s[3], s[5] ?? (s[3] + (s[4] ?? s[3])) / 2));
  const many = stations.length > 2;
  const spine = many ? new THREE.CatmullRomCurve3(points, false, "centripetal") : new THREE.LineCurve3(points[0]!, points[1]!);
  const radii = many ? new THREE.CatmullRomCurve3(sizes, false, "catmullrom", 0.5) : new THREE.LineCurve3(sizes[0]!, sizes[1]!);

  type Ring = { c: THREE.Vector3; t: THREE.Vector3; up: number; down: number; w: number };
  const rings: Ring[] = [];
  const count = (stations.length - 1) * sub + 1;
  for (let index = 0; index < count; index += 1) {
    const at = index / (count - 1);
    const size = radii.getPoint(at);
    rings.push({ c: spine.getPoint(at), t: spine.getTangent(at).normalize(), up: Math.max(1e-3, size.x), down: Math.max(1e-3, size.y), w: Math.max(1e-3, size.z) });
  }
  const capped = (ring: Ring, length: number, sign: number) => {
    const reach = (length * (ring.up + ring.down)) / 2;
    const out: Ring[] = [];
    for (let k = 1; k <= CAP_RINGS; k += 1) {
      const phi = (k / (CAP_RINGS + 1)) * (Math.PI / 2);
      const scale = Math.cos(phi);
      out.push({ c: ring.c.clone().addScaledVector(ring.t, sign * Math.sin(phi) * reach), t: ring.t, up: ring.up * scale, down: ring.down * scale, w: ring.w * scale });
    }
    return { rings: out, pole: ring.c.clone().addScaledVector(ring.t, sign * reach) };
  };
  const start = capped(rings[0]!, capStart, -1);
  const end = capped(rings[rings.length - 1]!, capEnd, 1);
  const all = [...start.rings.reverse(), ...rings, ...end.rings];

  const positions: number[] = [];
  const normal = new THREE.Vector3();
  const across = new THREE.Vector3();
  for (const ring of all) {
    normal.set(-ring.t.y, ring.t.x, 0);
    if (normal.lengthSq() < 1e-8) normal.set(0, 1, 0);
    normal.normalize();
    across.crossVectors(ring.t, normal).normalize();
    for (let j = 0; j < seg; j += 1) {
      const angle = (j / seg) * Math.PI * 2;
      const ca = Math.cos(angle);
      const sa = Math.sin(angle);
      const u = Math.sign(ca) * Math.abs(ca) ** power * (ca >= 0 ? ring.up : ring.down);
      const v = Math.sign(sa) * Math.abs(sa) ** power * ring.w;
      positions.push(ring.c.x + normal.x * u + across.x * v, ring.c.y + normal.y * u + across.y * v, ring.c.z + normal.z * u + across.z * v);
    }
  }
  const first = positions.length / 3;
  positions.push(start.pole.x, start.pole.y, start.pole.z, end.pole.x, end.pole.y, end.pole.z);
  const indices: number[] = [];
  for (let ring = 0; ring < all.length - 1; ring += 1) {
    for (let j = 0; j < seg; j += 1) {
      const a = ring * seg + j;
      const b = ring * seg + ((j + 1) % seg);
      indices.push(a, b, a + seg, b, b + seg, a + seg);
    }
  }
  const last = (all.length - 1) * seg;
  for (let j = 0; j < seg; j += 1) {
    indices.push(first, (j + 1) % seg, j);
    indices.push(first + 1, last + j, last + ((j + 1) % seg));
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

/** A tapered, round-ended limb from one point to another. */
export function limb(from: readonly [number, number, number], to: readonly [number, number, number], r0: number, r1 = r0, w0 = r0, w1 = r1): Geometry {
  return loft([[...from, r0, r0, w0], [...to, r1, r1, w1]], { sub: 2, seg: 14 });
}

/** An ellipsoid, turned `turn` radians in the picture plane. */
export function blob(x: number, y: number, z: number, rx: number, ry = rx, rz = rx, turn = 0): Geometry {
  const geometry = new THREE.SphereGeometry(1, 28, 18);
  geometry.scale(rx, ry, rz);
  if (turn) geometry.rotateZ(turn);
  return geometry.translate(x, y, z);
}

/** A solid of revolution about the y axis from its profile (radius, y), smoothed through its points unless `sharp`. */
export function lathe(profile: readonly (readonly [number, number])[], options: { seg?: number; sharp?: boolean } = {}): Geometry {
  const points = profile.map(([r, y]) => new THREE.Vector2(Math.max(0, r), y));
  const curve = options.sharp ? points : new THREE.SplineCurve(points).getPoints(profile.length * 6).map((p) => new THREE.Vector2(Math.max(0, p.x), p.y));
  return new THREE.LatheGeometry(curve, options.seg ?? 40);
}

/** A flat outline (x, y) given depth and a rounded edge, centred on z. `smooth`: a closed spline through the points. */
export function plate(outline: readonly (readonly [number, number])[], depth: number, options: { z?: number; bevel?: number; smooth?: boolean; holes?: readonly (readonly (readonly [number, number])[])[] } = {}): Geometry {
  const pathOf = (pts: readonly (readonly [number, number])[], into: THREE.Path) => {
    const vectors = pts.map(([x, y]) => new THREE.Vector2(x, y));
    if (options.smooth) {
      const closed = new THREE.CatmullRomCurve3(vectors.map((v) => new THREE.Vector3(v.x, v.y, 0)), true, "centripetal").getPoints(pts.length * 8);
      into.setFromPoints(closed.map((p) => new THREE.Vector2(p.x, p.y)));
    } else into.setFromPoints(vectors);
    into.closePath();
    return into;
  };
  const shape = pathOf(outline, new THREE.Shape()) as THREE.Shape;
  for (const hole of options.holes ?? []) shape.holes.push(pathOf(hole, new THREE.Path()));
  const bevel = Math.min(options.bevel ?? depth / 2, depth / 2);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: Math.max(1e-3, depth - 2 * bevel), bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelOffset: -bevel, bevelSegments: 4, curveSegments: 12 });
  return geometry.translate(0, 0, (options.z ?? 0) - (depth - 2 * bevel) / 2);
}

export function box(width: number, height: number, depth: number, radius: number, x = 0, y = 0, z = 0): Geometry {
  return new RoundedBoxGeometry(width, height, depth, 4, Math.min(radius, width / 2, height / 2, depth / 2) * 0.999).translate(x, y, z);
}

/** A ring lying in the picture plane (its axis towards the camera), or part of one. */
export function torus(radius: number, tube: number, x = 0, y = 0, z = 0, arc = Math.PI * 2): Geometry {
  return new THREE.TorusGeometry(radius, tube, 14, 56, arc).translate(x, y, z);
}

export function cylinder(top: number, bottom: number, height: number, x = 0, y = 0, z = 0, seg = 36): Geometry {
  return new THREE.CylinderGeometry(top, bottom, height, seg).translate(x, y, z);
}

/** Turned about x, y, z (in that order), then scaled and moved. */
export function turned(geometry: Geometry, rx = 0, ry = 0, rz = 0, move: readonly [number, number, number] = [0, 0, 0], scale: number | readonly [number, number, number] = 1): Geometry {
  if (rx) geometry.rotateX(rx);
  if (ry) geometry.rotateY(ry);
  if (rz) geometry.rotateZ(rz);
  if (typeof scale === "number") {
    if (scale !== 1) geometry.scale(scale, scale, scale);
  } else geometry.scale(scale[0], scale[1], scale[2]);
  return geometry.translate(move[0], move[1], move[2]);
}

/** The same parts mirrored left to right (an animal built heading +x, shown heading −x). */
export function mirrored(parts: Geometry[]): Geometry[] {
  return parts.map((part) => part.scale(-1, 1, 1));
}

/** Every part turned together: an artefact shown three-quarter (about x, then y, then z). */
export function posed(parts: Geometry[], rx = 0, ry = 0, rz = 0): Geometry[] {
  return parts.map((part) => turned(part, rx, ry, rz));
}

/**
 * Only what faces the camera: everything behind the picture plane (z < 0) pressed onto it, so a body built about
 * z 0 meets its outline at height 0, as a balloon does, instead of standing on a cliff half its depth high.
 */
export function fronted(parts: Geometry[]): Geometry[] {
  for (const part of parts) {
    const position = part.getAttribute("position") as THREE.BufferAttribute;
    for (let index = 0; index < position.count; index += 1) if (position.getZ(index) < 0) position.setZ(index, 0);
  }
  return parts;
}
