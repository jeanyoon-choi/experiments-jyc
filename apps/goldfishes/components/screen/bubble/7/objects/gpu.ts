// The GPU as hard-surface product, not a balloon (user, 2026-10-25: the
// inflated card was "별로 hyperreal 하지 않음"): a triple-fan graphics card
// seen from above, in the raft's frame (x right, y down, z towards the
// camera). Shroud with machined, bevelled edges and three round openings;
// in each a raised frame ring, a domed hub and swept, pitched blades; the
// heatsink's fins below, seen between the blades; a backplate under it all;
// the slot bracket at one end, the power socket on the top edge, the gold
// fingers along the bottom. One material, as every object.

import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** Half the card's length and width before it is scaled into the unit disc. */
const LENGTH = 1;
const WIDTH = 0.4;
const FANS = [-0.62, 0, 0.62] as const;
const FAN_RADIUS = 0.27;

function roundedRect(halfX: number, halfY: number, radius: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-halfX + radius, -halfY);
  shape.lineTo(halfX - radius, -halfY);
  shape.quadraticCurveTo(halfX, -halfY, halfX, -halfY + radius);
  shape.lineTo(halfX, halfY - radius);
  shape.quadraticCurveTo(halfX, halfY, halfX - radius, halfY);
  shape.lineTo(-halfX + radius, halfY);
  shape.quadraticCurveTo(-halfX, halfY, -halfX, halfY - radius);
  shape.lineTo(-halfX, -halfY + radius);
  shape.quadraticCurveTo(-halfX, -halfY, -halfX + radius, -halfY);
  return shape;
}

function circlePath(x: number, y: number, radius: number) {
  const path = new THREE.Path();
  path.absarc(x, y, radius, 0, Math.PI * 2, true);
  return path;
}

/** A slab from z `bottom`, `depth` deep, its top edges bevelled by `bevel`. */
function slab(shape: THREE.Shape, bottom: number, depth: number, bevel: number, curveSegments: number) {
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(1e-4, depth - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments,
  });
  geometry.translate(0, 0, bottom + bevel);
  // ExtrudeGeometry is already non-indexed.
  return geometry.index ? geometry.toNonIndexed() : geometry;
}

function box(x: number, y: number, z: number, sx: number, sy: number, sz: number) {
  const geometry = new THREE.BoxGeometry(sx, sy, sz);
  geometry.translate(x, y, z + sz / 2);
  return geometry.toNonIndexed();
}

/** One swept blade from hub to rim: a crescent, pitched about its own radius. */
function blade(hub: number, rim: number, sweep: number, width: number, pitch: number) {
  const shape = new THREE.Shape();
  shape.moveTo(hub, -width * 0.5);
  shape.quadraticCurveTo((hub + rim) / 2, -width * 0.5 + sweep, rim, sweep - width * 0.15);
  shape.quadraticCurveTo(rim + width * 0.12, sweep + width * 0.3, rim - width * 0.05, sweep + width * 0.55);
  shape.quadraticCurveTo((hub + rim) / 2, width * 0.5 + sweep * 0.9, hub, width * 0.5);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: false, curveSegments: 3 });
  // Pitched like a propeller: turned about the blade's own radial line.
  geometry.rotateX(pitch);
  return geometry.index ? geometry.toNonIndexed() : geometry;
}

