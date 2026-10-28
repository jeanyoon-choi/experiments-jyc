// The hard-surface objects (user, 2026-10-25: "휴머노이드 로봇 (Optimus/
// Figure), 로봇개 (Spot), VR 헤드셋,
// 원숭이 JPEG (Bored Ape), 로켓" — since 2026-10-27 Starship —, and a Tesla Roadster in place of a robot vacuum that read only as a
// disc: "차라리 빼고 테슬라 로드마스터를 넣자"), each modelled from three.js primitives as
// the product reads in its press photograph, in one material as every
// object. Built in three.js's frame (y up, the front towards +z); shapes.ts
// turns them into the raft's (y down) and fits them to the disc.

import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

type Builder = (detailed: boolean) => THREE.BufferGeometry[];

const UP = new THREE.Vector3(0, 1, 0);

/** Only positions and normals, unindexed, so any parts merge. */
function plain(geometry: THREE.BufferGeometry) {
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  for (const name of Object.keys(flat.attributes)) if (name !== "position" && name !== "normal") flat.deleteAttribute(name);
  return flat;
}

function sphere(radius: number, x: number, y: number, z: number, detailed: boolean, sx = 1, sy = 1, sz = 1) {
  const geometry = new THREE.SphereGeometry(radius, detailed ? 20 : 10, detailed ? 12 : 6);
  geometry.scale(sx, sy, sz);
  return geometry.translate(x, y, z);
}

function roundedBox(width: number, height: number, depth: number, radius: number, x: number, y: number, z: number, detailed: boolean) {
  return new RoundedBoxGeometry(width, height, depth, detailed ? 3 : 1, Math.min(radius, width / 2, height / 2, depth / 2) * 0.999).translate(x, y, z);
}

/** A capsule (or rod) from one point to another. */
function limb(from: readonly [number, number, number], to: readonly [number, number, number], radius: number, detailed: boolean) {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const length = a.distanceTo(b);
  const geometry = new THREE.CapsuleGeometry(radius, length, detailed ? 4 : 2, detailed ? 12 : 6);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, b.clone().sub(a).normalize()));
  return geometry.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
}

/** Tesla Optimus / Figure, standing, from the front: helmet with a visor, a sculpted torso, jointed limbs. */
const humanoid: Builder = (d) => {
  const parts: THREE.BufferGeometry[] = [
    sphere(0.17, 0, 0.98, 0, d, 1, 1.18, 1.02),
    roundedBox(0.27, 0.11, 0.08, 0.04, 0, 0.98, 0.14, d),
    limb([0, 0.78, 0], [0, 0.86, 0], 0.055, d),
    roundedBox(0.54, 0.5, 0.3, 0.12, 0, 0.52, 0, d),
    roundedBox(0.44, 0.2, 0.06, 0.05, 0, 0.62, 0.14, d),
    limb([0, 0.18, 0], [0, 0.3, 0], 0.13, d),
    roundedBox(0.4, 0.16, 0.26, 0.07, 0, 0.1, 0, d),
  ];
  for (const side of [-1, 1]) {
    parts.push(
      sphere(0.095, side * 0.33, 0.7, 0, d),
      limb([side * 0.35, 0.66, 0], [side * 0.39, 0.37, 0.02], 0.068, d),
      sphere(0.07, side * 0.39, 0.36, 0.02, d),
      limb([side * 0.39, 0.35, 0.02], [side * 0.41, 0.08, 0.06], 0.058, d),
      sphere(0.065, side * 0.41, -0.02, 0.07, d, 0.9, 1.3, 0.7),
      sphere(0.1, side * 0.12, 0.03, 0, d),
      limb([side * 0.12, 0.02, 0], [side * 0.13, -0.42, 0.01], 0.088, d),
      sphere(0.08, side * 0.13, -0.43, 0.02, d),
      limb([side * 0.13, -0.44, 0.01], [side * 0.13, -0.85, -0.01], 0.072, d),
      roundedBox(0.13, 0.08, 0.24, 0.03, side * 0.13, -0.92, 0.04, d),
    );
  }
  return parts;
};

