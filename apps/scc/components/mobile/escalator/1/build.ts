import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Escalator frame (metres): runs along +x from the bottom comb at x=0 to the
// top comb at x=LX, rises H at 30°, centred on z=0. Treads stay horizontal.
export const H = 8;
export const TAN = Math.tan(Math.PI / 6);
export const RUN = H / TAN;
export const FLAT = 2;
export const TR = 1;
export const LX = FLAT * 2 + RUN;
export const STEP = 0.4;
export const RISE = STEP * TAN;
export const STEPS = Math.ceil((LX + 1.2) / STEP);
export const LOOP = STEPS * STEP;
export const SPEED = 0.45;
export const HANDRAIL_SPEED = SPEED / Math.cos(Math.PI / 6);
export const ZONE = 3.2;
export const SLAB = 1;
export const LIGHT_SAMPLES = 64;
export const LIGHT_X0 = -0.6;
export const LIGHT_X1 = LX + 0.6;

export function ramp(u: number) {
  if (u <= -TR) return 0;
  if (u >= TR) return u;
  return ((u + TR) * (u + TR)) / (4 * TR);
}

export function profileY(x: number) {
  return TAN * (ramp(x - FLAT) - ramp(x - FLAT - RUN));
}

export const MAT_KEYS = ["steel", "glass", "rubber", "brush", "plate", "terrazzo", "concrete", "led", "lamp"] as const;
export type MatKey = (typeof MAT_KEYS)[number];
export type Lod = "near" | "far";

/** orient −1 turns the escalator round so its bottom sits at bank x=LX. */
export type Lane = { z: number; orient: 1 | -1; dir: 1 | -1 };
export type BankType = { lanes: Lane[]; halfWidth: number };

export const BANKS: BankType[] = [
  {
    halfWidth: 3.3,
    lanes: [
      { z: -2.4, orient: 1, dir: 1 },
      { z: -0.8, orient: -1, dir: 1 },
      { z: 0.8, orient: 1, dir: -1 },
      { z: 2.4, orient: -1, dir: -1 },
    ],
  },
  {
    halfWidth: 1.7,
    lanes: [
      { z: -0.8, orient: 1, dir: 1 },
      { z: 0.8, orient: -1, dir: -1 },
    ],
  },
];

export function laneMatrix(lane: Lane) {
  const m = new THREE.Matrix4();
  if (lane.orient === 1) return m.makeTranslation(0, 0, lane.z);
  return m.makeRotationY(Math.PI).setPosition(LX, 0, lane.z);
}

type Parts = Record<MatKey, THREE.BufferGeometry[]>;
const emptyParts = (): Parts => ({
  steel: [], glass: [], rubber: [], brush: [], plate: [], terrazzo: [], concrete: [], led: [], lamp: [],
});

function pathXs(x0: number, x1: number, step: number, knotDiv: number) {
  const xs: number[] = [];
  for (let x = x0; x < x1 - 1e-6; x += step) xs.push(x);
  xs.push(x1);
  for (const k of [FLAT, FLAT + RUN]) {
    for (let i = -knotDiv; i <= knotDiv; i++) {
      const x = k + (i / knotDiv) * TR;
      if (x > x0 && x < x1) xs.push(x);
    }
  }
  xs.sort((a, b) => a - b);
  return xs.filter((x, i) => i === 0 || x - xs[i - 1] > 0.05);
}

function geometry(pos: ArrayLike<number>, uv: ArrayLike<number>, index: number[], normals?: ArrayLike<number>) {
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(index);
  if (normals) g.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  else g.computeVertexNormals();
  return g;
}

/** A ribbon following the step line, between cross-section points (z, height above the line). */
function strip(xs: number[], a: [number, number], b: [number, number]) {
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  let s = 0;
  let px = xs[0];
  let py = profileY(px);
  xs.forEach((x, i) => {
    const y = profileY(x);
    s += Math.hypot(x - px, y - py);
    px = x;
    py = y;
    pos.push(x, y + a[1], a[0], x, y + b[1], b[0]);
    uv.push(s, 0, s, len);
    if (i > 0) {
      const a0 = 2 * (i - 1);
      index.push(a0, a0 + 1, a0 + 2, a0 + 1, a0 + 3, a0 + 2);
    }
  });
  return geometry(pos, uv, index);
}

