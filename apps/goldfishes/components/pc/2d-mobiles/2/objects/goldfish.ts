// The goldfish that is each phone's thumb: screen/bubble/7's own fish
// (fish/goldfish-scene.ts, itself tech-eyes/1's), copied — the same body,
// peduncle, extruded tail and fins, eyes, materials, light and palettes —
// seen from above as the main screen sees it (user, 2026-10-28: "버블에서 쓰고
// 있는 제대로된 sophisticated version"). Its tail beat is rendered once into
// a strip of frames, head up; the compositor plays the strip from its clock
// (gl/shaders.ts), so 64 fish swim at no CPU cost.

import * as THREE from "three";

/** bubble/7 fish/goldfish.ts FISH_PALETTES (the coloured ones 섞음 deals). */
export const FISH_PALETTES = {
  classic: { body: "#cf741c", fin: "#e7b365" },
  instagram: { body: "#ff5e29", fin: "#fed044" },
  rose: { body: "#f45b99", fin: "#ffc990" },
  sunset: { body: "#ef5551", fin: "#ffe179" },
  poppy: { body: "#e83c42", fin: "#f8a15d" },
  pink: { body: "#e57687", fin: "#f6c0a4" },
} as const;

export type FishPalette = keyof typeof FISH_PALETTES;
export const FISH_PALETTE_IDS = Object.keys(FISH_PALETTES) as FishPalette[];

/** Frames in one tail beat. */
export const FISH_FRAMES = 12;
/** One beat lasts this long (bubble/7: 5.2 rad/s at rest, about 1.2 s). */
export const FISH_BEAT_SECONDS = 1.1;

function tailGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0.45, 1.12);
  shape.bezierCurveTo(-1.25, 1.82, -3.62, 3.92, -5.8, 4.12);
  shape.bezierCurveTo(-5.28, 2.1, -3.72, 0.64, -2.02, 0);
  shape.bezierCurveTo(-3.72, -0.64, -5.28, -2.1, -5.8, -4.12);
  shape.bezierCurveTo(-3.62, -3.92, -1.25, -1.82, 0.45, -1.12);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: true, bevelSegments: 2, bevelSize: 0.16, bevelThickness: 0.16, curveSegments: 7, depth: 0.34, steps: 1 });
  geometry.translate(0, 0, -0.17);
  return geometry;
}

function finGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-2.1, 0);
  shape.bezierCurveTo(-1.05, 1.4, 0.35, 2.9, 2.35, 2.7);
  shape.bezierCurveTo(1.45, 1.2, 0.45, 0.24, -2.1, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: true, bevelSegments: 1, bevelSize: 0.08, bevelThickness: 0.07, curveSegments: 6, depth: 0.15, steps: 1 });
  geometry.translate(0, 0, -0.075);
  return geometry;
}

/** bubble/7 fish/lifecycle.ts: a spent fish's grey (SPENT_BODY, SPENT_FIN) and the roll it sinks with (sinkRoll at rest). */
const SPENT = { body: [0.66, 0.66, 0.66], fin: [0.84, 0.84, 0.84] } as const;
const SINK_ROLL = (Math.PI / 2) * 0.85;

export type FishStrip = { palette: FishPalette | "spent"; pixels: Uint8Array; size: number; frames: number };

/**
 * Renders every palette's tail beat as a vertical strip of `size`-px frames,
 * head up, premultiplied RGBA rows top to bottom.
 */