/** Boston Dynamics' Spot, from the side and a little in front: its long body, sensor head, backward knees. */
const robotDog: Builder = (d) => {
  const parts: THREE.BufferGeometry[] = [
    roundedBox(1.0, 0.24, 0.36, 0.08, 0, 0.32, 0, d),
    roundedBox(0.24, 0.17, 0.32, 0.05, 0.6, 0.31, 0, d),
    roundedBox(0.7, 0.05, 0.26, 0.02, 0, 0.46, 0, d),
  ];
  for (const [hip, knee, foot] of [
    [0.36, 0.27, 0.38],
    [-0.36, -0.46, -0.35],
  ] as const) {
    for (const z of [0.16, -0.16]) {
      const shift = z < 0 ? -0.04 : 0;
      parts.push(
        sphere(0.07, hip + shift, 0.24, z, d),
        limb([hip + shift, 0.24, z], [knee + shift, -0.08, z], 0.055, d),
        sphere(0.05, knee + shift, -0.08, z, d),
        limb([knee + shift, -0.08, z], [foot + shift, -0.44, z], 0.035, d),
        sphere(0.05, foot + shift, -0.46, z, d),
      );
    }
  }
  return parts.map((part) => part.rotateY(-0.45));
};

/** The Tesla Roadster (Starman's, 2018), three-quarter front and a little above: its low wedge body
 * with the wheel arches cut in, the raked windscreen frame, four wheels with tyres and rims. */
const roadster: Builder = (d) => {
  const side = new THREE.Shape();
  side.moveTo(1.0, 0.12);
  side.lineTo(1.02, 0.24);
  side.quadraticCurveTo(0.9, 0.33, 0.55, 0.37);
  side.lineTo(0.2, 0.42);
  side.quadraticCurveTo(-0.1, 0.46, -0.3, 0.47);
  side.quadraticCurveTo(-0.75, 0.5, -0.98, 0.42);
  side.lineTo(-1.0, 0.16);
  side.lineTo(-0.86, 0.1);
  side.absarc(-0.62, 0.1, 0.235, Math.PI, 0, true);
  side.lineTo(0.38, 0.1);
  side.absarc(0.62, 0.1, 0.235, Math.PI, 0, true);
  side.lineTo(1.0, 0.12);
  const body = new THREE.ExtrudeGeometry(side, { depth: 0.62, bevelEnabled: true, bevelThickness: 0.09, bevelSize: 0.06, bevelSegments: d ? 4 : 2, curveSegments: d ? 16 : 6 });
  body.translate(0, 0, -0.31);
  const parts: THREE.BufferGeometry[] = [body];
  // The windscreen's frame, raked back over the open cockpit.
  parts.push(limb([0.2, 0.42, 0.36], [-0.02, 0.66, 0.3], 0.025, d), limb([0.2, 0.42, -0.36], [-0.02, 0.66, -0.3], 0.025, d), limb([-0.02, 0.66, 0.3], [-0.02, 0.66, -0.3], 0.025, d));
  // Seats' headrests behind it.
  parts.push(roundedBox(0.1, 0.16, 0.18, 0.05, -0.32, 0.56, 0.17, d), roundedBox(0.1, 0.16, 0.18, 0.05, -0.32, 0.56, -0.17, d));
  for (const x of [-0.62, 0.62]) {
    for (const z of [0.36, -0.36]) {
      parts.push(new THREE.TorusGeometry(0.15, 0.065, d ? 10 : 6, d ? 32 : 14).translate(x, 0.1, z));
      parts.push(new THREE.CylinderGeometry(0.13, 0.13, 0.05, d ? 24 : 10).rotateX(Math.PI / 2).translate(x, 0.1, z));
    }
  }
  return parts.map((part) => part.rotateY(-0.65).rotateX(0.3));
};

/** A Quest 3, three-quarter front and a little above: the visor's rounded block with its two upright
 * sensor pills, the face pad behind it and the head strap looping back. */
