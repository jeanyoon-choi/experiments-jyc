// The mobiles: slabs of dark metal and glass, each with a lit screen. A screen is not shaded by the scene's lights —
// it is a light: its pixels go to the display untouched by the tone curve. What is on the screens is a source's
// (screens/source.ts): its material on one mesh, every mobile's screen an instance of it.
//
// Mobile space: x across, y up its length, +z out of the screen.

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { ScreenSource } from "../screens/source";

/** Larger than life against the fish (user, 2026-11-13: exaggerated, so the screen reads): world units per unit below. */
const MOBILE_SCALE = 3;
const W = 0.235;
const H = 0.5;
const T = 0.026;
/** Its size in the world. */
export const MOBILE_SIZE = { width: W * MOBILE_SCALE, height: H * MOBILE_SCALE, depth: T * MOBILE_SCALE };

function slab(width: number, height: number, radius: number) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.absarc(x + width - radius, y + radius, radius, -Math.PI / 2, 0, false);
  shape.lineTo(x + width, y + height - radius);
  shape.absarc(x + width - radius, y + height - radius, radius, 0, Math.PI / 2, false);
  shape.lineTo(x + radius, y + height);
  shape.absarc(x + radius, y + height - radius, radius, Math.PI / 2, Math.PI, false);
  shape.lineTo(x, y + radius);
  shape.absarc(x + radius, y + radius, radius, Math.PI, Math.PI * 1.5, false);
  return shape;
}

/** The screen's size in the world (inside a thin black border). */
export const SCREEN_SIZE = { width: (W - 0.012) * MOBILE_SCALE, height: (H - 0.012) * MOBILE_SCALE };

export type Mobiles = {
  group: THREE.Group;
  dispose(): void;
};

/** A mobile at each of `places` (its centre's world matrix: position and facing), `source`'s screens on them. */
export function createMobiles(environment: THREE.Texture, places: readonly THREE.Matrix4[], source: ScreenSource): Mobiles {
  const group = new THREE.Group();
  const disposables: { dispose(): void }[] = [];
  const instanced = (geometry: THREE.BufferGeometry, material: THREE.Material, members: readonly number[]) => {
    geometry.scale(MOBILE_SCALE, MOBILE_SCALE, MOBILE_SCALE);
    const mesh = new THREE.InstancedMesh(geometry, material, members.length);
    members.forEach((member, at) => mesh.setMatrixAt(at, places[member]!));
    mesh.frustumCulled = false;
    group.add(mesh);
    disposables.push(geometry, material, mesh);
    return mesh;
  };
  const all = places.map((_, index) => index);

  // The case, with the lenses' plate on its back.
  const BEVEL = 0.005;
  const shell = new THREE.ExtrudeGeometry(slab(W - BEVEL * 2, H - BEVEL * 2, 0.034), { depth: T - BEVEL * 2, bevelEnabled: true, bevelThickness: BEVEL, bevelSize: BEVEL, bevelSegments: 5, curveSegments: 20 });
  shell.translate(0, 0, -(T - BEVEL * 2) / 2);
  const plate = new THREE.ExtrudeGeometry(slab(0.092, 0.092, 0.024), { depth: 0.004, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 3, curveSegments: 12 });
  plate.rotateY(Math.PI);
  plate.translate(-W / 2 + 0.062, H / 2 - 0.062, -T / 2);
  const caseMaterial = new THREE.MeshPhysicalMaterial({ color: 0x17181a, metalness: 0.85, roughness: 0.32, clearcoat: 0.4, clearcoatRoughness: 0.2, envMap: environment });
  instanced(mergeGeometries([shell, plate])!, caseMaterial, all);
  shell.dispose();
  plate.dispose();
  const lenses = ([[-0.02, 0.02], [0.02, 0.02], [-0.02, -0.02]] as const).map(([x, y]) => {
    const lens = new THREE.CylinderGeometry(0.016, 0.016, 0.004, 32);
    lens.rotateX(Math.PI / 2);
    lens.translate(-W / 2 + 0.062 + x, H / 2 - 0.062 + y, -T / 2 - 0.0075);
    return lens;
  });
  instanced(mergeGeometries(lenses)!, new THREE.MeshPhysicalMaterial({ color: 0x050608, roughness: 0.05, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02, envMap: environment }), all);
  for (const lens of lenses) lens.dispose();

  // The screens, to a thin black border: one mesh, its mobiles as instances, in the source's material.
  const screenW = W - 0.012;
  const screenH = H - 0.012;
  const screenShape = new THREE.ShapeGeometry(slab(screenW, screenH, 0.029), 20);
  const uv = screenShape.getAttribute("uv") as THREE.BufferAttribute;
  const position = screenShape.getAttribute("position") as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i += 1) uv.setXY(i, position.getX(i) / screenW + 0.5, position.getY(i) / screenH + 0.5);
  const screens = screenShape.clone();
  screens.translate(0, 0, T / 2 + 0.0004);
  for (const [name, attribute] of Object.entries(source.attributes)) screens.setAttribute(name, attribute);
  // The material is the source's to dispose of.
  screens.scale(MOBILE_SCALE, MOBILE_SCALE, MOBILE_SCALE);
  const screenMesh = new THREE.InstancedMesh(screens, source.material, places.length);
  places.forEach((place, at) => screenMesh.setMatrixAt(at, place));
  screenMesh.frustumCulled = false;
  group.add(screenMesh);
  disposables.push(screens, screenMesh);
  // The cover glass: only what it mirrors, added over the picture.
  const glass = screenShape.clone();
  glass.translate(0, 0, T / 2 + 0.0008);
  instanced(glass, new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.04, metalness: 0, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, envMap: environment, envMapIntensity: 0.1 }), all);
  screenShape.dispose();

  return {
    group,
    dispose() {
      for (const item of disposables) item.dispose();
    },
  };
}
