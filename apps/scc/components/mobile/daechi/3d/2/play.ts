import * as THREE from "three";

// Lifted goldfish and cars: a finger takes one out of the street and holds it
// in the air; let go, it swims (or flies) through the street smashing signs
// one after another, each sign breaking into pieces of itself. A low-flying
// car knocks the fish and cars around it into the air and every sign it breaks
// sends a couple of fish below it up after it; a fish only knocks up cars.
//
// How hard the finger flings sets how much breaks (power, from the finger's
// speed in screen heights per second): a soft throw only breaks signs; harder,
// the wall behind the sign is breached; harder, that building comes down;
// harder, its neighbours fall after it; hardest, the whole street does.
// Breaches add up, so a building hit three or four times collapses anyway.

export type SignRecord = {
  c: THREE.Vector3;
  right: THREE.Vector3;
  normal: THREE.Vector3;
  w: number;
  h: number;
  rect: [number, number, number, number];
  windowFrac: number;
  bright: number;
  /** First vertex of the sign quad and of its halo quad (-1 without halo). */
  v: number;
  hv: number;
  /** Building the sign hangs on (-1 for none). */
  b: number;
  /** In the camera's view, so worth aiming at. */
  seen: boolean;
  broken: boolean;
  claimed: number;
};

export type BuildingRecord = {
  index: number;
  /** 0 left row, 1 right row, -1 apartment slab on the horizon. */
  side: number;
  /** Position in its row (-1 for slabs). */
  slot: number;
  /** Street-side face (x), its centre z; the depth behind the face. */
  pivotX: number;
  depth: number;
  cz: number;
  w: number;
  h: number;
  /** Direction toward the street along x. */
  out: number;
  tile: [number, number, number];
  signs: SignRecord[];
  collapsed: boolean;
  start: number;
  damage: number;
  holes: number;
};

/** Rows of the damage texture: one per building, DAMAGE_COLS texels each. */
export const DAMAGE_COLS = 8;
export const MAX_BUILDINGS = 96;

export type Ruin = {
  buildings: BuildingRecord[];
  /** Building indices of the left and right rows, in street order. */
  rows: [number[], number[]];
  /** Per building: 0 pivot (back base edge x, z, height, out), 1 state (start, seed, lean, damage), 2–5 holes (z, y, radius, seed). */
  damage: THREE.DataTexture;
  debris: THREE.InstancedMesh;
  dust: THREE.InstancedMesh;
};

export type Crowd = {
  x: Float32Array;
  z: Float32Array;
  speed: Float32Array;
  phase: Float32Array;
  sway: Float32Array;
  scale: Float32Array;
  hide: THREE.InstancedBufferAttribute;
  zMin: number;
  zLen: number;
  scales: Float32Array;
  patches: Float32Array;
  bags: Float32Array;
};

export type Traffic = {
  x: Float32Array;
  z: Float32Array;
  /** speed, lane phase, stop-go amplitude, kind — as the shader's aCar. */
  car: Float32Array;
  body: Float32Array;
  /** Non-uniform scale (x, y, z) and heading yaw. */
  size: Float32Array;
  yaw: Float32Array;
  hide: THREE.InstancedBufferAttribute;
  zMin: number;
  zLen: number;
};

const FISH = 0;
const CAR = 1;
type Kind = typeof FISH | typeof CAR;

type Flyer = {
  id: number;
  kind: Kind;
  slot: number;
  held: boolean;
  pointer: number;
  ndc: THREE.Vector2;
  holdDist: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  fwd: THREE.Vector3;
  size: THREE.Vector3;
  yaw: number;
  phase: number;
  cruise: number;
  target: SignRecord | null;
  cooldown: number;
  /** How much the next hit breaks (see the thresholds below). */
  power: number;
  /** Finger velocity while held, in screen heights per second. */
  swipe: THREE.Vector2;
  lastNdc: THREE.Vector2;
  lastMove: number;
};

type Shard = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  quat: THREE.Quaternion;
  axis: THREE.Vector3;
  spin: number;
  w: number;
  h: number;
  age: number;
  landed: number;
  bright: number;
  active: boolean;
};

type Chunk = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  quat: THREE.Quaternion;
  axis: THREE.Vector3;
  spin: number;
  size: THREE.Vector3;
  age: number;
  landed: number;
  active: boolean;
};

type Puff = {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  from: number;
  to: number;
  alpha: number;
  age: number;
  life: number;
  active: boolean;
};

type Fall = { b: number; at: number; spread: number; dir: number };

export const FISH_FLYERS = 160;
export const CAR_FLYERS = 40;
export const SHARDS = 1200;
export const DEBRIS = 700;
export const DUST = 40;

const X_MIN = -13.7;
const X_MAX = 20.7;
const Y_MAX = 48;
const Z_MIN = -235;
const Z_MAX = 22;
const FISH_CENTER = 0.95;
const CAR_CENTER = 0.8;
const GRAVITY = 9.8;
// Below this height a flyer sweeps the street and knocks things up.
const SWEEP_HEIGHT = 3.2;

// Power per screen height per second of finger speed; a car hits 1.4× harder.
const POWER_PER_SPEED = 1.5;
const CAR_WEIGHT = 1.4;
const BREACH = 0.6;
const COLLAPSE = 1.5;
const DOMINO = 2.6;
const RAZE = 3.6;
/** Seconds from the start of a collapse to the building lying in its rubble. */
const COLLAPSE_TIME = 2.8;
const CONCRETE: [number, number, number] = [0.46, 0.45, 0.43];

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const tmpD = new THREE.Vector3();
const tmpM = new THREE.Matrix4();
const tmpR = new THREE.Matrix4();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const UP = new THREE.Vector3(0, 1, 0);
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const NO_ROT = new THREE.Quaternion();
const tmpV = new THREE.Vector2();