const headset: Builder = (d) => {
  const parts: THREE.BufferGeometry[] = [
    roundedBox(1.0, 0.56, 0.34, 0.17, 0, 0, 0.06, d),
    roundedBox(0.86, 0.46, 0.2, 0.09, 0, -0.02, -0.18, d),
    // The strap: a band from the visor's sides round the back of the head.
    new THREE.TorusGeometry(0.5, 0.06, d ? 10 : 6, d ? 48 : 20).rotateX(Math.PI / 2).scale(1, 0.55, 1.25).translate(0, 0.02, -0.62),
    // The strap's top band over the head.
    new THREE.TorusGeometry(0.62, 0.045, d ? 8 : 5, d ? 32 : 14, Math.PI).rotateY(Math.PI / 2).scale(1, 0.55, 0.9).translate(0, 0.18, -0.62),
  ];
  for (const side of [-1, 1]) {
    parts.push(limb([side * 0.3, 0.12, 0.235], [side * 0.3, -0.1, 0.235], 0.055, d));
  }
  parts.push(sphere(0.035, 0, -0.16, 0.23, d));
  return parts.map((part) => part.rotateY(0.62).rotateX(0.38));
};

/** The bored ape's head: heavy brow, half-shut eyes, a long muzzle, ears out to the side. */
const ape: Builder = (d) => {
  const parts: THREE.BufferGeometry[] = [
    sphere(0.5, 0, 0.12, 0, d, 1, 1.05, 0.92),
    sphere(0.32, 0, -0.22, 0.3, d, 1.2, 0.86, 0.9),
    limb([-0.28, 0.16, 0.36], [0.28, 0.16, 0.36], 0.085, d),
    // The bored mouth: a flat seam across the muzzle.
    limb([-0.2, -0.36, 0.53], [0.2, -0.34, 0.53], 0.03, d),
  ];
  for (const side of [-1, 1]) {
    parts.push(
      sphere(0.085, side * 0.17, 0.05, 0.4, d),
      // Heavy lids over the top half of each eye.
      new THREE.SphereGeometry(0.095, d ? 24 : 12, d ? 10 : 5, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(0.5).translate(side * 0.17, 0.05, 0.4),
      sphere(0.035, side * 0.07, -0.13, 0.6, d),
      sphere(0.17, side * 0.52, 0.06, -0.02, d, 0.5, 1, 0.8),
    );
  }
  return parts;
};

/**
 * SpaceX's Starship (the ship, 2024–25 flights; user, 2026-10-27: the 🚀 did not read as a "hyper real
 * spacex rocket"): a stainless-steel cylinder 9 m across and 50 m long, its rings welded every 1.8 m, the
 * ogive nose, two small forward flaps high on it and two broad aft flaps at its base, the chine along its
 * side where the heat shield ends, and six Raptor bells (three sea-level inside, three vacuum outside)
 * under it; lying on its side, three-quarter from above, flying up to the right. 1 unit = 50 m.
 */
const rocket: Builder = (d) => {
  const radius = 0.09;
  const segments = d ? 48 : 18;
  // The hull: barrel from the base to the nose's shoulder, then the ogive to a rounded tip.
  const hull: THREE.Vector2[] = [new THREE.Vector2(0, -0.5), new THREE.Vector2(radius * 0.97, -0.5), new THREE.Vector2(radius, -0.49), new THREE.Vector2(radius, 0.24)];
  for (let step = 1; step <= 12; step += 1) {
    const t = step / 12;
    // A tangent ogive: radius falls as a circular arc's chord does.
    hull.push(new THREE.Vector2(radius * Math.sqrt(Math.max(0, 1 - t * t)) ** 0.85, 0.24 + t * 0.26));
  }
  hull[hull.length - 1] = new THREE.Vector2(0, 0.5);
  const parts: THREE.BufferGeometry[] = [new THREE.LatheGeometry(hull, segments)];
  // Weld seams, a hair proud of the steel, every other 1.8 m ring (0.072): each is drawn at least a field
  // texel wide (fields.ts), and every ring read as an accordion's ribs.
  for (let y = -0.43; y < 0.24; y += 0.072) parts.push(new THREE.TorusGeometry(radius, 0.0005, 4, segments).rotateX(Math.PI / 2).translate(0, y, 0));
  // The chine along each side, where the heat shield ends.
  for (const side of [-1, 1]) parts.push(roundedBox(0.012, 0.66, 0.014, 0.005, side * radius * 0.97, -0.13, 0.02, d));
  /** A flap: a thin slab, wide at the hull and tapering out, hinged along the hull at `y`. */
  const flap = (from: number, to: number, reach: number, tip: number, side: number) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, from);
    shape.lineTo(0, to);
    shape.lineTo(reach, to - (to - from) * (1 - tip) * 0.5);
    shape.lineTo(reach, from + (to - from) * (1 - tip) * 0.5);
    shape.closePath();
    const slab = new THREE.ExtrudeGeometry(shape, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.004, bevelSize: 0.004, bevelSegments: 2, curveSegments: 4 });
    slab.translate(radius * 0.92, 0, -0.006);
    if (side < 0) slab.rotateY(Math.PI);
    return slab;
  };
  for (const side of [-1, 1]) {
    // Forward flaps high on the nose, aft flaps at the base, both a little turned out of plane, as when flying.
    parts.push(flap(0.25, 0.37, 0.055, 0.55, side).rotateY(0.18 * side));
    parts.push(flap(-0.49, -0.3, 0.085, 0.7, side).rotateY(0.12 * side));
  }
  // The Raptors under the skirt: three sea-level bells inside, three vacuum bells outside.
  const bell = (mouth: number, throat: number, length: number, x: number, z: number) =>
    new THREE.LatheGeometry([new THREE.Vector2(throat * 0.6, 0), new THREE.Vector2(throat, -length * 0.15), new THREE.Vector2(mouth * 0.82, -length * 0.7), new THREE.Vector2(mouth, -length), new THREE.Vector2(mouth * 0.94, -length)], d ? 20 : 8).translate(x, -0.5, z);
  for (let index = 0; index < 3; index += 1) {
    const angle = (index / 3) * Math.PI * 2 + 0.3;
    parts.push(bell(0.018, 0.01, 0.035, Math.cos(angle) * 0.026, Math.sin(angle) * 0.026));
    const outer = angle + Math.PI / 3;
    parts.push(bell(0.03, 0.013, 0.05, Math.cos(outer) * 0.058, Math.sin(outer) * 0.058));
  }
  return parts.map((part) => part.rotateY(0.35).rotateZ(-Math.PI / 4));
};

