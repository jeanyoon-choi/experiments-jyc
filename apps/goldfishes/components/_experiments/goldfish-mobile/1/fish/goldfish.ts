// The goldfish of this work (components/bubble/9/fish/goldfish-scene.ts: an ellipsoid body, a peduncle, a forked
// tail, a dorsal and two side fins, two black eyes, the same palettes), kept as that sign and made as an object one
// could hold (user, 2026-11-13: "조금 더 hyperreal 한걸로"): the body and peduncle are one seamless glazed volume,
// the fins the same outlines cast in tinted glass, the eyes polished and set on the sides of the head. Nothing is
// drawn on it — no scales, no rays; what makes it real is the material and the light, as with bubble/9's objects.
//
// Every fish is an instance (one draw per part whether there is one fish or a hundred). Only the pose is new: the
// two side fins reach forward to a mobile's edges. The tail beats as it does over the raft, slowed.
//
// Model space, as there: +x the head, +y the back, ±z the sides; the body is about 12 units long.

import * as THREE from "three";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

/** World units per model unit at size 1: a fish is a little over 1 long. */
export const FISH_UNIT = 0.1;
/** Head a little up, into the screen. */
const PITCH = 0.1;
/** The side fin's own outline runs from its root (−2.1, 0) to its tip (2.35, 2.7). */
const FIN_ROOT = 2.1;
const FIN_TIP = new THREE.Vector3(2.35 + FIN_ROOT, 2.7, 0);
const JOINT = new THREE.Vector3(3.0, -1.0, 2.25);

/** The palettes 섞음 deals, one per fish (bubble/9's MIX_PALETTES, in its order): body, fin. */
const PALETTES = [
  ["#cf741c", "#e7b365"],
  ["#ff5e29", "#fed044"],
  ["#f45b99", "#ffc990"],
  ["#ef5551", "#ffe179"],
  ["#e83c42", "#f8a15d"],
  ["#e57687", "#f6c0a4"],
] as const;

/** The body's ellipsoid (5.65 × 3.38 × 2.72 about x 0.15) running into the peduncle (to x −6.6) without a seam. */
function bodyGeometry() {
  const ALONG = 96;
  const AROUND = 72;
  const HEAD = 5.8;
  const END = -6.6;
  const positions: number[] = [];
  const indices: number[] = [];
  const blend = (a: number, b: number) => Math.max(a, b) + 0.5 * Math.max(0.5 - Math.abs(a - b), 0) ** 2;
  for (let i = 0; i <= ALONG; i += 1) {
    const s = i / ALONG;
    // Rings closer together at the snout and at the tail's root, where the outline turns fastest.
    const x = END + (HEAD - END) * (0.5 + 0.5 * Math.cos(Math.PI * s));
    const e = 1 - ((x - 0.15) / 5.65) ** 2;
    const round = e > 0 ? Math.sqrt(e) : 0;
    const neck = (0.68 + 0.52 * Math.min(1, Math.max(0, (x - END) / 2.5))) * (1 - Math.min(1, Math.max(0, (x + 3.6) / 1.1)));
    let height = blend(3.38 * round, 1.08 * neck);
    let width = blend(2.72 * round, 1.12 * neck);
    if (i === 0 || i === ALONG) height = width = 0;
    for (let j = 0; j < AROUND; j += 1) {
      const angle = (j / AROUND) * Math.PI * 2;
      positions.push(x, Math.sin(angle) * height, Math.cos(angle) * width);
      if (i < ALONG) {
        const a = i * AROUND + j;
        const b = i * AROUND + ((j + 1) % AROUND);
        indices.push(a, b, a + AROUND, b, b + AROUND, a + AROUND);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const normal = geometry.getAttribute("normal") as THREE.BufferAttribute;
  for (let j = 0; j < AROUND; j += 1) {
    normal.setXYZ(j, 1, 0, 0);
    normal.setXYZ(ALONG * AROUND + j, -1, 0, 0);
  }
  return geometry;
}

function tailGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0.45, 1.12);
  shape.bezierCurveTo(-1.25, 1.82, -3.62, 3.92, -5.8, 4.12);
  shape.bezierCurveTo(-5.28, 2.1, -3.72, 0.64, -2.02, 0);
  shape.bezierCurveTo(-3.72, -0.64, -5.28, -2.1, -5.8, -4.12);
  shape.bezierCurveTo(-3.62, -3.92, -1.25, -1.82, 0.45, -1.12);
  shape.closePath();
  // The raft's outline and thickness, its edge rounded over (a cast piece, not a cut sheet).
  const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: true, bevelSegments: 8, bevelSize: 0.17, bevelThickness: 0.17, curveSegments: 40, depth: 0.02, steps: 1 });
  geometry.translate(0, 0, -0.01);
  return mergeVertices(geometry);
}

function finGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-2.1, 0);
  shape.bezierCurveTo(-1.05, 1.4, 0.35, 2.9, 2.35, 2.7);
  shape.bezierCurveTo(1.45, 1.2, 0.45, 0.24, -2.1, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: true, bevelSegments: 8, bevelSize: 0.09, bevelThickness: 0.09, curveSegments: 32, depth: 0.02, steps: 1 });
  geometry.translate(0, 0, -0.01);
  return mergeVertices(geometry);
}

export type School = {
  group: THREE.Group;
  /** Advances every tail's beat. `flick(i)` 0 … 1 is fish i's right fin's stroke on its screen. */
  update(time: number, flick: (index: number) => number): void;
  dispose(): void;
};

/**
 * A fish at each of `places` (world units, all facing +x). `grip(side)` is where a side fin's
 * tip goes, relative to its fish's place (world units; side 1 is +z).
 */
export function createSchool(places: readonly THREE.Vector3[], grip: (side: number) => THREE.Vector3, fishSize = 1): School {
  const count = places.length;
  const FISH_SCALE = FISH_UNIT * fishSize;
  const group = new THREE.Group();
  const bodyMaterial = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.03 });
  // Tinted glass: light passes through a fin and takes its colour. A school's fins are too small on the display to
  // show it and the extra pass it needs costs frames there (measured with a hundred: 47 of 235 frames over 20 ms), so they are plain gloss.
  const finMaterial = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.12, transmission: count === 1 ? 0.82 : 0, thickness: 0.05, ior: 1.42, clearcoat: 1, clearcoatRoughness: 0.03, side: THREE.DoubleSide });
  const eyeMaterial = new THREE.MeshPhysicalMaterial({ color: "#050403", roughness: 0.04, metalness: 0.02, clearcoat: 1, clearcoatRoughness: 0.01 });
  const geometries = { body: bodyGeometry(), tail: tailGeometry(), fin: finGeometry(), eye: new THREE.SphereGeometry(0.62, 40, 28) };
  const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material, per = 1) => {
    const made = new THREE.InstancedMesh(geometry, material, count * per);
    made.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    made.castShadow = true;
    made.frustumCulled = false;
    group.add(made);
    return made;
  };
  const body = mesh(geometries.body, bodyMaterial);
  const tail = mesh(geometries.tail, finMaterial);
  const dorsal = mesh(geometries.fin, finMaterial);
  const hands = mesh(geometries.fin, finMaterial, 2);
  const eyes = mesh(geometries.eye, eyeMaterial, 2);

  const colour = new THREE.Color();
  places.forEach((_, index) => {
    // 섞음, as over the raft (user, 2026-11-13): a palette by the fish's number, through the same hash.
    const hashed = Math.sin(index * 12.9898 + 78.233) * 43_758.5453;
    const [bodyColour, finColour] = PALETTES[Math.floor((hashed - Math.floor(hashed)) * PALETTES.length)]!;
    body.setColorAt(index, colour.set(bodyColour));
    tail.setColorAt(index, colour.set(finColour));
    dorsal.setColorAt(index, colour);
    hands.setColorAt(index * 2, colour);
    hands.setColorAt(index * 2 + 1, colour);
  });

  // Each fish's own matrix, and the parts that never move on it.
  const roots = places.map((place) => new THREE.Matrix4().compose(place, new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), PITCH), new THREE.Vector3(FISH_SCALE, FISH_SCALE, FISH_SCALE)));
  const local = new THREE.Matrix4();
  const world = new THREE.Matrix4();
  const dorsalLocal = new THREE.Matrix4().compose(new THREE.Vector3(-0.9, 2.75, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.08, 0, 0)), new THREE.Vector3(1, 0.95, 1));
  roots.forEach((root, index) => {
    body.setMatrixAt(index, root);
    dorsal.setMatrixAt(index, world.multiplyMatrices(root, dorsalLocal));
    for (const side of [1, -1]) {
      local.compose(new THREE.Vector3(3.95, 0.95, side * 1.78), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      eyes.setMatrixAt(index * 2 + (side === 1 ? 0 : 1), world.multiplyMatrices(root, local));
    }
  });

  // The side fins' aim: the joint's x to the grip, its blade upright (its flat against the mobile's edge), then
  // turned so the tip, not the root's line, arrives. The same for every fish, since each holds its own mobile alike.
  const tipTurn = new THREE.Quaternion().setFromUnitVectors(FIN_TIP.clone().normalize(), new THREE.Vector3(1, 0, 0));
  const unpitch = new THREE.Matrix4().makeRotationZ(-PITCH);
  const UP = new THREE.Vector3(0, 1, 0);
  const aims = [1, -1].map((side) => {
    const joint = new THREE.Vector3(JOINT.x, JOINT.y, JOINT.z * side);
    const x = grip(side).applyMatrix4(unpitch).divideScalar(FISH_SCALE).sub(joint);
    // A fin is as long as it is: it only stretches a little to reach.
    const reach = Math.min(1.35, Math.max(0.85, x.length() / FIN_TIP.length()));
    x.normalize();
    const z = new THREE.Vector3().crossVectors(x, UP).normalize();
    const yAxis = new THREE.Vector3().crossVectors(z, x);
    return { joint, reach, turn: new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, yAxis, z)).multiply(tipTurn) };
  });

  const tailAt = new THREE.Vector3(-6.05, 0, 0);
  const ONE = new THREE.Vector3(1, 1, 1);
  const euler = new THREE.Euler();
  const turn = new THREE.Quaternion();
  const stroke = new THREE.Quaternion();
  const size = new THREE.Vector3();
  const offset = new THREE.Matrix4().makeTranslation(FIN_ROOT, 0, 0);

  return {
    group,
    update(time, flick) {
      for (let index = 0; index < count; index += 1) {
        const root = roots[index]!;
        const phase = time * 3.1 + index * 1.719;
        // As over the raft: the tail swings about its root.
        local.compose(tailAt, turn.setFromEuler(euler.set(index % 2 ? -0.58 : 0.58, Math.sin(phase) * 0.3, 0)), ONE);
        tail.setMatrixAt(index, world.multiplyMatrices(root, local));
        aims.forEach((aim, hand) => {
          const flutter = 0.03 * Math.sin(time * 5.1 + index * 2.3 + hand * 1.7) + (hand === 1 ? flick(index) * 0.16 : 0);
          turn.copy(aim.turn).multiply(stroke.setFromAxisAngle(UP, flutter * (hand === 0 ? 1 : -1)));
          local.compose(aim.joint, turn, size.setScalar(aim.reach)).multiply(offset);
          hands.setMatrixAt(index * 2 + hand, world.multiplyMatrices(root, local));
        });
      }
      tail.instanceMatrix.needsUpdate = true;
      hands.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      for (const item of [bodyMaterial, finMaterial, eyeMaterial, ...Object.values(geometries), body, tail, dorsal, hands, eyes]) item.dispose();
    },
  };
}