export class Play {
  private flyers: Flyer[] = [];
  private free: [number[], number[]] = [[], []];
  private shards: Shard[] = [];
  private nextShard = 0;
  private shardTop = 0;
  private chunks: Chunk[] = [];
  private nextChunk = 0;
  private chunkTop = 0;
  private puffs: Puff[] = [];
  private nextPuff = 0;
  private puffTop = 0;
  private queue: Fall[] = [];
  private falling: number[] = [];
  private nextId = 1;
  private raycaster = new THREE.Raycaster();
  private fishPos: Float32Array;
  private carPos: Float32Array;
  /** Signs by 4 m slices of z, for the per-frame collision test. */
  private bins = new Map<number, SignRecord[]>();

  constructor(
    private camera: THREE.PerspectiveCamera,
    private crowd: Crowd,
    private traffic: Traffic,
    private signs: SignRecord[],
    private signBroken: THREE.BufferAttribute,
    private haloBroken: THREE.BufferAttribute,
    private meshes: [THREE.InstancedMesh, THREE.InstancedMesh],
    private shardMesh: THREE.InstancedMesh,
    private ruin: Ruin,
  ) {
    const caps = [FISH_FLYERS, CAR_FLYERS];
    caps.forEach((cap, kind) => {
      for (let i = cap - 1; i >= 0; i--) {
        this.free[kind].push(i);
        meshes[kind].setMatrixAt(i, ZERO);
      }
      meshes[kind].count = 0;
    });
    for (let i = 0; i < SHARDS; i++) {
      shardMesh.setMatrixAt(i, ZERO);
      this.shards.push({
        pos: new THREE.Vector3(), vel: new THREE.Vector3(), quat: new THREE.Quaternion(),
        axis: new THREE.Vector3(1, 0, 0), spin: 0, w: 0, h: 0, age: 0, landed: -1, bright: 1, active: false,
      });
    }
    shardMesh.count = 0;
    for (let i = 0; i < DEBRIS; i++) {
      ruin.debris.setMatrixAt(i, ZERO);
      this.chunks.push({
        pos: new THREE.Vector3(), vel: new THREE.Vector3(), quat: new THREE.Quaternion(), axis: new THREE.Vector3(1, 0, 0),
        spin: 0, size: new THREE.Vector3(), age: 0, landed: -1, active: false,
      });
    }
    ruin.debris.count = 0;
    for (let i = 0; i < DUST; i++) {
      ruin.dust.setMatrixAt(i, ZERO);
      this.puffs.push({ pos: new THREE.Vector3(), vel: new THREE.Vector3(), from: 0, to: 0, alpha: 0, age: 0, life: 1, active: false });
    }
    ruin.dust.count = 0;
    for (const s of signs) {
      const half = Math.abs(s.right.z) * s.w * 0.5 + Math.abs(s.normal.z) * 1.4 + 1.3;
      for (let b = Math.floor((s.c.z - half) / 4); b <= Math.floor((s.c.z + half) / 4); b++) {
        if (!this.bins.has(b)) this.bins.set(b, []);
        this.bins.get(b)!.push(s);
      }
    }
    this.fishPos = new Float32Array(crowd.x.length * 3);
    this.carPos = new Float32Array(traffic.x.length * 3);
  }

  get busy() {
    return this.flyers.length > 0 || this.queue.length > 0 || this.falling.length > 0
      || this.shards.some((s) => s.active) || this.chunks.some((c) => c.active) || this.puffs.some((p) => p.active);
  }

  // --- Where things are on the ground (mirrors the vertex shaders) ---------

  private fishAt(i: number, t: number, out: THREE.Vector3) {
    const c = this.crowd;
    const sp = c.speed[i];
    const moving = Math.abs(sp) > 0.01 ? 1 : 0;
    const raw = c.z[i] + sp * t - c.zMin;
    const z = c.zMin + raw - c.zLen * Math.floor(raw / c.zLen);
    const x = c.x[i] + Math.sin(t * 0.21 + c.phase[i] * 19) * c.sway[i] * moving;
    return out.set(x, FISH_CENTER * c.scale[i], z);
  }

  private carAt(i: number, t: number, out: THREE.Vector3) {
    const c = this.traffic;
    const speed = c.car[i * 4];
    const phase = c.car[i * 4 + 1];
    const amp = c.car[i * 4 + 2];
    const travel = speed * (t + (amp * Math.sin(t * 0.32 + phase)) / 0.32);
    const raw = c.z[i] + travel - c.zMin;
    const z = c.zMin + raw - c.zLen * Math.floor(raw / c.zLen);
    return out.set(c.x[i], CAR_CENTER * c.size[i * 3 + 1], z);
  }

  private snapshot(t: number) {
    const hideF = this.crowd.hide.array as Float32Array;
    for (let i = 0; i < hideF.length; i++) {
      if (hideF[i] > 0.5) continue;
      this.fishAt(i, t, tmpA).toArray(this.fishPos, i * 3);
    }
    const hideC = this.traffic.hide.array as Float32Array;
    for (let i = 0; i < hideC.length; i++) {
      if (hideC[i] > 0.5) continue;
      this.carAt(i, t, tmpA).toArray(this.carPos, i * 3);
    }
  }

  // --- Taking things into the air ---------------------------------------