/** The loading spinner: twelve rounded bars round a circle, each smaller than the last, as the fading tail. */
const spinner: Builder = (d) => {
  const parts: THREE.BufferGeometry[] = [];
  for (let index = 0; index < 12; index += 1) {
    const angle = Math.PI / 2 - (index / 12) * Math.PI * 2;
    const scale = 1 - (index / 12) * 0.6;
    const along = (r: number) => [Math.cos(angle) * r, Math.sin(angle) * r, 0] as const;
    parts.push(limb(along(0.52), along(0.88), 0.085 * scale, d));
  }
  return parts;
};

const BUILDERS = { humanoid, robotDog, roadster, headset, ape, rocket, spinner } as const;

export type ModelKind = keyof typeof BUILDERS;

export function isModel(kind: string): kind is ModelKind {
  return kind in BUILDERS;
}

/** The model's triangles (positions and normals, unindexed) in three.js's frame. */
export function modelGeometry(kind: ModelKind, detailed: boolean) {
  const parts = BUILDERS[kind](detailed).map(plain);
  const merged = mergeGeometries(parts, false)!;
  for (const part of parts) part.dispose();
  const positions = new Float32Array((merged.getAttribute("position") as THREE.BufferAttribute).array);
  const normals = new Float32Array((merged.getAttribute("normal") as THREE.BufferAttribute).array);
  merged.dispose();
  return { positions, normals };
}