function box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number) {
  const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
  g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return g;
}

/** Quad with explicit corners (counter-clockwise from the front) and uvs. */
function quad(p: number[][], uv: number[][]) {
  return geometry(p.flat(), uv.flat(), [0, 1, 2, 0, 2, 3]);
}

const HR_TOP = 0.985;
const HR_R = 0.33;

function handrailPath(xs: number[], arcSeg: number) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(-0.9, HR_TOP - 2 * HR_R)];
  for (let i = 0; i <= arcSeg; i++) {
    const a = 1.5 * Math.PI - (Math.PI * i) / arcSeg;
    pts.push(new THREE.Vector2(-1.2 + HR_R * Math.cos(a), HR_TOP - HR_R + HR_R * Math.sin(a)));
  }
  for (const x of xs) if (x > -1.2 + 1e-3 && x < LX + 1.2 - 1e-3) pts.push(new THREE.Vector2(x, profileY(x) + HR_TOP));
  for (let i = 0; i <= arcSeg; i++) {
    const a = 0.5 * Math.PI - (Math.PI * i) / arcSeg;
    pts.push(new THREE.Vector2(LX + 1.2 + HR_R * Math.cos(a), H + HR_TOP - HR_R + HR_R * Math.sin(a)));
  }
  pts.push(new THREE.Vector2(LX + 0.9, H + HR_TOP - 2 * HR_R));
  return pts;
}

const HR_NEAR: [number, number][] = [
  [-0.041, -0.016], [-0.045, 0], [-0.039, 0.016], [-0.023, 0.025], [0, 0.028],
  [0.023, 0.025], [0.039, 0.016], [0.045, 0], [0.041, -0.016], [0.028, -0.021], [-0.028, -0.021],
];
const HR_FAR: [number, number][] = [[-0.045, -0.018], [-0.04, 0.02], [0.04, 0.02], [0.045, -0.018]];

/** Closed section swept along a path in the x–y plane; u is the belt's own travel (dir · arc length). */
function sweep(pts: THREE.Vector2[], section: [number, number][], zc: number, uSign: number) {
  const m = section.length + 1;
  const pos: number[] = [];
  const uv: number[] = [];
  const index: number[] = [];
  let s = 0;
  pts.forEach((p, i) => {
    const prev = pts[Math.max(i - 1, 0)];
    const next = pts[Math.min(i + 1, pts.length - 1)];
    const t = new THREE.Vector2().subVectors(next, prev).normalize();
    if (i > 0) s += p.distanceTo(prev);
    for (let j = 0; j < m; j++) {
      const [cz, cn] = section[j % section.length];
      pos.push(p.x - t.y * cn, p.y + t.x * cn, zc + cz);
      uv.push(uSign * s, j / (m - 1));
    }
    if (i > 0) {
      const r0 = (i - 1) * m;
      const r1 = i * m;
      for (let j = 0; j < m - 1; j++) index.push(r0 + j, r1 + j, r0 + j + 1, r1 + j, r1 + j + 1, r0 + j + 1);
    }
  });
  return geometry(pos, uv, index);
}

function glassEnd(top: boolean, z: number) {
  const s = new THREE.Shape();
  if (!top) {
    s.moveTo(-1.2, 0.17);
    s.lineTo(-1.5, 0.17);
    s.lineTo(-1.5, 0.655);
    s.absarc(-1.2, 0.655, 0.3, Math.PI, Math.PI / 2, true);
    s.lineTo(-1.2, 0.17);
  } else {
    s.moveTo(LX + 1.2, H + 0.17);
    s.lineTo(LX + 1.5, H + 0.17);
    s.lineTo(LX + 1.5, H + 0.655);
    s.absarc(LX + 1.2, H + 0.655, 0.3, 0, Math.PI / 2, false);
    s.lineTo(LX + 1.2, H + 0.17);
  }
  const g = new THREE.ShapeGeometry(s, 8);
  g.translate(0, 0, z);
  return g;
}