  /** Picks the fish or car under the finger; false when there is none. */
  grab(pointer: number, ndc: THREE.Vector2, t: number, viewH: number, now: number): boolean {
    const cam = this.camera;
    const focal = viewH / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
    let best = -1;
    let bestKind: Kind = FISH;
    let bestScore = Infinity;
    let bestDist = 0;
    const consider = (kind: Kind, i: number, p: THREE.Vector3, size: number) => {
      const dist = p.distanceTo(cam.position);
      tmpB.copy(p).project(cam);
      if (tmpB.z > 1 || tmpB.z < -1) return;
      const dx = (tmpB.x - ndc.x) * cam.aspect * viewH * 0.5;
      const dy = (tmpB.y - ndc.y) * viewH * 0.5;
      const radius = Math.max(22, (size / dist) * focal * 0.6);
      const d = Math.hypot(dx, dy);
      if (d > radius) return;
      const score = d / radius + dist * 0.004;
      if (score < bestScore) {
        bestScore = score;
        best = i;
        bestKind = kind;
        bestDist = dist;
      }
    };
    const hideF = this.crowd.hide.array as Float32Array;
    for (let i = 0; i < hideF.length; i++) {
      if (hideF[i] < 0.5) consider(FISH, i, this.fishAt(i, t, tmpA), 1.5 * this.crowd.scale[i]);
    }
    const hideC = this.traffic.hide.array as Float32Array;
    for (let i = 0; i < hideC.length; i++) {
      if (hideC[i] < 0.5) consider(CAR, i, this.carAt(i, t, tmpA), 3.2);
    }
    if (best < 0) return false;
    if (!this.free[bestKind].length) this.dropOldest(bestKind);
    const f = this.launch(bestKind, best, t, null);
    if (!f) return false;
    f.held = true;
    f.pointer = pointer;
    f.ndc.copy(ndc);
    f.lastNdc.copy(ndc);
    f.lastMove = now;
    // A little nearer the camera along the same ray: it rises to the finger.
    f.holdDist = bestDist * 0.86;
    return true;
  }