export function renderFishStrips(size: number): FishStrip[] {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight("#d7e0ff", "#11141d", 1.55));
  const light = new THREE.DirectionalLight("#ffd6a0", 2.15);
  light.position.set(-0.35, 1, 0.55);
  scene.add(light);
  // Top-down, as bubble/7's camera; the fish's length (head 5.8 to tail fan −11.9) fills the frame.
  const half = 9.6;
  const camera = new THREE.OrthographicCamera(-half, half, half, -half, 1, 100);
  camera.position.set(0, 40, 0);
  camera.up.set(0, 0, -1);
  camera.lookAt(0, 0, 0);

  const bodyMaterial = new THREE.MeshStandardMaterial({ roughness: 0.27, metalness: 0.055, emissiveIntensity: 0.035 });
  const finMaterial = new THREE.MeshStandardMaterial({ roughness: 0.4, transparent: true, opacity: 0.72, depthWrite: true, side: THREE.DoubleSide, emissiveIntensity: 0.035 });
  const eyeMaterial = new THREE.MeshStandardMaterial({ color: "#050403", roughness: 0.045, metalness: 0.025 });
  const geometries = {
    body: new THREE.SphereGeometry(1, 22, 15),
    peduncle: new THREE.CylinderGeometry(0.68, 1.2, 2.5, 12, 1).rotateZ(Math.PI / 2),
    eye: new THREE.SphereGeometry(0.43, 12, 8),
    tail: tailGeometry(),
    fin: finGeometry(),
  };
  const part = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.scale.set(sx, sy, sz);
    return mesh;
  };
  // Head up on the strip: the body's +x turned to the screen's up (−z), centred between mouth and tail fan.
  const fish = new THREE.Group();
  fish.rotation.set(0, Math.PI / 2, 0);
  const body = new THREE.Group();
  body.position.x = 3;
  fish.add(body);
  scene.add(fish);
  const bodyMesh = part(geometries.body, bodyMaterial, 0.15, 0, 0, 0, 0, 0, 5.65, 3.38, 2.72);
  const tail = part(geometries.tail, finMaterial, -6.05, 0, 0, 0.58, 0, 0, 1, 1, 1);
  const leftFin = part(geometries.fin, finMaterial, 1.25, -0.1, 2.28, 0.8, -0.12, -0.3, 0.88, 0.68, 0.84);
  const rightFin = part(geometries.fin, finMaterial, 1.25, -0.1, -2.28, -0.8, 0.12, -0.3, 0.88, 0.68, 0.84);
  body.add(
    bodyMesh,
    part(geometries.peduncle, bodyMaterial, -5.35, 0, 0, 0, 0, 0, 1, 1.08, 1.12),
    tail,
    part(geometries.fin, finMaterial, -0.9, 2.75, 0, 0.08, 0, 0, 1, 0.95, 1),
    leftFin,
    rightFin,
    part(geometries.eye, eyeMaterial, 3.85, 2.1, 2.45, 0, 0, 0, 2, 2, 2),
    part(geometries.eye, eyeMaterial, 3.85, 2.1, -2.45, 0, 0, 0, 2, 2, 2),
  );

  const read = new Uint8Array(size * size * 4);
  const strips: FishStrip[] = [];
  const grab = (into: Uint8Array, frame: number) => {
    renderer.render(scene, camera);
    const gl = renderer.getContext();
    gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, read);
    // readPixels is bottom-up; the strip is top-down.
    for (let row = 0; row < size; row += 1) into.set(read.subarray((size - 1 - row) * size * 4, (size - row) * size * 4), (frame * size + row) * size * 4);
  };
  for (const palette of FISH_PALETTE_IDS) {
    const colours = FISH_PALETTES[palette];
    // As bubble/7 colours them: white materials, the colour per fish, the palette's faint glow.
    bodyMaterial.color.set(colours.body);
    bodyMaterial.emissive.set(colours.body);
    finMaterial.color.set(colours.fin);
    finMaterial.emissive.set(colours.fin);
    const pixels = new Uint8Array(size * size * 4 * FISH_FRAMES);
    for (let frame = 0; frame < FISH_FRAMES; frame += 1) {
      const phase = (frame / FISH_FRAMES) * Math.PI * 2;
      const tailAngle = Math.sin(phase) * 0.38;
      tail.rotation.set(0.58, tailAngle, 0);
      leftFin.rotation.set(0.8 + tailAngle * 0.18, -0.12, -0.3);
      rightFin.rotation.set(-0.8 - tailAngle * 0.18, 0.12, -0.3);
      bodyMesh.scale.set(5.65 * (1 + Math.sin(phase * 0.5) * 0.016), 3.38, 2.72);
      grab(pixels, frame);
    }
    strips.push({ palette, pixels, size, frames: FISH_FRAMES });
  }
  // The spent fish, as bubble/7 lets one go: grey, its tail still and straight, rolled onto its side.
  bodyMaterial.color.setRGB(SPENT.body[0], SPENT.body[1], SPENT.body[2], THREE.SRGBColorSpace);
  bodyMaterial.emissive.set("#000000");
  finMaterial.color.setRGB(SPENT.fin[0], SPENT.fin[1], SPENT.fin[2], THREE.SRGBColorSpace);
  finMaterial.emissive.set("#000000");
  tail.rotation.set(0.58, 0, 0);
  leftFin.rotation.set(0.8, -0.12, -0.3);
  rightFin.rotation.set(-0.8, 0.12, -0.3);
  bodyMesh.scale.set(5.65, 3.38, 2.72);
  body.rotation.x = SINK_ROLL;
  const spent = new Uint8Array(size * size * 4);
  grab(spent, 0);
  strips.push({ palette: "spent", pixels: spent, size, frames: 1 });
  for (const geometry of Object.values(geometries)) geometry.dispose();
  bodyMaterial.dispose();
  finMaterial.dispose();
  eyeMaterial.dispose();
  renderer.dispose();
  renderer.forceContextLoss();
  return strips;
}