/** One escalator in its own frame. */
function escalator(lane: Lane, lod: Lod): Parts {
  const p = emptyParts();
  const near = lod === "near";
  const full = pathXs(-1.55, LX + 1.55, near ? 0.75 : 2, near ? 4 : 2);
  const glass = pathXs(-1.2, LX + 1.2, near ? 0.75 : 2, near ? 4 : 2);
  const incline = pathXs(FLAT + 1, FLAT + RUN - 1, near ? 1 : 3, 1);

  for (const side of [-1, 1]) {
    const z = (v: number) => v * side;
    p.steel.push(
      strip(full, [z(0.505), -0.3], [z(0.505), 0.11]),
      strip(full, [z(0.505), 0.11], [z(0.575), 0.17]),
      strip(full, [z(0.575), 0.17], [z(0.6), 0.17]),
      strip(full, [z(0.6), 0.17], [z(0.68), 0.12]),
      strip(full, [z(0.68), 0.12], [z(0.68), -1.25]),
      box(-1.58, -1.55, 0, 0.17, z(0.5), z(0.69)),
      box(LX + 1.55, LX + 1.58, H, H + 0.17, z(0.5), z(0.69)),
    );
    p.glass.push(strip(glass, [z(0.58), 0.17], [z(0.58), 0.95]));
    if (near) {
      p.glass.push(glassEnd(false, z(0.58)), glassEnd(true, z(0.58)));
      p.brush.push(strip(full, [z(0.503), 0.072], [z(0.462), 0.068]));
      p.led.push(strip(full, [z(0.502), 0.094], [z(0.502), 0.106]));
    }
    p.rubber.push(sweep(handrailPath(full, near ? 10 : 4), near ? HR_NEAR : HR_FAR, z(0.58), lane.dir));
  }
  p.steel.push(strip(full, [-0.68, -1.25], [0.68, -1.25]));
  p.led.push(strip(incline, [-0.1, -1.256], [0.1, -1.256]));

  const w = 0.505;
  p.plate.push(
    quad(
      [[0, 0.008, w], [0, 0.008, -w], [-1.55, 0.008, -w], [-1.55, 0.008, w]],
      [[1, 0], [0, 0], [0, 1], [1, 1]],
    ),
    quad(
      [[LX, H + 0.008, -w], [LX, H + 0.008, w], [LX + 1.55, H + 0.008, w], [LX + 1.55, H + 0.008, -w]],
      [[0, 0], [1, 0], [1, 1], [0, 1]],
    ),
  );
  return p;
}

const LAMP_X = [-1.0, -2.3, LX + 1.0, LX + 2.3];

function landings(type: BankType, lod: Lod): Parts {
  const p = emptyParts();
  const W = type.halfWidth;
  for (const [x0, x1] of [[-ZONE, 0], [LX, LX + ZONE]]) {
    p.concrete.push(box(x0, x1, -SLAB, -0.02, -W, W));
    const floor = new THREE.PlaneGeometry(x1 - x0, 2 * W, lod === "near" ? 8 : 2, lod === "near" ? 14 : 3);
    floor.rotateX(-Math.PI / 2);
    floor.translate((x0 + x1) / 2, 0, 0);
    const uv = floor.getAttribute("uv") as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * (x1 - x0)) / 1.5, (uv.getY(i) * 2 * W) / 1.5);
    p.terrazzo.push(floor);
  }
  // Glass guards along the void edges of both landing zones.
  const guard = (a: [number, number], b: [number, number]) => {
    if (lod === "far") return;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    p.glass.push(quad([[a[0], 0.06, a[1]], [b[0], 0.06, b[1]], [b[0], 1.05, b[1]], [a[0], 1.05, a[1]]], [[0, 0], [len, 0], [len, 1], [0, 1]]));
    const nx = Math.min(a[0], b[0]) - 0.025;
    const xx = Math.max(a[0], b[0]) + 0.025;
    const nz = Math.min(a[1], b[1]) - 0.025;
    const xz = Math.max(a[1], b[1]) + 0.025;
    p.steel.push(box(nx, xx, 1.05, 1.1, nz, xz), box(nx, xx, 0, 0.06, nz, xz));
  };
  const e = 0.05;
  guard([-ZONE + e, -W + e], [-ZONE + e, W - e]);
  guard([-ZONE + e, -W + e], [-0.05, -W + e]);
  guard([-ZONE + e, W - e], [-0.05, W - e]);
  guard([LX + ZONE - e, -W + e], [LX + ZONE - e, W - e]);
  guard([LX + 0.05, -W + e], [LX + ZONE - e, -W + e]);
  guard([LX + 0.05, W - e], [LX + ZONE - e, W - e]);
  for (const fx of LAMP_X) p.lamp.push(box(fx - 0.06, fx + 0.06, -SLAB - 0.05, -SLAB, -W + 0.4, W - 0.4));
  return p;
}