  /** Moves a fish or car from the street into a flyer slot. */
  private launch(kind: Kind, i: number, t: number, vel: THREE.Vector3 | null): Flyer | null {
    const slot = this.free[kind].pop();
    if (slot === undefined) return null;
    const mesh = this.meshes[kind];
    const geo = mesh.geometry;
    const put = (name: string, src: Float32Array, size: number) => {
      const attr = geo.getAttribute(name) as THREE.InstancedBufferAttribute;
      (attr.array as Float32Array).set(src.subarray(i * size, i * size + size), slot * size);
      attr.needsUpdate = true;
    };
    const pos = new THREE.Vector3();
    const size = new THREE.Vector3();
    let yaw = 0;
    let phase = 0;
    if (kind === FISH) {
      const c = this.crowd;
      (c.hide.array as Float32Array)[i] = 1;
      c.hide.needsUpdate = true;
      put("aScale", c.scales, 3);
      put("aPatch", c.patches, 3);
      put("aBag", c.bags, 3);
      const walk = geo.getAttribute("aWalk") as THREE.InstancedBufferAttribute;
      (walk.array as Float32Array).set([0, c.phase[i], 0, 0], slot * 4);
      walk.needsUpdate = true;
      this.fishAt(i, t, pos);
      size.setScalar(c.scale[i]);
      phase = c.phase[i] * 10;
    } else {
      const c = this.traffic;
      (c.hide.array as Float32Array)[i] = 1;
      c.hide.needsUpdate = true;
      put("aBody", c.body, 3);
      const car = geo.getAttribute("aCar") as THREE.InstancedBufferAttribute;
      // Keep the kind (van hazards); speed 0 so the lights do not brake.
      (car.array as Float32Array).set([0, c.car[i * 4 + 1], 0, c.car[i * 4 + 3]], slot * 4);
      car.needsUpdate = true;
      this.carAt(i, t, pos);
      size.fromArray(c.size, i * 3);
      yaw = c.yaw[i];
      phase = c.car[i * 4 + 1] * 10;
    }
    const f: Flyer = {
      id: this.nextId++,
      kind,
      slot,
      held: false,
      pointer: -1,
      ndc: new THREE.Vector2(),
      holdDist: 0,
      pos,
      vel: vel ? vel.clone() : new THREE.Vector3(),
      fwd: new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw)),
      size,
      yaw,
      phase,
      cruise: kind === FISH ? 8 + Math.random() * 5 : 12 + Math.random() * 5,
      target: null,
      cooldown: vel ? 0.5 : 0,
      power: 0,
      swipe: new THREE.Vector2(),
      lastNdc: new THREE.Vector2(),
      lastMove: 0,
    };
    this.flyers.push(f);
    return f;
  }

  move(pointer: number, ndc: THREE.Vector2, now: number) {
    for (const f of this.flyers) {
      if (!f.held || f.pointer !== pointer) continue;
      f.ndc.copy(ndc);
      const dt = (now - f.lastMove) / 1000;
      if (dt < 0.004) continue;
      // NDC spans two units over the screen height.
      tmpV.set(((ndc.x - f.lastNdc.x) * this.camera.aspect) / 2 / dt, (ndc.y - f.lastNdc.y) / 2 / dt);
      f.swipe.lerp(tmpV, dt > 0.05 ? 1 : 0.6);
      f.lastNdc.copy(ndc);
      f.lastMove = now;
    }
  }

  release(pointer: number, now: number) {
    for (const f of this.flyers) {
      if (!f.held || f.pointer !== pointer) continue;
      f.held = false;
      f.pointer = -1;
      // A finger that stopped before letting go throws softly.
      const speed = now - f.lastMove < 90 ? f.swipe.length() : 0;
      f.power = speed * POWER_PER_SPEED * (f.kind === CAR ? CAR_WEIGHT : 1);
      f.vel.clampLength(0, 22);
      if (f.vel.length() < 4) f.vel.add(tmpA.set(Math.random() - 0.5, 3.5, -3));
      f.fwd.copy(f.vel).normalize();
    }
  }

  private dropOldest(kind: Kind) {
    const idx = this.flyers.findIndex((f) => !f.held && f.kind === kind);
    if (idx < 0) return;
    const [f] = this.flyers.splice(idx, 1);
    if (f.target) f.target.claimed = 0;
    this.meshes[kind].setMatrixAt(f.slot, ZERO);
    this.meshes[kind].instanceMatrix.needsUpdate = true;
    this.free[kind].push(f.slot);
  }

  // --- Signs --------------------------------------------------------------

  /** Marks the signs inside the view; call when the camera or aspect changes. */
  view() {
    this.camera.updateMatrixWorld();
    for (const s of this.signs) {
      tmpA.copy(s.c).project(this.camera);
      s.seen = tmpA.z < 1 && Math.abs(tmpA.x) < 0.92 && tmpA.y > -0.92 && tmpA.y < 0.92;
    }
  }

  private chooseTarget(f: Flyer) {
    let best: SignRecord | null = null;
    let bestScore = Infinity;
    // Aim only at what can be seen breaking; anything on the way still breaks.
    const anySeen = this.signs.some((s) => s.seen && !s.broken);
    for (const s of this.signs) {
      if (s.broken || (s.claimed && s.claimed !== f.id) || s.c.z < Z_MIN || (anySeen && !s.seen)) continue;
      const d = s.c.distanceTo(f.pos);
      const score = d * (0.75 + Math.random() * 0.6);
      if (score < bestScore) {
        bestScore = score;
        best = s;
      }
    }
    if (f.target && f.target !== best) f.target.claimed = 0;
    f.target = best;
    if (best) best.claimed = f.id;
  }

  /** Breaks a sign into falling pieces; returns which side of it the hit came from. */
  private smash(s: SignRecord, from: THREE.Vector3, vel: THREE.Vector3, t: number, lift: boolean) {
    s.broken = true;
    s.claimed = 0;
    for (let k = 0; k < 4; k++) {
      this.signBroken.setX(s.v + k, 1);
      if (s.hv >= 0) this.haloBroken.setX(s.hv + k, 1);
    }
    this.signBroken.needsUpdate = true;
    this.haloBroken.needsUpdate = true;

    // Shatter into a grid of pieces carrying their part of the face.
    const cols = THREE.MathUtils.clamp(Math.round(s.w / 0.5), 2, 7);
    const rows = THREE.MathUtils.clamp(Math.round(s.h / 0.5), 1, 7);
    const side = Math.sign(tmpA.copy(from).sub(s.c).dot(s.normal)) || 1;
    const q = new THREE.Quaternion().setFromRotationMatrix(tmpR.makeBasis(s.right, UP, s.normal));
    const attrRect = this.shardMesh.geometry.getAttribute("aRect") as THREE.InstancedBufferAttribute;
    const [rx, ry, rw, rh] = s.rect;
    const uw = rw * Math.min(1, s.windowFrac);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const slot = this.nextShard;
        this.nextShard = (this.nextShard + 1) % SHARDS;
        this.shardTop = Math.max(this.shardTop, slot + 1);
        const sh = this.shards[slot];
        const a = ((i + 0.5) / cols - 0.5) * s.w;
        const b = ((j + 0.5) / rows - 0.5) * s.h;
        sh.pos.copy(s.c).addScaledVector(s.right, a).addScaledVector(UP, b);
        sh.vel.copy(s.normal).multiplyScalar(side * (1.5 + Math.random() * 3.5))
          .addScaledVector(s.right, a * (1.2 + Math.random()))
          .addScaledVector(UP, b * 1.2 + Math.random() * 2)
          .addScaledVector(vel, 0.25);
        sh.quat.copy(q);
        sh.axis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
        sh.spin = 3 + Math.random() * 9;
        sh.w = (s.w / cols) * 0.94;
        sh.h = (s.h / rows) * 0.94;
        sh.age = 0;
        sh.landed = -1;
        sh.bright = s.bright;
        sh.active = true;
        attrRect.setXYZW(slot, rx + (i / cols) * uw, ry + (j / rows) * rh, uw / cols, rh / rows);
      }
    }
    attrRect.needsUpdate = true;

    // After a car, two fish on the ground below take off after it; a fish
    // never sets other fish flying.
    if (lift) {
      let launched = 0;
      const hideF = this.crowd.hide.array as Float32Array;
      for (let i = 0; i < hideF.length && launched < 2; i++) {
        if (hideF[i] > 0.5) continue;
        const dx = this.fishPos[i * 3] - s.c.x;
        const dz = this.fishPos[i * 3 + 2] - s.c.z;
        if (dx * dx + dz * dz > 36) continue;
        if (this.launch(FISH, i, t, tmpD.set(dx * 0.4, 7 + Math.random() * 3, dz * 0.4))) launched++;
      }
    }
    return side;
  }

  /** A flyer hits a sign: the sign breaks, and with power the building behind it. */
  private hit(s: SignRecord, f: Flyer, t: number) {
    const side = this.smash(s, f.pos, f.vel, t, f.kind === CAR);
    const b = s.b >= 0 ? this.ruin.buildings[s.b] : null;
    const p = f.power;
    if (b && !b.collapsed && p >= BREACH) {
      if (p >= RAZE) this.raze(b, t);
      else if (p >= COLLAPSE) this.collapse(b, t, p >= DOMINO ? 1 + Math.floor((p - DOMINO) * 4) : 0, 0);
      else this.breach(b, s, p, f, t);
    }
    // Each hit spends most of the throw.
    f.power *= 0.45;
    // Bounce off and look for the next one.
    f.vel.multiplyScalar(0.45).addScaledVector(s.normal, side * 4);
    f.cooldown = 0.28;
    f.target = null;
  }

  // --- Buildings ------------------------------------------------------------

  private texel(b: number, col: number, x: number, y: number, z: number, w: number) {
    const d = this.ruin.damage.image.data as Float32Array;
    d.set([x, y, z, w], (b * DAMAGE_COLS + col) * 4);
    this.ruin.damage.needsUpdate = true;
  }

  private writeState(b: BuildingRecord, seed = Math.random(), lean = 0) {
    const d = this.ruin.damage.image.data as Float32Array;
    const i = (b.index * DAMAGE_COLS + 1) * 4;
    this.texel(b.index, 1, b.collapsed ? b.start : 0, b.collapsed ? seed : d[i + 1], b.collapsed ? lean : d[i + 2], Math.min(1, b.damage));
  }

  /** Punches a hole through the wall behind the sign. */
  private breach(b: BuildingRecord, s: SignRecord, p: number, f: Flyer, t: number) {
    const r = Math.min(f.kind === CAR ? 4.5 : 3.5, (1.7 + (p - BREACH) * 1.8) * (f.kind === CAR ? 1.35 : 1));
    b.damage += 0.28 + (p - BREACH) * 0.3 * (f.kind === CAR ? 1.4 : 1);
    if (b.damage >= 1) {
      this.collapse(b, t, 0, 0);
      return;
    }
    const z = THREE.MathUtils.clamp(s.c.z, b.cz - b.w / 2 + r * 0.6, b.cz + b.w / 2 - r * 0.6);
    const y = Math.max(s.c.y, 4.6);
    if (b.slot >= 0) {
      this.texel(b.index, 2 + (b.holes % 4), z, y, r, Math.random() * 10);
      b.holes++;
    }
    this.writeState(b);
    // Signs over the hole go with it.
    for (const o of b.signs) {
      if (o.broken) continue;
      if (Math.abs(o.c.z - z) < r + Math.abs(o.right.z) * o.w * 0.5 && Math.abs(o.c.y - y) < r + o.h * 0.5) {
        this.smash(o, tmpC.set(b.pivotX + b.out * 3, y, z), f.vel, t, false);
      }
    }
    // Masonry blows out of the hole, a puff of dust after it.
    const at = tmpC.set(b.pivotX + b.out * 0.4, y, z);
    const n = Math.round(12 + 16 * Math.min(1, p - BREACH) * (f.kind === CAR ? 1.4 : 1));
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2;
      const rr = Math.sqrt(Math.random()) * r * 0.8;
      this.chunk(
        tmpA.set(at.x, at.y + Math.sin(a) * rr, at.z + Math.cos(a) * rr),
        tmpB.set(b.out * (2.5 + Math.random() * 6), Math.random() * 4 - 0.5, (Math.random() - 0.5) * 4).addScaledVector(f.vel, 0.12),
        0.14 + Math.random() * 0.45 * Math.min(1, r / 1.5),
        Math.random() < 0.65 ? b.tile : CONCRETE,
      );
    }
    this.puff(at, tmpB.set(b.out * 1.2, 0.5, 0), r * 1.2, r * 3.4, 0.5, 3);
  }

  private collapse(b: BuildingRecord, t: number, spread: number, dir: number) {
    if (b.collapsed) return;
    b.collapsed = true;
    b.start = t;
    b.damage = 1;
    this.writeState(b, Math.random() * 10, 0.05 + Math.random() * 0.09);
    for (const s of b.signs) {
      if (s.broken) continue;
      // The sign rides the building down; nothing aims at it any more.
      s.broken = true;
      s.claimed = 0;
    }
    this.falling.push(b.index);
    // Dust rolls out along the base.
    const steps = Math.max(2, Math.round(b.w / 5));
    for (let k = 0; k < steps; k++) {
      const z = b.cz + ((k + 0.5) / steps - 0.5) * b.w;
      const x = b.slot >= 0 ? b.pivotX + b.out * 1.2 : b.pivotX;
      this.puff(tmpA.set(x, 2.2, z), tmpB.set(b.out * 2.2, 0.8, (Math.random() - 0.5)), 4, Math.min(13, b.w * 0.6 + 6), 0.62, 5.5);
    }
    // Facing tiles and window frames peel off the front as it goes.
    if (b.slot >= 0) {
      for (let k = 0; k < 28; k++) {
        this.chunk(
          tmpA.set(b.pivotX + b.out * 0.3, 4 + Math.random() * (b.h - 4), b.cz + (Math.random() - 0.5) * b.w),
          tmpB.set(b.out * (1 + Math.random() * 3), Math.random() * 2, (Math.random() - 0.5) * 2),
          0.2 + Math.random() * 0.6, Math.random() < 0.7 ? b.tile : CONCRETE,
        );
      }
    }
    if (spread > 0 && b.slot >= 0) {
      const row = this.ruin.rows[b.side];
      for (const d of dir ? [dir] : [-1, 1]) {
        const nb = row[b.slot + d];
        if (nb !== undefined) this.queue.push({ b: nb, at: t + 0.28 + Math.random() * 0.22, spread: spread - 1, dir: d });
      }
    }
  }

  /** The whole street: this row, then the row across, then the slabs behind. */
  private raze(b: BuildingRecord, t: number) {
    this.collapse(b, t, Infinity, 0);
    if (b.slot < 0) return;
    const other = this.ruin.rows[1 - b.side];
    let near = -1;
    let best = Infinity;
    for (const i of other) {
      const d = Math.abs(this.ruin.buildings[i].cz - b.cz);
      if (d < best) { best = d; near = i; }
    }
    if (near >= 0) this.queue.push({ b: near, at: t + 1.1, spread: Infinity, dir: 0 });
    for (const o of this.ruin.buildings) {
      if (o.slot < 0) this.queue.push({ b: o.index, at: t + 3 + Math.random() * 4, spread: 0, dir: 0 });
    }
  }

  // --- Debris and dust ------------------------------------------------------

  private chunk(pos: THREE.Vector3, vel: THREE.Vector3, size: number, color: [number, number, number]) {
    const slot = this.nextChunk;
    this.nextChunk = (slot + 1) % DEBRIS;
    this.chunkTop = Math.max(this.chunkTop, slot + 1);
    const c = this.chunks[slot];
    c.pos.copy(pos);
    c.vel.copy(vel);
    c.quat.setFromEuler(tmpE.set(Math.random() * 6, Math.random() * 6, Math.random() * 6));
    c.axis.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
    c.spin = 2 + Math.random() * 8;
    c.size.set(size * (0.6 + Math.random() * 0.8), size * (0.4 + Math.random() * 0.5), size * (0.6 + Math.random() * 0.8));
    c.age = 0;
    c.landed = -1;
    c.active = true;
    const col = this.ruin.debris.geometry.getAttribute("aColor") as THREE.InstancedBufferAttribute;
    const k = 0.75 + Math.random() * 0.35;
    col.setXYZ(slot, color[0] * k, color[1] * k, color[2] * k);
    col.needsUpdate = true;
  }

  private puff(pos: THREE.Vector3, vel: THREE.Vector3, from: number, to: number, alpha: number, life: number) {
    const slot = this.nextPuff;
    this.nextPuff = (slot + 1) % DUST;
    this.puffTop = Math.max(this.puffTop, slot + 1);
    const p = this.puffs[slot];
    p.pos.copy(pos);
    p.vel.copy(vel);
    p.from = from;
    p.to = to;
    p.alpha = alpha;
    p.age = 0;
    p.life = life;
    p.active = true;
  }

  // --- Frame --------------------------------------------------------------

  update(dt: number, t: number) {
    if (this.flyers.length) this.snapshot(t);
    const cam = this.camera;
    // Flyers launched during this frame start moving next frame.
    const flying = this.flyers.slice();
    for (const f of flying) {
      if (f.held) {
        this.raycaster.setFromCamera(f.ndc, cam);
        tmpA.copy(this.raycaster.ray.origin).addScaledVector(this.raycaster.ray.direction, f.holdDist);
        tmpB.copy(f.pos);
        f.pos.lerp(tmpA, 1 - Math.exp(-dt * 16));
        tmpB.subVectors(f.pos, tmpB).divideScalar(Math.max(dt, 1e-3));
        f.vel.lerp(tmpB, 0.5);
        this.place(f, t);
        continue;
      }
      f.cooldown -= dt;
      if (f.cooldown <= 0 && (!f.target || f.target.broken)) this.chooseTarget(f);
      if (f.cooldown <= 0 && f.target) {
        tmpA.copy(f.target.c).addScaledVector(f.target.normal, 0.2).sub(f.pos).normalize().multiplyScalar(f.cruise);
        f.vel.lerp(tmpA, 1 - Math.exp(-dt * 2.6));
      } else if (f.cooldown > 0) {
        f.vel.y -= GRAVITY * 0.35 * dt; // a short arc on take-off and after a hit
      }
      // A swimming wobble across the heading.
      tmpB.crossVectors(f.vel, UP);
      if (tmpB.lengthSq() > 1e-4) f.vel.addScaledVector(tmpB.normalize(), Math.sin(t * 3 + f.phase) * 2.2 * dt * 2.6);
      f.pos.addScaledVector(f.vel, dt);

      const yMin = f.kind === CAR ? 1.0 : 0.9;
      const xMin = Math.min(X_MIN, f.target ? f.target.c.x - 0.3 : X_MIN);
      const xMax = Math.max(X_MAX, f.target ? f.target.c.x + 0.3 : X_MAX);
      if (f.pos.x < xMin) { f.pos.x = xMin; f.vel.x = Math.abs(f.vel.x); }
      if (f.pos.x > xMax) { f.pos.x = xMax; f.vel.x = -Math.abs(f.vel.x); }
      if (f.pos.y < yMin) { f.pos.y = yMin; f.vel.y = Math.abs(f.vel.y); }
      if (f.pos.y > Y_MAX) { f.pos.y = Y_MAX; f.vel.y = -Math.abs(f.vel.y); }
      if (f.pos.z < Z_MIN) { f.pos.z = Z_MIN; f.vel.z = Math.abs(f.vel.z); }
      if (f.pos.z > Z_MAX) { f.pos.z = Z_MAX; f.vel.z = -Math.abs(f.vel.z); }

      // Anything in the way breaks too; a car is a bigger hammer.
      const reachN = f.kind === CAR ? 1.3 : 0.6;
      const reachS = f.kind === CAR ? 1.2 : 0.35;
      for (const s of this.bins.get(Math.floor(f.pos.z / 4)) ?? []) {
        if (s.broken) continue;
        tmpA.subVectors(f.pos, s.c);
        if (Math.abs(tmpA.dot(s.normal)) > reachN) continue;
        if (Math.abs(tmpA.dot(s.right)) > s.w / 2 + reachS || Math.abs(tmpA.y) > s.h / 2 + reachS) continue;
        this.hit(s, f, t);
        break;
      }

      // Sweeping low: knock up whatever is walking or driving there.
      if (f.pos.y < SWEEP_HEIGHT && f.cooldown <= 0) this.sweep(f, t);
      this.place(f, t);
    }
    // Only the slots in use are drawn.
    const top = [0, 0];
    for (const f of this.flyers) top[f.kind] = Math.max(top[f.kind], f.slot + 1);
    this.meshes.forEach((m, k) => {
      m.count = top[k];
      m.instanceMatrix.needsUpdate = true;
    });
    this.updateRuin(dt, t);
    this.updateShards(dt);
    this.updateDebris(dt);
    this.updateDust(dt);
  }

  private sweep(f: Flyer, t: number) {
    const r = f.kind === CAR ? 2.6 : 1.6;
    const hideF = this.crowd.hide.array as Float32Array;
    // Only cars knock fish up; a fish never launches other fish.
    for (let i = 0; f.kind === CAR && i < hideF.length; i++) {
      if (hideF[i] > 0.5) continue;
      const dx = this.fishPos[i * 3] - f.pos.x;
      const dz = this.fishPos[i * 3 + 2] - f.pos.z;
      if (dx * dx + dz * dz > r * r) continue;
      this.launch(FISH, i, t, tmpD.set(dx * 2 + f.vel.x * 0.3, 6 + Math.random() * 3, dz * 2 + f.vel.z * 0.3));
    }
    const hideC = this.traffic.hide.array as Float32Array;
    for (let i = 0; i < hideC.length; i++) {
      if (hideC[i] > 0.5) continue;
      const dx = this.carPos[i * 3] - f.pos.x;
      const dz = this.carPos[i * 3 + 2] - f.pos.z;
      if (dx * dx + dz * dz > (r + 1.4) * (r + 1.4)) continue;
      this.launch(CAR, i, t, tmpD.set(dx + f.vel.x * 0.3, 8 + Math.random() * 3, dz + f.vel.z * 0.3));
    }
  }

  /** Scheduled collapses, and the base of each falling building crumbling out. */
  private updateRuin(dt: number, t: number) {
    if (this.queue.length) {
      const due = this.queue.filter((q) => q.at <= t);
      this.queue = this.queue.filter((q) => q.at > t);
      for (const q of due) this.collapse(this.ruin.buildings[q.b], q.at, q.spread, q.dir);
    }
    if (!this.falling.length) return;
    this.falling = this.falling.filter((i) => t - this.ruin.buildings[i].start < COLLAPSE_TIME + 0.4);
    // Many buildings at once share the budget.
    const rate = 22 / Math.max(1, this.falling.length * 0.5);
    for (const i of this.falling) {
      const b = this.ruin.buildings[i];
      const age = t - b.start;
      if (b.slot < 0 || age < 0.3 || age > COLLAPSE_TIME) continue;
      const n = Math.floor(dt * rate + Math.random());
      for (let k = 0; k < n; k++) {
        this.chunk(
          tmpA.set(b.pivotX + b.out * 0.5, 0.5 + Math.random() * 3, b.cz + (Math.random() - 0.5) * b.w),
          tmpB.set(b.out * (2 + Math.random() * 5), 2 + Math.random() * 4, (Math.random() - 0.5) * 3),
          0.25 + Math.random() * 0.7, Math.random() < 0.55 ? b.tile : CONCRETE,
        );
      }
    }
  }

  private updateShards(dt: number) {
    let any = false;
    const bright = this.shardMesh.geometry.getAttribute("aBright") as THREE.InstancedBufferAttribute;
    for (let i = 0; i < this.shardTop; i++) {
      const s = this.shards[i];
      if (!s.active) continue;
      any = true;
      s.age += dt;
      if (s.landed < 0) {
        s.vel.y -= GRAVITY * dt;
        s.vel.multiplyScalar(1 - dt * 0.4);
        s.pos.addScaledVector(s.vel, dt);
        s.quat.multiply(tmpQ.setFromAxisAngle(s.axis, s.spin * dt));
        if (s.pos.y < 0.03) {
          s.pos.y = 0.03;
          s.landed = s.age;
          s.quat.setFromEuler(tmpE.set(-Math.PI / 2, 0, Math.random() * Math.PI * 2));
        }
      }
      let k = 1;
      if (s.landed >= 0 && s.age - s.landed > 8) k = Math.max(0, 1 - (s.age - s.landed - 8));
      if (k <= 0) {
        s.active = false;
        this.shardMesh.setMatrixAt(i, ZERO);
        continue;
      }
      bright.setX(i, s.bright * Math.max(0.22, 1.6 - s.age * 0.9));
      tmpM.compose(s.pos, s.quat, tmpB.set(s.w * k, s.h * k, 1));
      this.shardMesh.setMatrixAt(i, tmpM);
    }
    if (!any && this.shardTop) this.shardTop = 0;
    this.shardMesh.count = this.shardTop;
    if (any) {
      this.shardMesh.instanceMatrix.needsUpdate = true;
      bright.needsUpdate = true;
    }
  }

  private updateDebris(dt: number) {
    const mesh = this.ruin.debris;
    let any = false;
    for (let i = 0; i < this.chunkTop; i++) {
      const c = this.chunks[i];
      if (!c.active) continue;
      any = true;
      c.age += dt;
      if (c.landed < 0) {
        c.vel.y -= GRAVITY * dt;
        c.pos.addScaledVector(c.vel, dt);
        c.quat.multiply(tmpQ.setFromAxisAngle(c.axis, c.spin * dt));
        const floor = c.size.y * 0.5;
        if (c.pos.y < floor) {
          // One skid along the ground, then it lies there.
          c.pos.y = floor;
          if (c.vel.y < -3 && c.landed === -1) {
            c.vel.set(c.vel.x * 0.35, -c.vel.y * 0.22, c.vel.z * 0.35);
            c.landed = -2;
          } else {
            c.landed = c.age;
            c.quat.setFromEuler(tmpE.set(0, Math.random() * 6, 0));
          }
        }
      }
      let k = 1;
      if (c.landed >= 0 && c.age - c.landed > 9) k = Math.max(0, 1 - (c.age - c.landed - 9) * 0.5);
      if (k <= 0) {
        c.active = false;
        mesh.setMatrixAt(i, ZERO);
        continue;
      }
      tmpM.compose(c.pos, c.quat, tmpB.copy(c.size).multiplyScalar(k));
      mesh.setMatrixAt(i, tmpM);
    }
    if (!any && this.chunkTop) this.chunkTop = 0;
    mesh.count = this.chunkTop;
    if (any) mesh.instanceMatrix.needsUpdate = true;
  }

  private updateDust(dt: number) {
    const mesh = this.ruin.dust;
    const alpha = mesh.geometry.getAttribute("aAlpha") as THREE.InstancedBufferAttribute;
    let any = false;
    for (let i = 0; i < this.puffTop; i++) {
      const p = this.puffs[i];
      if (!p.active) continue;
      any = true;
      p.age += dt;
      const u = p.age / p.life;
      if (u >= 1) {
        p.active = false;
        mesh.setMatrixAt(i, ZERO);
        alpha.setX(i, 0);
        continue;
      }
      p.vel.multiplyScalar(1 - dt * 0.6);
      p.pos.addScaledVector(p.vel, dt);
      const size = p.from + (p.to - p.from) * (1 - (1 - u) * (1 - u));
      tmpM.compose(p.pos, NO_ROT, tmpB.setScalar(size));
      mesh.setMatrixAt(i, tmpM);
      alpha.setX(i, p.alpha * Math.min(1, p.age * 4) * (1 - u) * (1 - u));
    }
    if (!any && this.puffTop) this.puffTop = 0;
    mesh.count = this.puffTop;
    if (any) {
      mesh.instanceMatrix.needsUpdate = true;
      alpha.needsUpdate = true;
    }
  }

  /** Held: upright (fish) or tumbling (car); flying: nose first, back to the sky. */
  private place(f: Flyer, t: number) {
    const size = f.size;
    const center = f.kind === FISH ? FISH_CENTER : CAR_CENTER;
    const mesh = this.meshes[f.kind];
    if (f.held) {
      if (f.kind === FISH) {
        tmpA.subVectors(this.camera.position, f.pos);
        tmpE.set(0, Math.atan2(-tmpA.x, -tmpA.z), Math.sin(t * 7 + f.phase) * 0.25);
      } else {
        tmpE.set(Math.sin(t * 2.3 + f.phase) * 0.35, f.yaw + t * 0.6, Math.sin(t * 3.1 + f.phase) * 0.3);
      }
      tmpM.makeRotationFromEuler(tmpE);
      tmpA.set(0, center * size.y, 0).applyMatrix4(tmpR.extractRotation(tmpM));
      tmpM.scale(size);
      tmpM.setPosition(f.pos.x - tmpA.x, f.pos.y - tmpA.y, f.pos.z - tmpA.z);
      mesh.setMatrixAt(f.slot, tmpM);
      return;
    }
    if (f.vel.lengthSq() > 1e-3) f.fwd.lerp(tmpA.copy(f.vel).normalize(), 0.3).normalize();
    const F = f.fwd;
    // "Up" for the model: the fish's back (+z), the car's roof (+y).
    const U = tmpB.copy(UP).addScaledVector(F, -F.y);
    if (U.lengthSq() < 1e-4) U.set(0, 0, 1);
    U.normalize().applyAxisAngle(F, Math.sin(t * 3 + f.phase) * (f.kind === FISH ? 0.3 : 0.15));
    let up: THREE.Vector3;
    if (f.kind === FISH) {
      // Local y → forward, local z → up, local x = y × z.
      const X = tmpC.crossVectors(F, U).normalize();
      tmpM.makeBasis(X.multiplyScalar(size.x), tmpD.copy(F).multiplyScalar(size.y), U.multiplyScalar(size.z));
      up = F;
    } else {
      // Local -z → forward, local y → up, local x = y × z.
      const Z = tmpD.copy(F).negate();
      const X = tmpC.crossVectors(U, Z).normalize();
      tmpM.makeBasis(X.multiplyScalar(size.x), tmpA.copy(U).multiplyScalar(size.y), Z.multiplyScalar(size.z));
      up = tmpB.normalize();
    }
    tmpM.setPosition(
      f.pos.x - up.x * center * size.y,
      f.pos.y - up.y * center * size.y,
      f.pos.z - up.z * center * size.y,
    );
    mesh.setMatrixAt(f.slot, tmpM);
  }
}
