// The goldfish body of Goldfishes' screen/tech-eyes/1 (rendering/goldfish-scene.ts),
// copied without its traces, target lines and approach rings: instanced
// parts under a top-locked orthographic camera, on a transparent canvas laid
// over the raft. Field coordinates are CSS px. Created only once fish are asked for.
//
// For a thousand fish (2026-11-03) the drawing is the same, done more cheaply:
// each part's matrix is written straight into its instance buffer, only the
// fish there are uploaded, the body and fin colours are uploaded once for all
// their parts, and the parts' geometry is as fine as the fish's size on
// screen can show (LEVELS: below LIGHT_SCALE the outline differs from the full
// geometry's by under 0.15 px), its vertices shared.

import * as THREE from "three";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { FISH_PALETTES, MAX_FISH, MIX_PALETTES, type Fish, type FishPaletteId } from "./goldfish";
import { LIFE_DEFAULTS, lifeColour, rgbOf, sinkRoll, SPENT_BODY, SPENT_FIN, type LifeParameters, type Rgb } from "./lifecycle";

/** How finely each part is built: curve segments for the fins, segments for the spheres and the peduncle. */
type Level = { tail: [number, number]; fin: [number, number]; body: [number, number]; peduncle: number; eye: [number, number] };

/** The full geometry (as before), and a lighter one. */
const LEVELS: Readonly<Record<"full" | "light", Level>> = {
  full: { tail: [7, 2], fin: [6, 1], body: [22, 15], peduncle: 12, eye: [12, 8] },
  light: { tail: [3, 1], fin: [3, 1], body: [12, 8], peduncle: 8, eye: [6, 4] },
};

/**
 * The light level's outline lies within 0.193 glyph units of the full one's
 * (its body sphere along its length, the largest error; fins, tail, peduncle
 * and eyes within 0.123); drawn at pixel ratio 1, that stays under 0.15 px up
 * to this body scale (0.78; the opening fish are 0.65, 0.13 px at most).
 */
const LIGHT_SCALE = 0.15 / 0.193;

function tailGeometry(curveSegments: number, bevelSegments: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0.45, 1.12);
  shape.bezierCurveTo(-1.25, 1.82, -3.62, 3.92, -5.8, 4.12);
  shape.bezierCurveTo(-5.28, 2.1, -3.72, 0.64, -2.02, 0);
  shape.bezierCurveTo(-3.72, -0.64, -5.28, -2.1, -5.8, -4.12);
  shape.bezierCurveTo(-3.62, -3.92, -1.25, -1.82, 0.45, -1.12);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: true, bevelSegments, bevelSize: 0.16, bevelThickness: 0.16, curveSegments, depth: 0.34, steps: 1 });
  geometry.translate(0, 0, -0.17);
  return geometry;
}

function finGeometry(curveSegments: number, bevelSegments: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-2.1, 0);
  shape.bezierCurveTo(-1.05, 1.4, 0.35, 2.9, 2.35, 2.7);
  shape.bezierCurveTo(1.45, 1.2, 0.45, 0.24, -2.1, 0);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { bevelEnabled: true, bevelSegments, bevelSize: 0.08, bevelThickness: 0.07, curveSegments, depth: 0.15, steps: 1 });
  geometry.translate(0, 0, -0.075);
  return geometry;
}

/** One level's geometry per part (in the scene's part order); extrusions indexed, so shared vertices are shaded once. */
function partsOf(level: Level): THREE.BufferGeometry[] {
  const body = new THREE.SphereGeometry(1, level.body[0], level.body[1]);
  const peduncle = new THREE.CylinderGeometry(0.68, 1.2, 2.5, level.peduncle, 1);
  peduncle.rotateZ(Math.PI / 2);
  const tail = mergeVertices(tailGeometry(...level.tail));
  const fin = mergeVertices(finGeometry(...level.fin));
  const eye = new THREE.SphereGeometry(0.43, level.eye[0], level.eye[1]);
  return [body, peduncle, tail, fin, fin, fin, eye, eye];
}

/** A part's matrix on the body (column-major): position, Euler rotation (XYZ, as Object3D's), scale. */
function localMatrix(out: Float64Array, x: number, y: number, z: number, rx: number, ry: number, rz: number, sx: number, sy: number, sz: number) {
  const a = Math.cos(rx);
  const b = Math.sin(rx);
  const c = Math.cos(ry);
  const d = Math.sin(ry);
  const e = Math.cos(rz);
  const f = Math.sin(rz);
  const ae = a * e;
  const af = a * f;
  const be = b * e;
  const bf = b * f;
  out[0] = c * e * sx;
  out[1] = (af + be * d) * sx;
  out[2] = (bf - ae * d) * sx;
  out[3] = 0;
  out[4] = -c * f * sy;
  out[5] = (ae - bf * d) * sy;
  out[6] = (be + af * d) * sy;
  out[7] = 0;
  out[8] = d * sz;
  out[9] = -b * c * sz;
  out[10] = a * c * sz;
  out[11] = 0;
  out[12] = x;
  out[13] = y;
  out[14] = z;
  out[15] = 1;
  return out;
}

