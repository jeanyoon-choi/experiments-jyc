import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { buildAtlas, buildGlyphs, WINDOW_WORDS, type SignCell } from "./atlas";
import { CAR_FLYERS, FISH_FLYERS, Play, SHARDS, type SignRecord } from "./play";
import {
  BUILDING_FRAG, BUILDING_VERT, CAR_FRAG, CAR_VERT, COMMON, FLARE_FRAG, FLARE_VERT,
  GROUND_FRAG, GROUND_VERT, HALO_FRAG, HALO_VERT,
  PROP_FRAG, PROP_VERT, SIGN_FRAG, SIGN_VERT, TREE_FRAG, TREE_VERT, FISH_FRAG, FISH_VERT,
  SHARD_FRAG, SHARD_VERT,
} from "./shaders";

// Street frame (metres): looking down -z. Left facades at x=-14, left sidewalk
// to the curb at -6.3, three lanes toward us, a median at 3.6–5.4, three lanes
// away, the right curb at 15.3 and right facades at 21.
const LEFT_FACADE = -14;
const RIGHT_FACADE = 21;
const Z_NEAR = 40;
const Z_FAR = -250;
const WRAP_MIN = -230;
const WRAP_LEN = 260;

// 24 Hz. Resolution is adaptive between MIN_DPR and min(device, MAX_DPR):
// it starts at 1.5 and climbs while each render finishes within about one
// display refresh, and drops by 15 % when renders spill over. DPR above 1 was
// opened at the user's request after the DPR 1 route ran well on their phone
// (2026-11-02); see docs/experiments/mobile/daechi.md for the budget.
const MAX_DPR = 2;
const MIN_DPR = 0.75;
const START_DPR = 1.5;
const FRAME_MS = 1000 / 24;

const LEFT_CROWD = 800;
const RIGHT_CROWD = 250;

function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Rand = () => number;
const range = (r: Rand, a: number, b: number) => a + (b - a) * r();
const pick = <T,>(r: Rand, list: readonly T[]) => list[Math.floor(r() * list.length)];

// --- Signs -----------------------------------------------------------------

class SignBuilder {
  pos: number[] = [];
  uv: number[] = [];
  rect: number[] = [];
  anim: number[] = [];
  size: number[] = [];
  index: number[] = [];
  hPos: number[] = [];
  hUv: number[] = [];
  hColor: number[] = [];
  hAnim: number[] = [];
  hSize: number[] = [];
  hIndex: number[] = [];
  records: SignRecord[] = [];

  add(
    center: THREE.Vector3, right: THREE.Vector3, w: number, h: number,
    cell: SignCell, anim: [number, number, number, number], windowFrac = 1, margin = 0.4,
  ) {
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(right, up);
    const quad = (
      target: { pos: number[]; uv: number[]; index: number[] }, c: THREE.Vector3, qw: number, qh: number,
    ) => {
      const base = target.pos.length / 3;
      const corners: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]];
      for (const [u, v] of corners) {
        const p = c.clone().addScaledVector(right, (u - 0.5) * qw).addScaledVector(up, (v - 0.5) * qh);
        target.pos.push(p.x, p.y, p.z);
        target.uv.push(u, v);
      }
      target.index.push(base, base + 1, base + 2, base, base + 2, base + 3);
    };
    const record: SignRecord = {
      c: center.clone(), right: right.clone(), normal: normal.clone(), w, h, rect: cell.rect,
      windowFrac, bright: anim[3], v: this.pos.length / 3, hv: -1, broken: false, claimed: 0,
    };
    this.records.push(record);
    quad({ pos: this.pos, uv: this.uv, index: this.index }, center, w, h);
    for (let k = 0; k < 4; k++) {
      this.rect.push(...cell.rect);
      this.anim.push(...anim);
      this.size.push(w, h, windowFrac);
    }
    if (margin <= 0) return;
    record.hv = this.hPos.length / 3;
    const hc = center.clone().addScaledVector(normal, -0.03);
    quad({ pos: this.hPos, uv: this.hUv, index: this.hIndex }, hc, w + margin * 2, h + margin * 2);
    for (let k = 0; k < 4; k++) {
      this.hColor.push(...cell.glow);
      this.hAnim.push(...anim);
      this.hSize.push(w, h, margin);
    }
  }

  geometries() {
    const sign = new THREE.BufferGeometry();
    sign.setAttribute("position", new THREE.Float32BufferAttribute(this.pos, 3));
    sign.setAttribute("uv", new THREE.Float32BufferAttribute(this.uv, 2));
    sign.setAttribute("aRect", new THREE.Float32BufferAttribute(this.rect, 4));
    sign.setAttribute("aAnim", new THREE.Float32BufferAttribute(this.anim, 4));
    sign.setAttribute("aSize", new THREE.Float32BufferAttribute(this.size, 3));
    sign.setAttribute("aBroken", new THREE.Float32BufferAttribute(new Float32Array(this.pos.length / 3), 1));
    sign.setIndex(this.index);
    const halo = new THREE.BufferGeometry();
    halo.setAttribute("position", new THREE.Float32BufferAttribute(this.hPos, 3));
    halo.setAttribute("uv", new THREE.Float32BufferAttribute(this.hUv, 2));
    halo.setAttribute("aColor", new THREE.Float32BufferAttribute(this.hColor, 3));
    halo.setAttribute("aAnim", new THREE.Float32BufferAttribute(this.hAnim, 4));
    halo.setAttribute("aSize", new THREE.Float32BufferAttribute(this.hSize, 3));
    halo.setAttribute("aBroken", new THREE.Float32BufferAttribute(new Float32Array(this.hPos.length / 3), 1));
    halo.setIndex(this.hIndex);
    return { sign, halo };
  }
}