/** Light sources of a bank in its own frame: linear lamps under every landing slab, repeated each storey. */
function lampPoints(type: BankType) {
  const pts: number[] = [];
  const W = type.halfWidth;
  for (const fx of LAMP_X) {
    for (let i = 0; i < 4; i++) {
      const fz = -W + 0.4 + ((2 * W - 0.8) * i) / 3;
      for (const level of [-1, 0, 1, 2]) pts.push(fx, level * H - SLAB - 0.05, fz);
    }
  }
  return pts;
}

const AMBIENT = 0.3;
const LAMP_POWER = 7.2;

/** Irradiance at a point from lamps of the same storey only (slabs and escalators above occlude the rest). */
export function lightAt(lamps: number[], x: number, y: number, z: number) {
  let sum = AMBIENT;
  for (let i = 0; i < lamps.length; i += 3) {
    const dy = lamps[i + 1] - y;
    if (dy <= 0.02 || dy > H - 0.6) continue;
    const dx = lamps[i] - x;
    const dz = lamps[i + 2] - z;
    const d2 = dx * dx + dy * dy + dz * dz + 0.6;
    sum += (LAMP_POWER * dy) / (d2 * Math.sqrt(d2));
  }
  return Math.min(sum, 1.55);
}

function bake(g: THREE.BufferGeometry, lamps: number[]) {
  const pos = g.getAttribute("position");
  const color = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const l = lightAt(lamps, pos.getX(i), pos.getY(i), pos.getZ(i));
    color[i * 3] = l;
    color[i * 3 + 1] = l * 0.985;
    color[i * 3 + 2] = l * 0.955;
  }
  g.setAttribute("color", new THREE.BufferAttribute(color, 3));
}

/** One storey of a bank — all lanes plus both landing slabs — merged per material, in bank frame. */
export function buildBank(type: BankType, lod: Lod) {
  const lamps = lampPoints(type);
  const all = emptyParts();
  for (const lane of type.lanes) {
    const m = laneMatrix(lane);
    const parts = escalator(lane, lod);
    for (const key of MAT_KEYS) for (const g of parts[key]) all[key].push(g.applyMatrix4(m));
  }
  const land = landings(type, lod);
  for (const key of MAT_KEYS) all[key].push(...land[key]);
  const out = new Map<MatKey, THREE.BufferGeometry>();
  for (const key of MAT_KEYS) {
    if (!all[key].length) continue;
    for (const g of all[key]) bake(g, lamps);
    const merged = mergeGeometries(all[key], false);
    for (const g of all[key]) g.dispose();
    if (merged) out.set(key, merged);
  }
  return out;
}

/** Light along a lane's step line, sampled for the step shader. */
export function stepLight() {
  const lamps = lampPoints(BANKS[0]);
  const out: number[] = [];
  for (let i = 0; i < LIGHT_SAMPLES; i++) {
    const x = LIGHT_X0 + ((LIGHT_X1 - LIGHT_X0) * i) / (LIGHT_SAMPLES - 1);
    out.push(lightAt(lamps, x, profileY(x) + 0.02, 0));
  }
  return out;
}

/** A single step: horizontal tread and the riser hanging from its downhill edge. */
export function stepGeometry() {
  const d = STEP / 2;
  const w = 0.5;
  const pos = [
    -d, 0, w, d, 0, w, d, 0, -w, -d, 0, -w,
    -d, -RISE, -w, -d, -RISE, w, -d, 0, w, -d, 0, -w,
  ];
  const normals = [0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0];
  const uv = [1, 0, 1, 1, 0, 1, 0, 0, 0, 0.12, 1, 0.12, 1, 0.88, 0, 0.88];
  return geometry(pos, uv, [0, 1, 2, 0, 2, 3, 4, 5, 6, 4, 6, 7], normals);
}