/** `root` × `local` (both affine, column-major) into `out` at `at`. */
function place(out: Float32Array, at: number, root: Float64Array, local: Float64Array) {
  for (let column = 0; column < 4; column += 1) {
    const l0 = local[column * 4]!;
    const l1 = local[column * 4 + 1]!;
    const l2 = local[column * 4 + 2]!;
    const w = column === 3 ? 1 : 0;
    out[at + column * 4] = root[0]! * l0 + root[4]! * l1 + root[8]! * l2 + root[12]! * w;
    out[at + column * 4 + 1] = root[1]! * l0 + root[5]! * l1 + root[9]! * l2 + root[13]! * w;
    out[at + column * 4 + 2] = root[2]! * l0 + root[6]! * l1 + root[10]! * l2 + root[14]! * w;
    out[at + column * 4 + 3] = w;
  }
}

export class GoldfishScene {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 1, 20_000);
  private readonly bodyMaterial = new THREE.MeshStandardMaterial({ color: "#cf741c", emissive: "#cf741c", emissiveIntensity: 0.035, roughness: 0.27, metalness: 0.055 });
  private readonly finMaterial = new THREE.MeshStandardMaterial({ color: "#e7b365", emissive: "#e7b365", emissiveIntensity: 0.035, roughness: 0.4, transparent: true, opacity: 0.72, depthWrite: true, side: THREE.DoubleSide });
  private readonly eyeMaterial = new THREE.MeshStandardMaterial({ color: "#050403", roughness: 0.045, metalness: 0.025 });
  /** body, peduncle, tail, dorsal fin, left fin, right fin, left eye, right eye. */
  private readonly meshes: readonly THREE.InstancedMesh[];
  /** Each level's geometry, built when first drawn, and the level drawn now. */
  private readonly levels: Partial<Record<keyof typeof LEVELS, THREE.BufferGeometry[]>> = {};
  private level: keyof typeof LEVELS | null = null;
  /** Colours per fish, one buffer for the body's parts and one for the fins'. */
  private readonly bodyColours = new THREE.InstancedBufferAttribute(new Float32Array(MAX_FISH * 3).fill(1), 3);
  private readonly finColours = new THREE.InstancedBufferAttribute(new Float32Array(MAX_FISH * 3).fill(1), 3);
  /** Scratch matrices: the fish's own, and a moving part's on it. */
  private readonly root = new Float64Array(16);
  private readonly local = new Float64Array(16);
  /** Parts that never move on the body: their local matrices, composed once. */
  private readonly fixedParts = {
    peduncle: localMatrix(new Float64Array(16), -5.35, 0, 0, 0, 0, 0, 1, 1.08, 1.12),
    dorsalFin: localMatrix(new Float64Array(16), -0.9, 2.75, 0, 0.08, 0, 0, 1, 0.95, 1),
    leftEye: localMatrix(new Float64Array(16), 3.85, 2.1, 2.45, 0, 0, 0, 2, 2, 2),
    rightEye: localMatrix(new Float64Array(16), 3.85, 2.1, -2.45, 0, 0, 0, 2, 2, 2),
  };
  /** Each fish's tail-beat phase and the frame it was last drawn, by its seed (fish come and go, so their order does not hold). */
  private readonly phases = new Map<number, { phase: number; frame: number }>();
  private frame = 0;
  /** Palette colours as sRGB triples, parsed once. */
  private readonly parsed = new Map<string, Rgb>();
  private readonly colour = new THREE.Color();
  private palette: FishPaletteId | undefined;
  private readonly body3: Rgb = [0, 0, 0];
  private readonly fin3: Rgb = [0, 0, 0];
  private width = 1;
  private height = 1;
  private shownCount = -1;
  /** Anything else drawn with the fish, in their light (반응's 3D reactions). */
  private readonly extras = new THREE.Group();

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, canvas, powerPreference: "high-performance" });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x000000, 0);
    this.scene.add(new THREE.HemisphereLight("#d7e0ff", "#11141d", 1.55));
    const light = new THREE.DirectionalLight("#ffd6a0", 2.15);
    light.position.set(-0.35, 1, 0.55);
    this.scene.add(light);
    this.scene.add(this.extras);
    const geometry = this.geometryOf("full");
    const materials = [this.bodyMaterial, this.bodyMaterial, this.finMaterial, this.finMaterial, this.finMaterial, this.finMaterial, this.eyeMaterial, this.eyeMaterial];
    this.level = "full";
    this.bodyColours.setUsage(THREE.DynamicDrawUsage);
    this.finColours.setUsage(THREE.DynamicDrawUsage);
    this.meshes = materials.map((material, part) => {
      const mesh = new THREE.InstancedMesh(geometry[part]!, material, MAX_FISH);
      mesh.count = 0;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      // Body and peduncle share the body's colours, the four fins the fins'; the eyes have none.
      if (part < 2) mesh.instanceColor = this.bodyColours;
      else if (part < 6) mesh.instanceColor = this.finColours;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      return mesh;
    });
  }

  private geometryOf(level: keyof typeof LEVELS) {
    return (this.levels[level] ??= partsOf(LEVELS[level]));
  }

  /** The fish's size on screen picks the geometry: the light level wherever it cannot be told from the full one. */
  private setLevel(scale: number) {
    const level = scale <= LIGHT_SCALE ? "light" : "full";
    if (level === this.level) return;
    this.level = level;
    const geometry = this.geometryOf(level);
    this.meshes.forEach((mesh, part) => {
      mesh.geometry = geometry[part]!;
    });
  }

  /** Drawn at CSS resolution, as tech-eyes/1 draws its fish (pixel ratio 1). */
  setSize(width: number, height: number) {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this.width, this.height, false);
    this.camera.left = -this.width / 2;
    this.camera.right = this.width / 2;
    this.camera.top = this.height / 2;
    this.camera.bottom = -this.height / 2;
    const distance = Math.max(this.width, this.height) * 1.1;
    this.camera.position.set(0, distance, 0);
    this.camera.up.set(0, 0, -1);
    this.camera.lookAt(0, 0, 0);
    this.camera.updateProjectionMatrix();
    this.shownCount = -1;
  }

  render(
    fish: readonly Fish[],
    elapsedSeconds: number,
    deltaSeconds: number,
    scale: number,
    palette: FishPaletteId,
    life: LifeParameters = { ...LIFE_DEFAULTS, enabled: 0 },
  ) {
    const count = Math.min(MAX_FISH, fish.length);
    // Nothing to draw and nothing drawn: leave the cleared canvas alone.
    if (count === 0 && this.shownCount === 0) return;
    this.setMaterials(palette);
    this.setLevel(scale);
    const choices = palette === "mix" ? MIX_PALETTES : [palette];
    const [body, peduncle, tail, dorsalFin, leftFin, rightFin, leftEye, rightEye] = this.meshes.map((mesh) => mesh.instanceMatrix.array as Float32Array) as [
      Float32Array,
      Float32Array,
      Float32Array,
      Float32Array,
      Float32Array,
      Float32Array,
      Float32Array,
      Float32Array,
    ];
    for (const mesh of this.meshes) if (mesh.count !== count) mesh.count = count;
    const bodyColours = this.bodyColours.array as Float32Array;
    const finColours = this.finColours.array as Float32Array;
    const { root, local, fixedParts } = this;
    this.frame += 1;
    for (let index = 0; index < count; index += 1) {
      const agent = fish[index]!;
      const id = Math.floor(agent.seed);
      const sinking = agent.life.dying;
      const speed = Math.hypot(agent.vx, agent.vy);
      // A sinking fish's tail is still: its beat stops where it was and settles straight.
      let beat = this.phases.get(id);
      if (!beat) this.phases.set(id, (beat = { phase: id * 1.719, frame: 0 }));
      if (!sinking) beat.phase = THREE.MathUtils.euclideanModulo(beat.phase + deltaSeconds * (5.2 + speed * 0.018), Math.PI * 2);
      beat.frame = this.frame;
      const phase = beat.phase;
      const settle = sinking ? Math.max(0, 1 - agent.life.dyingTime / 0.3) : 1;
      const tailAngle = Math.sin(phase) * 0.38 * settle;
      // The fish's own matrix: where it is, its heading (Euler YXZ: heading, then the roll of a falling body), its size.
      const bob = sinking ? 0 : Math.sin(elapsedSeconds * 0.55 + index * 2.173) * 1.2;
      const roll = sinkRoll(agent.life);
      const ca = Math.cos(roll);
      const sa = Math.sin(roll);
      const cb = Math.cos(-agent.facing);
      const sb = Math.sin(-agent.facing);
      root[0] = cb * scale;
      root[1] = 0;
      root[2] = -sb * scale;
      root[4] = sb * sa * scale;
      root[5] = ca * scale;
      root[6] = cb * sa * scale;
      root[8] = sb * ca * scale;
      root[9] = -sa * scale;
      root[10] = cb * ca * scale;
      root[12] = agent.x - this.width / 2;
      root[13] = 10 + bob;
      root[14] = agent.y - this.height / 2;
      root[15] = 1;
      const at = index * 16;
      const pulse = sinking ? 1 : 1 + Math.sin(phase * 0.5) * 0.016;
      place(body, at, root, localMatrix(local, 0.15, 0, 0, 0, 0, 0, 5.65 * pulse, 3.38, 2.72));
      place(peduncle, at, root, fixedParts.peduncle);
      place(tail, at, root, localMatrix(local, -6.05, 0, 0, index % 2 ? -0.58 : 0.58, tailAngle, 0, 1, 1, 1));
      place(dorsalFin, at, root, fixedParts.dorsalFin);
      place(leftFin, at, root, localMatrix(local, 1.25, -0.1, 2.28, 0.8 + tailAngle * 0.18, -0.12, -0.3, 0.88, 0.68, 0.84));
      place(rightFin, at, root, localMatrix(local, 1.25, -0.1, -2.28, -0.8 - tailAngle * 0.18, 0.12, -0.3, 0.88, 0.68, 0.84));
      place(leftEye, at, root, fixedParts.leftEye);
      place(rightEye, at, root, fixedParts.rightEye);
      // Its colour: its own (섞음 deals one per fish, by its seed), what it has watched, then grey.
      const hashed = Math.sin(id * 12.9898 + 78.233) * 43_758.5453;
      const own = FISH_PALETTES[choices[Math.floor((hashed - Math.floor(hashed)) * choices.length)] ?? palette];
      lifeColour(agent.life, life, this.rgb(own.body), SPENT_BODY, this.body3);
      lifeColour(agent.life, life, this.rgb(own.fin), SPENT_FIN, this.fin3, 0.75);
      this.colour.setRGB(this.body3[0], this.body3[1], this.body3[2], THREE.SRGBColorSpace);
      this.colour.toArray(bodyColours, index * 3);
      this.colour.setRGB(this.fin3[0], this.fin3[1], this.fin3[2], THREE.SRGBColorSpace);
      this.colour.toArray(finColours, index * 3);
    }
    // Fish that are gone: forgotten now and then, not every frame.
    if (this.frame % 120 === 0) for (const [id, beat] of this.phases) if (beat.frame !== this.frame) this.phases.delete(id);
    // Only the fish there are go to the GPU.
    for (const mesh of this.meshes) {
      mesh.instanceMatrix.clearUpdateRanges();
      mesh.instanceMatrix.addUpdateRange(0, Math.max(1, count) * 16);
      mesh.instanceMatrix.needsUpdate = true;
    }
    for (const colours of [this.bodyColours, this.finColours]) {
      colours.clearUpdateRanges();
      colours.addUpdateRange(0, Math.max(1, count) * 3);
      colours.needsUpdate = true;
    }
    this.renderer.render(this.scene, this.camera);
    this.shownCount = count;
  }

  /** Builds something to draw with the fish: it gets a parent in the scene and the renderer. */
  extend<T>(make: (parent: THREE.Object3D, renderer: THREE.WebGLRenderer) => T) {
    return make(this.extras, this.renderer);
  }

  /** Waits for the GPU to finish this canvas's last frame (measurement only). */
  sync() {
    const gl = this.renderer.getContext();
    gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, this.syncPixel);
  }

  private readonly syncPixel = new Uint8Array(4);

  dispose() {
    const geometries = new Set<THREE.BufferGeometry>();
    for (const parts of Object.values(this.levels)) for (const geometry of parts) geometries.add(geometry);
    for (const geometry of geometries) geometry.dispose();
    for (const mesh of this.meshes) mesh.dispose();
    this.bodyMaterial.dispose();
    this.finMaterial.dispose();
    this.eyeMaterial.dispose();
    this.renderer.dispose();
  }

  private rgb(hex: string) {
    let found = this.parsed.get(hex);
    if (!found) this.parsed.set(hex, (found = rgbOf(hex)));
    return found;
  }

  /**
   * Colours travel per instance, set every frame from each fish's life (the
   * materials stay white); the palette's own colour sets only the materials'
   * faint emissive glow.
   */
  private setMaterials(id: FishPaletteId) {
    if (this.palette === id) return;
    this.palette = id;
    const palette = FISH_PALETTES[id];
    this.bodyMaterial.color.set("#ffffff");
    this.bodyMaterial.emissive.set(palette.body);
    this.finMaterial.color.set("#ffffff");
    this.finMaterial.emissive.set(palette.fin);
  }
}