const signAnim = (r: Rand, flat: boolean): [number, number, number, number] => {
  const x = r();
  const mode = x < 0.68 ? 0 : x < 0.75 ? 1 : x < 0.84 ? 2 : x < 0.93 ? 4 : 5;
  const rate = mode === 1 ? range(r, 0.6, 1.4) : mode === 2 ? range(r, 0.3, 0.8) : 1;
  return [mode, r() * 10, rate, range(r, 0.85, 1.15) * (flat ? 1 : 1.05)];
};

// --- Static props: trunks, lamp posts, signals -----------------------------

class PropBuilder {
  parts: THREE.BufferGeometry[] = [];
  add(geo: THREE.BufferGeometry, at: THREE.Vector3, color: [number, number, number], emit = 0, rotZ = 0) {
    if (rotZ) geo.rotateZ(rotZ);
    geo.translate(at.x, at.y, at.z);
    const n = geo.attributes.position.count;
    geo.setAttribute("color", new THREE.Float32BufferAttribute(new Array(n).fill(0).flatMap(() => color), 3));
    geo.setAttribute("aEmit", new THREE.Float32BufferAttribute(new Array(n).fill(emit), 1));
    this.parts.push(geo);
  }
}

// --- Bodies ----------------------------------------------------------------

function tagged(geo: THREE.BufferGeometry, part: number) {
  geo.setAttribute("aPart", new THREE.Float32BufferAttribute(new Array(geo.attributes.position.count).fill(part), 1));
  return geo;
}

function triangles(points: number[], index: number[], part: number) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  geo.setIndex(index);
  geo.computeVertexNormals();
  return tagged(geo, part);
}

// A goldfish stood on its tail: nose up, belly forward (-z), back (+z).
function fishGeometry() {
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, part: number) =>
    tagged(new THREE.BoxGeometry(w, h, d).translate(x, y, z), part);
  const body = new THREE.SphereGeometry(1, 9, 7).scale(0.2, 0.46, 0.3).translate(0, 1.0, 0);
  const eye = (x: number) => tagged(new THREE.SphereGeometry(0.055, 5, 4).translate(x, 1.27, -0.13), 1);
  // Fantail: two fans hanging down and back from the peduncle.
  const tail = (x: number) => triangles([
    x, 0.62, 0.1,
    x, 0.36, 0.5, x * 3, 0.14, 0.44, x, 0.28, 0.26, x * 3, 0.04, 0.2, x, 0.14, 0.02,
  ], [0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 5], 8);
  const fin = (sx: number, part: number) => triangles([
    sx * 0.18, 1.04, -0.06, sx * 0.4, 0.86, -0.02, sx * 0.3, 0.78, 0.12,
  ], [0, 1, 2], part);
  const dorsal = triangles([0, 1.42, 0.2, 0, 1.16, 0.28, 0, 1.4, 0.5], [0, 1, 2], 9);
  const phone = triangles([
    -0.09, 0.98, -0.36, -0.01, 0.98, -0.36, -0.01, 1.11, -0.3, -0.09, 1.11, -0.3,
  ], [0, 1, 2, 0, 2, 3], 7);
  const parts = [
    tagged(body, 0), eye(-0.17), eye(0.17),
    box(0.07, 0.5, 0.07, -0.09, 0.31, -0.08, 2), box(0.07, 0.5, 0.07, 0.09, 0.31, -0.08, 3),
    box(0.32, 0.42, 0.16, 0, 0.96, 0.36, 4),
    box(0.035, 0.46, 0.035, -0.1, 1.0, -0.275, 4), box(0.035, 0.46, 0.035, 0.1, 1.0, -0.275, 4),
    fin(-1, 5), fin(1, 6), tail(-0.02), tail(0.02), dorsal, phone,
  ];
  parts.forEach((g) => {
    g.deleteAttribute("uv");
  });
  return mergeGeometries(parts)!;
}

