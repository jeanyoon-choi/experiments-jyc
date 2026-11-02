import * as THREE from "three";

// Lifted goldfish: a tap takes one fish out of the walking crowd and holds it
// in the air under the finger; on release it swims through the street and
// smashes signs one after another, each sign breaking into pieces of itself.

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
  broken: boolean;
  claimed: number;
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
  /** Per-fish appearance, copied into a flyer slot. */
  scales: Float32Array;
  patches: Float32Array;
  bags: Float32Array;
};

type Flyer = {
  id: number;
  slot: number;
  held: boolean;
  pointer: number;
  ndc: THREE.Vector2;
  holdDist: number;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  fwd: THREE.Vector3;
  scale: number;
  phase: number;
  cruise: number;
  target: SignRecord | null;
  cooldown: number;
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

export const FLYERS = 64;
export const SHARDS = 700;

// Space the fish may swim in: between the facades, above the ground.
const X_MIN = -13.7;
const X_MAX = 20.7;
const Y_MIN = 0.9;
const Y_MAX = 48;
const Z_MIN = -235;
const Z_MAX = 22;
const FISH_CENTER = 0.95;
const GRAVITY = 9.8;

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpM = new THREE.Matrix4();
const UP = new THREE.Vector3(0, 1, 0);
const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);

export class Play {
  private flyers: Flyer[] = [];
  private freeSlots: number[] = [];
  private shards: Shard[] = [];
  private nextShard = 0;
  private nextId = 1;
  private raycaster = new THREE.Raycaster();

  constructor(
    private camera: THREE.PerspectiveCamera,
    private crowd: Crowd,
    private signs: SignRecord[],
    private signBroken: THREE.BufferAttribute,
    private haloBroken: THREE.BufferAttribute,
    private flyMesh: THREE.InstancedMesh,
    private shardMesh: THREE.InstancedMesh,
  ) {
    for (let i = FLYERS - 1; i >= 0; i--) {
      this.freeSlots.push(i);
      flyMesh.setMatrixAt(i, ZERO);
    }
    for (let i = 0; i < SHARDS; i++) {
      shardMesh.setMatrixAt(i, ZERO);
      this.shards.push({
        pos: new THREE.Vector3(), vel: new THREE.Vector3(), quat: new THREE.Quaternion(),
        axis: new THREE.Vector3(1, 0, 0), spin: 0, w: 0, h: 0, age: 0, landed: -1, bright: 1, active: false,
      });
    }
  }

  get busy() {
    return this.flyers.length > 0 || this.shards.some((s) => s.active);
  }

  private fishAt(i: number, t: number, out: THREE.Vector3) {
    const { crowd } = this;
    const sp = crowd.speed[i];
    const moving = Math.abs(sp) > 0.01 ? 1 : 0;
    const raw = crowd.z[i] + sp * t - crowd.zMin;
    const z = crowd.zMin + raw - crowd.zLen * Math.floor(raw / crowd.zLen);
    const x = crowd.x[i] + Math.sin(t * 0.21 + crowd.phase[i] * 19) * crowd.sway[i] * moving;
    return out.set(x, FISH_CENTER * crowd.scale[i], z);
  }