function fan(x: number, base: number, detailed: boolean) {
  const parts: THREE.BufferGeometry[] = [];
  // The frame ring standing proud of the shroud round the opening.
  const ring = new THREE.Shape();
  ring.absarc(0, 0, FAN_RADIUS + 0.035, 0, Math.PI * 2, false);
  ring.holes.push(circlePath(0, 0, FAN_RADIUS + 0.005));
  parts.push(slab(ring, base + 0.2, 0.045, 0.012, detailed ? 48 : 24));
  // The hub: a short cylinder with a domed cap (the logo's place).
  const hub = new THREE.CylinderGeometry(0.075, 0.08, 0.04, detailed ? 32 : 16);
  hub.rotateX(Math.PI / 2);
  hub.translate(0, 0, base + 0.02);
  parts.push(hub.toNonIndexed());
  const cap = new THREE.SphereGeometry(0.075, detailed ? 24 : 12, detailed ? 8 : 4, 0, Math.PI * 2, 0, Math.PI / 2);
  cap.rotateX(Math.PI / 2);
  cap.scale(1, 1, 0.25);
  cap.translate(0, 0, base + 0.04);
  parts.push(cap.toNonIndexed());
  const blades = detailed ? 9 : 6;
  for (let index = 0; index < blades; index += 1) {
    const one = blade(0.07, FAN_RADIUS - 0.012, 0.07, 0.11, 0.42);
    one.translate(0, 0, base + 0.02);
    one.rotateZ((index / blades) * Math.PI * 2);
    parts.push(one);
  }
  const merged = mergeGeometries(parts)!;
  merged.translate(x, 0, 0);
  for (const part of parts) part.dispose();
  return merged;
}

/** The card as positions and normals (non-indexed triangles), filling the unit disc. `detailed` false: for small ones, fewer parts. */
export function gpuGeometry(detailed: boolean) {
  const parts: THREE.BufferGeometry[] = [];
  const shroudBase = 0.06;
  // A thick, triple-slot shroud: the card's volume.
  const shroudTop = 0.3;
  // Backplate under everything, a little wider than the shroud.
  parts.push(slab(roundedRect(LENGTH, WIDTH + 0.015, 0.05), 0, 0.03, 0.006, 6));
  // Heatsink fins across the card, seen through the openings.
  if (detailed) {
    for (let x = -LENGTH + 0.08; x <= LENGTH - 0.08; x += 0.05) parts.push(box(x, 0, 0.03, 0.007, WIDTH * 1.7, 0.12));
  } else {
    parts.push(box(0, 0, 0.03, LENGTH * 1.8, WIDTH * 1.7, 0.04));
  }
  // The shroud: machined edges, three openings.
  const shroud = roundedRect(LENGTH - 0.02, WIDTH, 0.06);
  for (const x of FANS) shroud.holes.push(circlePath(x, 0, FAN_RADIUS + 0.01));
  parts.push(slab(shroud, shroudBase, shroudTop - shroudBase, 0.035, detailed ? 40 : 20));
  for (const x of FANS) parts.push(fan(x, shroudBase + 0.1, detailed));
  // The slot bracket at the left end, the power socket on the top edge, the gold fingers along the bottom.
  parts.push(slab(roundedRect(0.018, WIDTH + 0.09, 0.01), 0, 0.14, 0.004, 4).translate(-LENGTH - 0.02, 0.02, 0));
  parts.push(slab(roundedRect(0.09, 0.03, 0.008), 0.03, 0.12, 0.006, 4).translate(0.42, -WIDTH - 0.02, 0));
  if (detailed) {
    for (let x = -0.3; x <= 0.36; x += 0.03) parts.push(box(x, WIDTH + 0.035, 0.012, 0.018, 0.05, 0.012));
  } else {
    parts.push(box(0.03, WIDTH + 0.035, 0.012, 0.66, 0.05, 0.012));
  }
  const merged = mergeGeometries(parts.map((part) => (part.index ? part.toNonIndexed() : part)), false)!;
  for (const part of parts) part.dispose();
  merged.computeBoundingSphere();
  // Fill the unit disc: the furthest corner, in the plane, at radius 1.
  const position = merged.getAttribute("position") as THREE.BufferAttribute;
  let furthest = 0;
  for (let index = 0; index < position.count; index += 1) furthest = Math.max(furthest, Math.hypot(position.getX(index), position.getY(index)));
  merged.scale(1 / furthest, 1 / furthest, 1 / furthest);
  // Each part keeps its own normals: flat on the machined faces, smooth round the hubs.
  const positions = new Float32Array((merged.getAttribute("position") as THREE.BufferAttribute).array);
  const normals = new Float32Array((merged.getAttribute("normal") as THREE.BufferAttribute).array);
  merged.dispose();
  return { positions, normals };
}