function carGeometry() {
  const box = (w: number, h: number, d: number, x: number, y: number, z: number, part: number) =>
    tagged(new THREE.BoxGeometry(w, h, d).translate(x, y, z), part);
  const wheels = [-1, 1].flatMap((sx) => [-1, 1].map((sz) => box(0.24, 0.62, 0.62, sx * 0.84, 0.31, sz * 1.4, 4)));
  return mergeGeometries([
    box(1.8, 0.72, 4.5, 0, 0.74, 0, 0),
    box(1.58, 0.56, 2.4, 0, 1.38, 0.2, 1),
    ...wheels,
    box(0.42, 0.14, 0.06, -0.6, 0.86, -2.26, 2),
    box(0.42, 0.14, 0.06, 0.6, 0.86, -2.26, 2),
    box(0.4, 0.16, 0.06, -0.66, 0.96, 2.26, 3),
    box(0.4, 0.16, 0.06, 0.66, 0.96, 2.26, 3),
  ])!;
}

function flareGeometry() {
  const lights: [number, number, number, number][] = [
    [-0.6, 0.86, -2.32, 0], [0.6, 0.86, -2.32, 0],
    [-0.66, 0.96, 2.32, 1], [0.66, 0.96, 2.32, 1],
  ];
  const light: number[] = [];
  const flare: number[] = [];
  const index: number[] = [];
  const corners: [number, number][] = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
  for (const streak of [0, 2]) {
    for (const [x, y, z, kind] of lights) {
      const base = light.length / 3;
      for (const [cx, cy] of corners) {
        light.push(x, y, z);
        flare.push(cx, cy, kind + streak);
      }
      index.push(base, base + 1, base + 2, base, base + 2, base + 3);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(light, 3));
  geo.setAttribute("aLight", new THREE.Float32BufferAttribute(light, 3));
  geo.setAttribute("aFlare", new THREE.Float32BufferAttribute(flare, 3));
  geo.setIndex(index);
  return geo;
}

// --- Scene -----------------------------------------------------------------

export type DaechiScene = { dispose: () => void };

export function createDaechi(container: HTMLElement): DaechiScene {
  const r = rng(20261102);
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  const deviceDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  let dpr = Math.min(deviceDpr, START_DPR);
  renderer.setPixelRatio(dpr);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  renderer.domElement.style.display = "block";
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";

  const fogColor = new THREE.Color(0.045, 0.045, 0.09);
  const scene = new THREE.Scene();
  scene.background = fogColor;

  const camera = new THREE.PerspectiveCamera(60, 1, 0.5, 420);
  camera.position.set(-10.6, 12.5, 26);

  const uniforms = {
    uTime: { value: 0 },
    uFogColor: { value: new THREE.Vector3(fogColor.r, fogColor.g, fogColor.b) },
    uFogDensity: { value: 0.0042 },
  };
  const disposables: { dispose: () => void }[] = [];
  const material = (vert: string, frag: string, extra: Record<string, THREE.IUniform> = {}, opts: Partial<THREE.ShaderMaterialParameters> = {}) => {
    const m = new THREE.ShaderMaterial({
      uniforms: { ...uniforms, ...extra },
      vertexShader: COMMON + vert,
      fragmentShader: COMMON + frag,
      ...opts,
    });
    disposables.push(m);
    return m;
  };
  const add = <T extends THREE.Mesh>(obj: T): T => {
    obj.frustumCulled = false;
    obj.matrixAutoUpdate = false;
    obj.updateMatrix();
    scene.add(obj);
    disposables.push(obj.geometry);
    return obj;
  };

  // Ground.
  const ground = new THREE.PlaneGeometry(220, Z_NEAR - Z_FAR + 120, 1, 1).rotateX(-Math.PI / 2);
  ground.translate(3, 0, (Z_NEAR + Z_FAR) / 2 - 40);
  add(new THREE.Mesh(ground, material(GROUND_VERT, GROUND_FRAG))).renderOrder = 6;

  // Atlas.
  const atlas = buildAtlas();
  const texture = new THREE.CanvasTexture(atlas.canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  disposables.push(texture);

  const signs = new SignBuilder();
  const buildings: THREE.BufferGeometry[] = [];
  const props = new PropBuilder();
  const treeSpots: THREE.Vector3[] = [];

  const block = (cx: number, cz: number, w: number, depth: number, h: number, seed: number, y0 = 0) => {
    const geo = new THREE.BoxGeometry(depth, h, w).translate(cx, y0 + h / 2, cz);
    geo.setAttribute("aSeed", new THREE.Float32BufferAttribute(new Array(geo.attributes.position.count).fill(seed), 1));
    buildings.push(geo);
  };

  // Facade rows on both sides.
  for (const side of [-1, 1] as const) {
    const facade = side < 0 ? LEFT_FACADE : RIGHT_FACADE;
    const out = side < 0 ? 1 : -1; // facade normal along x
    const right = new THREE.Vector3(0, 0, side < 0 ? -1 : 1);
    const along = new THREE.Vector3(1, 0, 0);
    let z = Z_NEAR;
    while (z > Z_FAR) {
      // Daechi's academy buildings: five to ten floors of tile and ribbon windows.
      const w = range(r, 10, 20);
      const floors = Math.floor(range(r, 5, z < -150 ? 12 : 10.5));
      const h = 4.2 + floors * 3.4 + 0.8;
      const depth = range(r, 18, 26);
      const cz = z - w / 2;
      const seed = r() * 0.999;
      block(facade - (out * depth) / 2, cz, w, depth, h, seed);
      // Stair penthouse and water tank on the roof.
      if (r() < 0.7) block(facade - out * range(r, 6, 12), cz + range(r, -w / 4, w / 4), range(r, 3, 5), range(r, 3, 5), 3, -seed - 0.01, h);
      if (r() < 0.4) block(facade - out * range(r, 4, 14), cz + range(r, -w / 3, w / 3), 2.2, 2.2, 1.8, -0.5, h);

      const zLo = cz - w / 2 + 0.6;
      const zHi = cz + w / 2 - 0.6;
      const at = (y: number, zz: number, off = 0.06) => new THREE.Vector3(facade + out * off, y, zz);

      // Shop fascia.
      for (let s = zHi; s - 5.6 > zLo - 0.1; s -= 6.2) {
        const c = pick(r, atlas.horizontal);
        signs.add(at(4.15, s - 2.8), right, 5.4, 0.95, c, signAnim(r, true), 1, 0);
      }
      // Floor signs hang on the band under every floor's ribbon window,
      // packed edge to edge: one academy (or several) per floor.
      for (let f = 0; f < floors; f++) {
        if (r() > 0.9) continue;
        const y = 4.2 + f * 3.4 + 0.62;
        if (r() < 0.08) {
          const lw = Math.min(w - 1.4, 10);
          const lh = 0.6;
          const c = pick(r, atlas.led);
          signs.add(at(y, cz), right, lw, lh, c, [3, 0, range(r, 0.025, 0.045), 1.25], (lw / lh) / (2048 / 62), 0.25);
          continue;
        }
        let s = zHi + range(r, -0.6, 0);
        while (true) {
          const sh = range(r, 0.85, 1.1);
          const sw = sh * 4;
          if (s - sw < zLo) break;
          signs.add(at(y, s - sw / 2), right, sw, sh, pick(r, atlas.horizontal), signAnim(r, true), 1, 0.25);
          s -= sw + range(r, 0.12, 0.7);
        }
      }
      // Projecting vertical stacks, one academy per unit.
      const spots = [zHi - 0.2, zLo + 0.2];
      if (w > 14) spots.push(cz + range(r, -1, 1));
      for (const sz of spots) {
        if (r() < 0.12) continue;
        const units = Math.min(Math.floor(range(r, 2, 6)), Math.max(1, Math.floor(floors / 1.2)));
        let y = 4.9;
        const vw = 0.95;
        for (let u = 0; u < units; u++) {
          const vh = range(r, 3.0, 3.7);
          const c = pick(r, atlas.vertical);
          signs.add(new THREE.Vector3(facade + out * (0.15 + vw / 2), y + vh / 2, sz), along, vw, vh, c, signAnim(r, false), 1, 0.35);
          y += vh + 0.22;
        }
      }
      // Rooftop board facing the road, with running bulbs.
      if (r() < 0.45) {
        signs.add(new THREE.Vector3(facade - out * 1.2, h + 1.6, cz), right, Math.min(w - 2, 9), 2.2, pick(r, atlas.horizontal), [4, r() * 5, 1, 1.1], 1, 0.6);
      }

      z -= w + (r() < 0.25 ? range(r, 2.5, 5) : 0.25);
    }
  }

  // Apartment slabs close the street.
  for (let i = 0; i < 18; i++) {
    const x = range(r, -70, 90);
    const zz = range(r, -270, -340);
    const w = range(r, 36, 60);
    const h = range(r, 42, 75);
    const geo = new THREE.BoxGeometry(w, h, range(r, 11, 14)).translate(x, h / 2, zz);
    geo.setAttribute("aSeed", new THREE.Float32BufferAttribute(new Array(geo.attributes.position.count).fill(2 + r()), 1));
    buildings.push(geo);
    if (r() < 0.4) {
      signs.add(new THREE.Vector3(x, h + 3, zz + 8), new THREE.Vector3(1, 0, 0), 14, 3.5, pick(r, atlas.horizontal), [0, 0, 1, 1.2], 1, 0);
    }
  }

  const buildingGeo = mergeGeometries(buildings)!;
  buildings.forEach((g) => g.dispose());
  if (WINDOW_WORDS.length !== 20) throw new Error("BUILDING_FRAG expects 20 window words");
  const glyphs = buildGlyphs();
  const glyphTexture = new THREE.CanvasTexture(glyphs.canvas);
  glyphTexture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  disposables.push(glyphTexture);
  add(new THREE.Mesh(buildingGeo, material(BUILDING_VERT, BUILDING_FRAG, {
    uGlyphs: { value: glyphTexture },
    uWords: { value: glyphs.words },
    uWordLen: { value: glyphs.lengths },
  }))).renderOrder = 5;

  const { sign, halo } = signs.geometries();
  add(new THREE.Mesh(sign, material(SIGN_VERT, SIGN_FRAG, { uAtlas: { value: texture } }, { side: THREE.DoubleSide }))).renderOrder = 4;
  add(new THREE.Mesh(halo, material(HALO_VERT, HALO_FRAG, {}, {
    side: THREE.DoubleSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  })));

  // Lamp posts every 26 m (the shader's lamp grid) and trees between them.
  for (let z = Math.round(Z_NEAR / 26) * 26; z > Z_FAR; z -= 26) {
    for (const [x, arm] of [[-6.6, 1], [15.6, -1]] as const) {
      const poleX = x - arm * 0.9;
      props.add(new THREE.CylinderGeometry(0.09, 0.13, 7.8, 6), new THREE.Vector3(poleX, 3.9, z), [0.25, 0.26, 0.28]);
      props.add(new THREE.BoxGeometry(1.2, 0.08, 0.08), new THREE.Vector3(x - arm * 0.3, 7.75, z), [0.25, 0.26, 0.28]);
      props.add(new THREE.BoxGeometry(0.7, 0.14, 0.34), new THREE.Vector3(x, 7.62, z), [1.0, 0.78, 0.5], 1);
    }
  }
  // Only a sparse row on the far (right) sidewalk, so the crowd and the road
  // stay visible from the camera above the left sidewalk.
  for (let z = Z_NEAR - 10; z > Z_FAR; z -= range(r, 16, 20)) {
    const cz = ((z + 38) % 140 + 140) % 140;
    if (cz < 7) continue; // keep crosswalks open
    treeSpots.push(new THREE.Vector3(16.6, 0, z));
  }
  for (const t of treeSpots) props.add(new THREE.CylinderGeometry(0.12, 0.18, 6.6, 5), t.clone().setY(3.3), [0.16, 0.13, 0.1]);

  // Signal heads at the crosswalks.
  for (const z of [-40, -180]) {
    props.add(new THREE.CylinderGeometry(0.12, 0.12, 6.4, 6), new THREE.Vector3(-6.5, 3.2, z), [0.3, 0.3, 0.32]);
    props.add(new THREE.BoxGeometry(6, 0.14, 0.14), new THREE.Vector3(-3.5, 6.2, z), [0.3, 0.3, 0.32]);
    props.add(new THREE.BoxGeometry(1.4, 0.42, 0.3), new THREE.Vector3(-1.2, 6.2, z), [0.05, 0.05, 0.05]);
    props.add(new THREE.BoxGeometry(0.28, 0.28, 0.05), new THREE.Vector3(-1.7, 6.2, z + 0.18), [1.0, 0.08, 0.05], 1);
  }
  const propGeo = mergeGeometries(props.parts)!;
  props.parts.forEach((g) => g.dispose());
  add(new THREE.Mesh(propGeo, material(PROP_VERT, PROP_FRAG))).renderOrder = 2;

  // Tree canopies.
  const canopy = mergeGeometries([
    new THREE.IcosahedronGeometry(1.5, 1),
    new THREE.IcosahedronGeometry(1.1, 0).translate(0.7, 0.6, 0.3),
  ].map((g) => { g.deleteAttribute("uv"); return g; }))!;
  const trees = new THREE.InstancedMesh(canopy, material(TREE_VERT, TREE_FRAG), treeSpots.length);
  const treeSeed = new Float32Array(treeSpots.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  const s3 = new THREE.Vector3();
  treeSpots.forEach((t, i) => {
    const sc = range(r, 0.8, 1.05);
    q.setFromEuler(e.set(0, r() * Math.PI * 2, 0));
    m4.compose(new THREE.Vector3(t.x, 7.4 + range(r, -0.4, 0.5), t.z), q, s3.set(sc, sc * 0.9, sc));
    trees.setMatrixAt(i, m4);
    treeSeed[i] = r() * 100;
  });
  canopy.setAttribute("aSeed", new THREE.InstancedBufferAttribute(treeSeed, 1));
  add(trees).renderOrder = 3;

  // Goldfish students.
  const people = LEFT_CROWD + RIGHT_CROWD;
  const body = fishGeometry();
  const crowd = new THREE.InstancedMesh(body, material(FISH_VERT, FISH_FRAG, {
    uZMin: { value: WRAP_MIN }, uZLen: { value: WRAP_LEN },
  }, { side: THREE.DoubleSide }), people);
  const walk = new Float32Array(people * 4);
  const crowdX = new Float32Array(people);
  const crowdZ = new Float32Array(people);
  const crowdScale = new Float32Array(people);
  const scales = new Float32Array(people * 3);
  const patches = new Float32Array(people * 3);
  const bag = new Float32Array(people * 3);
  const ORANGE: [number, number, number] = [1.0, 0.42, 0.06];
  const RED: [number, number, number] = [0.92, 0.16, 0.06];
  const WHITE: [number, number, number] = [0.95, 0.92, 0.86];
  const BLACK: [number, number, number] = [0.05, 0.04, 0.05];
  const GOLD: [number, number, number] = [1.0, 0.66, 0.12];
  // [main, patch]: plain orange, red-white, calico, black demekin, gold.
  const COATS: [number, number, number][][] = [
    [ORANGE, ORANGE], [ORANGE, ORANGE], [ORANGE, GOLD], [RED, WHITE], [RED, WHITE],
    [WHITE, RED], [ORANGE, BLACK], [BLACK, BLACK], [GOLD, ORANGE], [RED, RED],
  ];
  const BAGS: [number, number, number][] = [[0.02, 0.02, 0.02], [0.02, 0.02, 0.02], [0.05, 0.06, 0.14], [0.3, 0.3, 0.32], [0.55, 0.5, 0.45], [0.7, 0.45, 0.5], [0.12, 0.3, 0.6]];
  for (let i = 0; i < people; i++) {
    const left = i < LEFT_CROWD;
    const x = left ? range(r, -13.3, -6.9) : range(r, 15.9, 20.3);
    const z0 = range(r, WRAP_MIN, WRAP_MIN + WRAP_LEN);
    // Near the shuttle stop and shop doors, more of them stand.
    const standing = r() < (left && (x > -7.8 || x < -12.6) ? 0.55 : 0.18);
    const toward = r() < 0.42;
    const speed = standing ? 0 : (toward ? 1 : -1) * range(r, 0.9, 1.55);
    const yaw = standing ? r() * Math.PI * 2 : toward ? Math.PI : 0;
    const sc = r() < 0.15 ? range(r, 0.8, 0.9) : range(r, 0.95, 1.12);
    q.setFromEuler(e.set(0, yaw + range(r, -0.15, 0.15), 0));
    m4.compose(new THREE.Vector3(x, 0, z0), q, s3.set(sc, sc, sc));
    crowd.setMatrixAt(i, m4);
    crowdX[i] = x;
    crowdZ[i] = z0;
    crowdScale[i] = sc;
    walk.set([speed, r(), standing ? 0 : range(r, 0, 0.35), standing || r() < 0.3 ? 1 : 0], i * 4);
    const [main, patch] = pick(r, COATS);
    scales.set(main, i * 3);
    patches.set(patch, i * 3);
    bag.set(pick(r, BAGS), i * 3);
  }
  body.setAttribute("aWalk", new THREE.InstancedBufferAttribute(walk, 4));
  body.setAttribute("aScale", new THREE.InstancedBufferAttribute(scales, 3));
  body.setAttribute("aPatch", new THREE.InstancedBufferAttribute(patches, 3));
  body.setAttribute("aBag", new THREE.InstancedBufferAttribute(bag, 3));
  const hideAttr = new THREE.InstancedBufferAttribute(new Float32Array(people), 1);
  hideAttr.setUsage(THREE.DynamicDrawUsage);
  body.setAttribute("aHide", hideAttr);
  add(crowd).renderOrder = 0;

  // Lifted fish, drawn from their own matrices.
  const flyGeo = fishGeometry();
  const dynamic = (size: number) => {
    const a = new THREE.InstancedBufferAttribute(new Float32Array(FISH_FLYERS * size), size);
    a.setUsage(THREE.DynamicDrawUsage);
    return a;
  };
  flyGeo.setAttribute("aWalk", dynamic(4));
  flyGeo.setAttribute("aScale", dynamic(3));
  flyGeo.setAttribute("aPatch", dynamic(3));
  flyGeo.setAttribute("aBag", dynamic(3));
  const flyMesh = new THREE.InstancedMesh(flyGeo, material(FISH_VERT, FISH_FRAG, {
    uZMin: { value: WRAP_MIN }, uZLen: { value: WRAP_LEN },
  }, { side: THREE.DoubleSide, defines: { FLY: "" } }), FISH_FLYERS);
  flyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  add(flyMesh).renderOrder = 0;

  // Pieces of smashed signs.
  const shardGeo = new THREE.PlaneGeometry(1, 1);
  const shardRect = new THREE.InstancedBufferAttribute(new Float32Array(SHARDS * 4), 4);
  const shardBright = new THREE.InstancedBufferAttribute(new Float32Array(SHARDS), 1);
  shardRect.setUsage(THREE.DynamicDrawUsage);
  shardBright.setUsage(THREE.DynamicDrawUsage);
  shardGeo.setAttribute("aRect", shardRect);
  shardGeo.setAttribute("aBright", shardBright);
  const shardMesh = new THREE.InstancedMesh(shardGeo, material(SHARD_VERT, SHARD_FRAG, { uAtlas: { value: texture } }, { side: THREE.DoubleSide }), SHARDS);
  shardMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  add(shardMesh).renderOrder = 1;

  const playArgs = {
    x: crowdX, z: crowdZ, speed: walk.filter((_, k) => k % 4 === 0), phase: walk.filter((_, k) => k % 4 === 1),
    sway: walk.filter((_, k) => k % 4 === 2), scale: crowdScale, hide: hideAttr, zMin: WRAP_MIN, zLen: WRAP_LEN,
    scales, patches, bags: bag,
  };

  // Traffic: two lanes toward us (the curb lane is the 학원차 queue), three away.
  type Car = { x: number; z: number; speed: number; phase: number; amp: number; kind: number; color: [number, number, number] };
  const cars: Car[] = [];
  const CAR_COLORS: [number, number, number][] = [
    [0.82, 0.82, 0.84], [0.82, 0.82, 0.84], [0.03, 0.03, 0.035], [0.03, 0.03, 0.035], [0.5, 0.5, 0.52],
    [0.2, 0.2, 0.22], [0.06, 0.08, 0.2], [0.95, 0.75, 0.05],
  ];
  const lanes: [number, number][] = [[-1.2, 1], [2.0, 1], [7.0, -1], [10.2, -1], [13.4, -1]];
  for (const [x, dir] of lanes) {
    const speed = dir * range(r, 4.5, 7.5);
    const phase = r() * 6.28;
    for (let z = WRAP_MIN; z < WRAP_MIN + WRAP_LEN - 8; z += range(r, 7, 13)) {
      cars.push({ x: x + range(r, -0.15, 0.15), z, speed, phase, amp: 0.85, kind: 0, color: pick(r, CAR_COLORS) });
    }
  }
  for (let z = 14; z > -140; z -= range(r, 6.8, 9)) {
    if (r() < 0.15) continue;
    cars.push({ x: -4.5, z, speed: 0, phase: r() * 4, amp: 0, kind: 1, color: [0.98, 0.78, 0.02] });
  }
  for (let z = -10; z > -120; z -= range(r, 14, 30)) {
    cars.push({ x: 14.1, z, speed: 0, phase: r() * 4, amp: 0, kind: 1, color: [0.98, 0.78, 0.02] });
  }
  const carGeo = carGeometry();
  const flareGeo = flareGeometry();
  const carAttr = new Float32Array(cars.length * 4);
  const carBody = new Float32Array(cars.length * 3);
  const carMesh = new THREE.InstancedMesh(carGeo, material(CAR_VERT, CAR_FRAG, {
    uZMin: { value: WRAP_MIN }, uZLen: { value: WRAP_LEN },
  }), cars.length);
  const flareMesh = new THREE.InstancedMesh(flareGeo, material(FLARE_VERT, FLARE_FRAG, {
    uZMin: { value: WRAP_MIN }, uZLen: { value: WRAP_LEN },
  }, { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), cars.length);
  cars.forEach((c, i) => {
    const faceUs = c.speed > 0 || c.kind === 1;
    q.setFromEuler(e.set(0, faceUs ? Math.PI : 0, 0));
    const scale = c.kind === 1 ? s3.set(1.05, 1.35, 1.2) : s3.set(1, 1, range(r, 0.92, 1.05));
    m4.compose(new THREE.Vector3(c.x, 0, c.z), q, scale);
    carMesh.setMatrixAt(i, m4);
    flareMesh.setMatrixAt(i, m4);
    carAttr.set([c.speed, c.phase, c.amp, c.kind], i * 4);
    carBody.set(c.color, i * 3);
  });
  const carInstance = new THREE.InstancedBufferAttribute(carAttr, 4);
  const carHide = new THREE.InstancedBufferAttribute(new Float32Array(cars.length), 1);
  carHide.setUsage(THREE.DynamicDrawUsage);
  carGeo.setAttribute("aCar", carInstance);
  carGeo.setAttribute("aBody", new THREE.InstancedBufferAttribute(carBody, 3));
  carGeo.setAttribute("aHide", carHide);
  flareGeo.setAttribute("aCar", carInstance);
  flareGeo.setAttribute("aHide", carHide);
  add(carMesh).renderOrder = 1;
  add(flareMesh).renderOrder = 8;

  // Flying cars, drawn from their own matrices.
  const carFlyGeo = carGeometry();
  const carDyn = (size: number) => {
    const a = new THREE.InstancedBufferAttribute(new Float32Array(CAR_FLYERS * size), size);
    a.setUsage(THREE.DynamicDrawUsage);
    return a;
  };
  carFlyGeo.setAttribute("aCar", carDyn(4));
  carFlyGeo.setAttribute("aBody", carDyn(3));
  const carFlyMesh = new THREE.InstancedMesh(carFlyGeo, material(CAR_VERT, CAR_FRAG, {
    uZMin: { value: WRAP_MIN }, uZLen: { value: WRAP_LEN },
  }, { defines: { FLY: "" } }), CAR_FLYERS);
  carFlyMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  add(carFlyMesh).renderOrder = 1;

  const carX = new Float32Array(cars.length);
  const carZ = new Float32Array(cars.length);
  const carSize = new Float32Array(cars.length * 3);
  const carYaw = new Float32Array(cars.length);
  const tmpPos = new THREE.Vector3();
  for (let i = 0; i < cars.length; i++) {
    carMesh.getMatrixAt(i, m4);
    m4.decompose(tmpPos, q, s3);
    carX[i] = tmpPos.x;
    carZ[i] = tmpPos.z;
    s3.toArray(carSize, i * 3);
    carYaw[i] = e.setFromQuaternion(q).y;
  }
  const play = new Play(camera, playArgs, {
    x: carX, z: carZ, car: carAttr, body: carBody, size: carSize, yaw: carYaw, hide: carHide, zMin: WRAP_MIN, zLen: WRAP_LEN,
  }, signs.records, sign.getAttribute("aBroken") as THREE.BufferAttribute, halo.getAttribute("aBroken") as THREE.BufferAttribute,
  [flyMesh, carFlyMesh], shardMesh);

  // Camera: fixed, high above the left sidewalk, looking down the street.
  camera.lookAt(-2.5, 0, -60);

  // A finger on a goldfish lifts it; letting go sends it swimming at signs.
  const el = renderer.domElement;
  el.style.touchAction = "none";
  const ndc = new THREE.Vector2();
  const toNdc = (ev: PointerEvent) => {
    const rect = el.getBoundingClientRect();
    return ndc.set(((ev.clientX - rect.left) / rect.width) * 2 - 1, -(((ev.clientY - rect.top) / rect.height) * 2 - 1));
  };
  const onDown = (ev: PointerEvent) => {
    if (play.grab(ev.pointerId, toNdc(ev), uniforms.uTime.value, el.clientHeight)) {
      el.setPointerCapture(ev.pointerId);
      wake();
    }
  };
  const onMove = (ev: PointerEvent) => play.move(ev.pointerId, toNdc(ev));
  const onUp = (ev: PointerEvent) => play.release(ev.pointerId);
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointermove", onMove);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);

  const resize = () => {
    const w = Math.max(container.clientWidth, 1);
    const h = Math.max(container.clientHeight, 1);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 64 : 46;
    camera.updateProjectionMatrix();
    wake();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const start = performance.now();
  // Open on a moment when the street is already full.
  const offset = 400;
  let raf = 0;
  let last = 0;
  let frozenAt = 0;
  // Adaptive resolution. Between renders rAF keeps ticking at the display
  // rate; the tick right after a render arrives late when the GPU is busy, so
  // its interval against the display refresh is the cost of that render.
  let prevTick = 0;
  let refresh = 1000 / 60;
  let cost = refresh;
  let rendered = false;
  let lastTune = 0;
  const tune = (now: number) => {
    const delta = now - prevTick;
    prevTick = now;
    const wasRendered = rendered;
    rendered = false;
    if (!delta || delta > 200) return; // first tick, a stall or a return from the background
    if (delta < refresh) refresh = Math.max(delta, 1000 / 144);
    else if (!wasRendered) refresh += (delta - refresh) * 0.01;
    if (!wasRendered) return;
    cost += (delta - cost) * 0.2;
    if (now - lastTune < 1200) return;
    let next = dpr;
    if (cost > refresh * 1.7) next = Math.max(MIN_DPR, dpr * 0.85);
    else if (cost < refresh * 1.2) next = Math.min(deviceDpr, dpr + 0.1);
    if (Math.abs(next - dpr) > 0.01) {
      dpr = next;
      renderer.setPixelRatio(dpr);
      lastTune = now;
      cost = refresh;
    }
  };

  const frame = (now: number) => {
    raf = 0;
    // Reduced motion holds the street still, but a lifted fish still moves.
    const still = document.hidden || (reduced.matches && !play.busy);
    if (!still) raf = requestAnimationFrame(frame);
    if (!still) tune(now);
    if (!still && now - last < FRAME_MS - 2) return;
    last = now;
    rendered = !still;
    const dt = Math.min(0.1, Math.max(0, (now - start) / 1000 - frozenAt));
    if (!still) frozenAt = (now - start) / 1000;
    const t = offset + frozenAt;
    uniforms.uTime.value = t;
    play.update(dt, t);
    renderer.render(scene, camera);
  };
  function wake() {
    if (!raf) raf = requestAnimationFrame(frame);
  }
  const onVisibility = () => wake();
  document.addEventListener("visibilitychange", onVisibility);
  reduced.addEventListener("change", onVisibility);
  resize();

  return {
    dispose() {
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      reduced.removeEventListener("change", onVisibility);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      disposables.forEach((d) => d.dispose());
      renderer.dispose();
      el.remove();
    },
  };
}