  /** Picks the fish under the finger; returns false when there is none. */
  grab(pointer: number, ndc: THREE.Vector2, t: number, viewH: number): boolean {
    if (!this.freeSlots.length) this.dropOldest();
    if (!this.freeSlots.length) return false;
    const cam = this.camera;
    const focal = viewH / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2));
    const aspect = cam.aspect;
    let best = -1;
    let bestScore = Infinity;
    let bestDist = 0;
    const hide = this.crowd.hide.array as Float32Array;
    for (let i = 0; i < hide.length; i++) {
      if (hide[i] > 0.5) continue;
      this.fishAt(i, t, tmpA);
      const dist = tmpA.distanceTo(cam.position);
      tmpB.copy(tmpA).project(cam);
      if (tmpB.z > 1 || tmpB.z < -1) continue;
      const dx = (tmpB.x - ndc.x) * aspect * viewH * 0.5;
      const dy = (tmpB.y - ndc.y) * viewH * 0.5;
      const radius = Math.max(22, ((1.5 * this.crowd.scale[i]) / dist) * focal * 0.6);
      const d = Math.hypot(dx, dy);
      if (d > radius) continue;
      const score = d / radius + dist * 0.004;
      if (score < bestScore) {
        bestScore = score;
        best = i;
        bestDist = dist;
      }
    }
    if (best < 0) return false;

    hide[best] = 1;
    this.crowd.hide.needsUpdate = true;
    const slot = this.freeSlots.pop()!;
    const geo = this.flyMesh.geometry;
    const copy = (name: string, src: Float32Array) => {
      const attr = geo.getAttribute(name) as THREE.InstancedBufferAttribute;
      (attr.array as Float32Array).set(src.subarray(best * 3, best * 3 + 3), slot * 3);
      attr.needsUpdate = true;
    };
    copy("aScale", this.crowd.scales);
    copy("aPatch", this.crowd.patches);
    copy("aBag", this.crowd.bags);
    const walk = geo.getAttribute("aWalk") as THREE.InstancedBufferAttribute;
    (walk.array as Float32Array).set([0, this.crowd.phase[best], 0, 0], slot * 4);
    walk.needsUpdate = true;

    const pos = this.fishAt(best, t, new THREE.Vector3());
    this.flyers.push({
      id: this.nextId++,
      slot,
      held: true,
      pointer,
      ndc: ndc.clone(),
      // A little nearer the camera along the same ray: it rises to the finger.
      holdDist: bestDist * 0.86,
      pos,
      vel: new THREE.Vector3(),
      fwd: new THREE.Vector3(0, 0, -1),
      scale: this.crowd.scale[best],
      phase: this.crowd.phase[best] * 10,
      cruise: 8 + Math.random() * 5,
      target: null,
      cooldown: 0,
    });
    return true;
  }

  move(pointer: number, ndc: THREE.Vector2) {
    for (const f of this.flyers) if (f.held && f.pointer === pointer) f.ndc.copy(ndc);
  }

  release(pointer: number) {
    for (const f of this.flyers) {
      if (!f.held || f.pointer !== pointer) continue;
      f.held = false;
      f.pointer = -1;
      f.vel.clampLength(0, 22);
      if (f.vel.length() < 4) f.vel.add(tmpA.set(Math.random() - 0.5, 3.5, -3));
      f.fwd.copy(f.vel).normalize();
    }
  }

  private dropOldest() {
    const idx = this.flyers.findIndex((f) => !f.held);
    if (idx < 0) return;
    const [f] = this.flyers.splice(idx, 1);
    if (f.target) f.target.claimed = 0;
    this.flyMesh.setMatrixAt(f.slot, ZERO);
    this.freeSlots.push(f.slot);
  }

  private chooseTarget(f: Flyer) {
    let best: SignRecord | null = null;
    let bestScore = Infinity;
    for (const s of this.signs) {
      if (s.broken || (s.claimed && s.claimed !== f.id) || s.c.z < Z_MIN) continue;
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

  private smash(s: SignRecord, f: Flyer) {
    s.broken = true;
    s.claimed = 0;
    for (let k = 0; k < 4; k++) {
      this.signBroken.setX(s.v + k, 1);
      if (s.hv >= 0) this.haloBroken.setX(s.hv + k, 1);
    }
    this.signBroken.needsUpdate = true;
    this.haloBroken.needsUpdate = true;

    // Shatter into a grid of pieces carrying their part of the face.
    const cols = THREE.MathUtils.clamp(Math.round(s.w / 0.45), 2, 7);
    const rows = THREE.MathUtils.clamp(Math.round(s.h / 0.45), 1, 8);
    const side = Math.sign(tmpA.copy(f.pos).sub(s.c).dot(s.normal)) || 1;
    const basis = tmpM.makeBasis(s.right, UP, s.normal);
    const q = new THREE.Quaternion().setFromRotationMatrix(basis);
    const attrRect = this.shardMesh.geometry.getAttribute("aRect") as THREE.InstancedBufferAttribute;
    const [rx, ry, rw, rh] = s.rect;
    const uw = rw * Math.min(1, s.windowFrac);
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const slot = this.nextShard;
        this.nextShard = (this.nextShard + 1) % SHARDS;
        const sh = this.shards[slot];
        const a = ((i + 0.5) / cols - 0.5) * s.w;
        const b = ((j + 0.5) / rows - 0.5) * s.h;
        sh.pos.copy(s.c).addScaledVector(s.right, a).addScaledVector(UP, b);
        sh.vel.copy(s.normal).multiplyScalar(side * (1.5 + Math.random() * 3.5))
          .addScaledVector(s.right, a * (1.2 + Math.random()))
          .addScaledVector(UP, b * 1.2 + Math.random() * 2)
          .addScaledVector(f.vel, 0.25);
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

    // Bounce off and look for the next one.
    f.vel.multiplyScalar(0.45).addScaledVector(s.normal, side * 4);
    f.cooldown = 0.28;
    f.target = null;
  }

  update(dt: number, t: number) {
    const cam = this.camera;
    for (const f of this.flyers) {
      if (f.held) {
        this.raycaster.setFromCamera(f.ndc, cam);
        tmpA.copy(this.raycaster.ray.origin).addScaledVector(this.raycaster.ray.direction, f.holdDist);
        tmpB.copy(f.pos);
        f.pos.lerp(tmpA, 1 - Math.exp(-dt * 16));
        tmpB.subVectors(f.pos, tmpB).divideScalar(Math.max(dt, 1e-3));
        f.vel.lerp(tmpB, 0.5);
        this.place(f, t, true);
        continue;
      }
      f.cooldown -= dt;
      if (f.cooldown <= 0 && (!f.target || f.target.broken)) this.chooseTarget(f);
      if (f.cooldown <= 0 && f.target) {
        tmpA.copy(f.target.c).addScaledVector(f.target.normal, 0.2).sub(f.pos).normalize().multiplyScalar(f.cruise);
      } else {
        tmpA.copy(f.vel).setLength(f.cruise * 0.7);
      }
      // A swimming wobble across the heading.
      tmpB.crossVectors(f.vel, UP);
      if (tmpB.lengthSq() > 1e-4) tmpA.addScaledVector(tmpB.normalize(), Math.sin(t * 3 + f.phase) * 2.2);
      f.vel.lerp(tmpA, 1 - Math.exp(-dt * 2.6));
      f.pos.addScaledVector(f.vel, dt);

      const xMin = Math.min(X_MIN, f.target ? f.target.c.x - 0.3 : X_MIN);
      const xMax = Math.max(X_MAX, f.target ? f.target.c.x + 0.3 : X_MAX);
      if (f.pos.x < xMin) { f.pos.x = xMin; f.vel.x = Math.abs(f.vel.x); }
      if (f.pos.x > xMax) { f.pos.x = xMax; f.vel.x = -Math.abs(f.vel.x); }
      if (f.pos.y < Y_MIN) { f.pos.y = Y_MIN; f.vel.y = Math.abs(f.vel.y); }
      if (f.pos.y > Y_MAX) { f.pos.y = Y_MAX; f.vel.y = -Math.abs(f.vel.y); }
      if (f.pos.z < Z_MIN) { f.pos.z = Z_MIN; f.vel.z = Math.abs(f.vel.z); }
      if (f.pos.z > Z_MAX) { f.pos.z = Z_MAX; f.vel.z = -Math.abs(f.vel.z); }

      // Anything in the way breaks too.
      for (const s of this.signs) {
        if (s.broken) continue;
        tmpA.subVectors(f.pos, s.c);
        if (Math.abs(tmpA.dot(s.normal)) > 0.6) continue;
        if (Math.abs(tmpA.dot(s.right)) > s.w / 2 + 0.35 || Math.abs(tmpA.y) > s.h / 2 + 0.35) continue;
        this.smash(s, f);
        break;
      }
      this.place(f, t, false);
    }
    this.flyMesh.instanceMatrix.needsUpdate = this.flyers.length > 0 || this.flyMesh.instanceMatrix.needsUpdate;

    let any = false;
    const bright = this.shardMesh.geometry.getAttribute("aBright") as THREE.InstancedBufferAttribute;
    for (let i = 0; i < SHARDS; i++) {
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
    if (any) {
      this.shardMesh.instanceMatrix.needsUpdate = true;
      bright.needsUpdate = true;
    }
  }

  /** Writes a flyer's matrix: upright and kicking while held, nose-first while swimming. */
  private place(f: Flyer, t: number, held: boolean) {
    const s = f.scale;
    if (held) {
      tmpA.subVectors(this.camera.position, f.pos);
      const yaw = Math.atan2(-tmpA.x, -tmpA.z);
      tmpM.makeRotationFromEuler(tmpE.set(0, yaw, Math.sin(t * 7 + f.phase) * 0.25));
      tmpM.scale(tmpB.set(s, s, s));
      tmpA.set(0, FISH_CENTER * s, 0).applyMatrix4(tmpR.extractRotation(tmpM));
      tmpM.setPosition(f.pos.x - tmpA.x, f.pos.y - tmpA.y, f.pos.z - tmpA.z);
      this.flyMesh.setMatrixAt(f.slot, tmpM);
      return;
    }
    if (f.vel.lengthSq() > 1e-3) f.fwd.lerp(tmpA.copy(f.vel).normalize(), 0.3).normalize();
    const Y = f.fwd;
    // Back (local +z) toward the sky, rolled a little with the wobble.
    const Z = tmpB.copy(UP).addScaledVector(Y, -Y.y);
    if (Z.lengthSq() < 1e-4) Z.set(0, 0, 1);
    Z.normalize().applyAxisAngle(Y, Math.sin(t * 3 + f.phase) * 0.3);
    const X = tmpC.crossVectors(Y, Z).normalize();
    tmpM.makeBasis(X.multiplyScalar(s), tmpD.copy(Y).multiplyScalar(s), Z.multiplyScalar(s));
    tmpM.setPosition(
      f.pos.x - Y.x * FISH_CENTER * s,
      f.pos.y - Y.y * FISH_CENTER * s,
      f.pos.z - Y.z * FISH_CENTER * s,
    );
    this.flyMesh.setMatrixAt(f.slot, tmpM);
  }
}

const tmpC = new THREE.Vector3();
const tmpD = new THREE.Vector3();
const tmpQ = new THREE.Quaternion();
const tmpE = new THREE.Euler();
const tmpR = new THREE.Matrix4();
