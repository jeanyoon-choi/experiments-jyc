// moving-image/3 geometry and time, shared by the screen and the tests. The GLSL in
// ../render/shaders.ts mirrors `cubeAt`, `sliceAt` and `loopTime`; keep them in step.
//
// Copied from socket/experiments/moving-image/2/geometry.mjs: shear, cylinder,
// sphere, curvature and torus unchanged; moving-image/2's `flux` is replaced
// by `moebius` (below). On top of any of them the plane can be tilted
// (moving-image/1's cut plane, pivot "now"): the screen point s lies at
// P = n + R·(s, 0) with n = (0, 0, present), R = Ry(tilt₀)·Rx(tilt₁), and the
// screen shows c = cubeAt(P) (`sliceTotal`). Equivalently the space is turned
// against a still plane Z = present (`cubeTotal`), which is what the solid
// view draws. (Curvature's screen lives in its own geodesic coordinates, so
// there the tilt turns the slice about n in cube coordinates instead.)
//
// moebius: the cube embedded in space as a Möbius ring (same definition as
// components/clock/2/model/geometry.mjs, copied). Its t axis is bent into a
// circle about an axis parallel to y at x = −R_m, and its (x, y) frame turns
// about the t axis by φ(t) = a·π·t/D on the way round (t centred, D = the
// box depth), so at a = 1 the circle closes (θ = ±π ↔ t = ±t_max) and the
// ends are glued with a half-turn, (x, y, t_max) ~ (−x, −y, t_min). With
// a ∈ [0, 1]: R_m = R_RING/a, arc length = t·(1 + a·(k − 1)), k = 2π·R_RING/D,
// so a = 0 is the identity and a = 1 closes exactly. The flat present then
// cuts the ring obliquely: across the screen both time and twist vary, and
// the far side (x < −R_m) crosses the seam into the flipped other end as the
// present passes the ring's middle. Time is not wrapped here (the ring
// closes it); beyond the ring's ends is nowhere. Space is continuous across
// the seam (glued points); content is not, as at any loop seam.
//
// (A first version turned the frame rigidly by φ(t) with t = Z: on the flat
// present that is one rotated frame, "the same as before" — rejected.)
//
// The video is a box in cube coordinates c = (x, y, t): x right, y up, t from
// the first frame (back) to the last (front), lengths in frame heights.

export type Vector = [number, number, number];
export type Amount = [number, number];

export const OPERATIONS = ["none", "shear", "cylinder", "sphere", "curvature", "torus", "moebius"] as const;
export type Operation = (typeof OPERATIONS)[number];

type Spec = { gain: Amount; min: Amount; max: Amount; wrap: [boolean, boolean] };

/** How far one full-screen drag moves each amount, and its range (`wrap` = angle). */
export const OPERATION_SPECS: Record<Operation, Spec> = {
  none: { gain: [0, 0], min: [0, 0], max: [0, 0], wrap: [false, false] },
  shear: { gain: [1.5, 1.5], min: [-3, -3], max: [3, 3], wrap: [false, false] },
  cylinder: { gain: [3, 3], min: [-4, -4], max: [4, 4], wrap: [false, false] },
  sphere: { gain: [3, 0], min: [-4, 0], max: [4, 0], wrap: [false, false] },
  curvature: { gain: [6, 0], min: [-8, 0], max: [2.4, 0], wrap: [false, false] },
  torus: { gain: [Math.PI, Math.PI], min: [-Math.PI, -Math.PI], max: [Math.PI, Math.PI], wrap: [true, true] },
  moebius: { gain: [1, 0], min: [0, 0], max: [1, 0], wrap: [false, false] },
};

/** The plane's tilt: turns about y and x (moving-image/1's plane, as angles). */
export const TILT_SPEC: Spec = {
  gain: [Math.PI, Math.PI],
  min: [-Math.PI, -Math.PI],
  max: [Math.PI, Math.PI],
  wrap: [true, true],
};

const EPSILON = 1e-4;

/** Box half sizes in frame heights: aspect × 1 × max(aspect, 1). */
export function boxHalf(aspect: number): Vector {
  return [aspect / 2, 0.5, Math.max(aspect, 1) / 2];
}

/** The present: Z (= t on the undeformed cube) after `cycle` loop periods. */
export function presentDepth(half: Vector, cycle: number) {
  const phase = cycle - Math.floor(cycle);
  return (2 * phase - 1) * half[2];
}

function wrapAngle(value: number) {
  return value - 2 * Math.PI * Math.floor((value + Math.PI) / (2 * Math.PI));
}

/** Adds a change to an amount, keeping it in range (angles wrap). */
export function addAmount(operation: Operation | "tilt", amount: Amount, delta: Amount): Amount {
  const spec = operation === "tilt" ? TILT_SPEC : OPERATION_SPECS[operation];
  return [0, 1].map((i) => {
    const next = amount[i] + delta[i];
    if (spec.wrap[i]) return wrapAngle(next);
    return Math.min(spec.max[i], Math.max(spec.min[i], next));
  }) as Amount;
}

/** R = Ry(a)·Rx(b) applied to v. */
export function rotatePlane(amount: Amount, v: Vector): Vector {
  const [a, b] = amount;
  const cb = Math.cos(b);
  const sb = Math.sin(b);
  const y = v[1] * cb - v[2] * sb;
  const z = v[1] * sb + v[2] * cb;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  return [v[0] * ca + z * sa, y, -v[0] * sa + z * ca];
}

/** R⁻¹ = Rx(−b)·Ry(−a) applied to v. */
export function unrotatePlane(amount: Amount, v: Vector): Vector {
  const [a, b] = amount;
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const x = v[0] * ca - v[2] * sa;
  const z0 = v[0] * sa + v[2] * ca;
  const cb = Math.cos(b);
  const sb = Math.sin(b);
  return [x, v[1] * cb + z0 * sb, -v[1] * sb + z0 * cb];
}

function turn2(angle: number, x: number, y: number): [number, number] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return [c * x - s * y, s * x + c * y];
}

/** Möbius ring: its axis lies this far from the cube centre at a = 1 (frame heights). */
export const MOEBIUS_RING = 0.5;

/** The gluing across the Möbius seam: a frame point at t_max is the point R(aπ)·(x, y) at t_min. */
export function glue(a: number, xy: [number, number]): [number, number] {
  return turn2(a * Math.PI, xy[0], xy[1]);
}

/**
 * The cube point at place P of the space the cube is drawn in (the plane
 * untilted). Null where the operation has no point.
 */
export function cubeAt(operation: Operation, amount: Amount, P: Vector, half: Vector): Vector | null {
  const [a, b] = amount;
  const [X, Y, Z] = P;
  switch (operation) {
    case "none":
      return [X, Y, Z];
    case "moebius": {
      if (a < EPSILON) return [X, Y, Z];
      const depth = 2 * half[2];
      const k = (2 * Math.PI * MOEBIUS_RING) / depth;
      const stretch = 1 + a * (k - 1);
      const ringRadius = MOEBIUS_RING / a;
      const qx = X + ringRadius;
      const theta = Math.atan2(Z, qx);
      const rho = Math.hypot(qx, Z) - ringRadius;
      const t = (ringRadius * theta) / stretch;
      if (Math.abs(t) > half[2] + 1e-9) return null;
      const phi = (a * Math.PI * t) / depth;
      const c = Math.cos(phi);
      const s = Math.sin(phi);
      return [rho * c + Y * s, -rho * s + Y * c, t];
    }
    case "shear":
      return [X, Y, Z + a * X + b * Y];
    case "cylinder": {
      const k = Math.hypot(a, b);
      if (k < EPSILON) return [X, Y, Z];
      const n = [a / k, b / k];
      const u = X * n[0] + Y * n[1];
      const v = -X * n[1] + Y * n[0];
      const rho0 = 1 / k + Math.abs(n[0]) * half[0] + Math.abs(n[1]) * half[1];
      const cu = Math.hypot(u + rho0, Z) - rho0;
      const ct = rho0 * Math.atan2(Z, u + rho0);
      return [cu * n[0] - v * n[1], cu * n[1] + v * n[0], ct];
    }
    case "sphere": {
      if (Math.abs(a) < EPSILON) return [X, Y, Z];
      const rho0 = 1 / Math.abs(a) + half[2];
      const s = Math.sign(a);
      const qz = s * Z + rho0;
      const rho = Math.hypot(X, Y, qz);
      return [rho0 * Math.atan2(X, qz), rho0 * Math.atan2(Y, qz), s * (rho - rho0)];
    }
    case "curvature": {
      if (Math.abs(a) < EPSILON) return [X, Y, Z];
      const rho = 1 / Math.sqrt(Math.abs(a));
      const r = Math.hypot(X, Y, Z);
      if (r < 1e-9) return [0, 0, 0];
      let D: number;
      if (a > 0) D = rho * Math.atan(r / rho);
      else if (r < rho) D = rho * Math.atanh(r / rho);
      else return null;
      return [(X * D) / r, (Y * D) / r, (Z * D) / r];
    }
    case "torus": {
      const L = [2 * half[0], 2 * half[2]];
      const alpha = (2 * Math.PI * X) / L[0];
      const tau = (2 * Math.PI * Z) / L[1];
      const w = [Math.cos(alpha), Math.sin(alpha), Math.cos(tau), Math.sin(tau)];
      const [c1, s1, c2, s2] = [Math.cos(a), Math.sin(a), Math.cos(b), Math.sin(b)];
      const r = [c1 * w[0] - s1 * w[2], c2 * w[1] - s2 * w[3], s1 * w[0] + c1 * w[2], s2 * w[1] + c2 * w[3]];
      const alphaOut = alpha + wrapAngle(Math.atan2(r[1], r[0]) - alpha);
      const tauOut = tau + wrapAngle(Math.atan2(r[3], r[2]) - tau);
      return [(alphaOut * L[0]) / (2 * Math.PI), Y, (tauOut * L[1]) / (2 * Math.PI)];
    }
  }
}

/** The cube point the screen shows at s (frame heights from the centre) while the present is at z. */
export function sliceAt(operation: Operation, amount: Amount, s: [number, number], z: number, half: Vector): Vector | null {
  if (operation !== "curvature" || Math.abs(amount[0]) < EPSILON) {
    return cubeAt(operation, amount, [s[0], s[1], z], half);
  }
  const K = amount[0];
  const rho = 1 / Math.sqrt(Math.abs(K));
  const sigma = Math.hypot(s[0], s[1]);
  const u = sigma > 1e-9 ? [s[0] / sigma, s[1] / sigma] : [0, 0];
  let D: number;
  let q: Vector;
  if (K > 0) {
    D = rho * Math.acos(Math.max(-1, Math.min(1, Math.cos(sigma / rho) * Math.cos(z / rho))));
    q = [rho * Math.sin(sigma / rho) * u[0], rho * Math.sin(sigma / rho) * u[1], rho * Math.cos(sigma / rho) * Math.sin(z / rho)];
  } else {
    D = rho * Math.acosh(Math.cosh(sigma / rho) * Math.cosh(z / rho));
    q = [rho * Math.sinh(sigma / rho) * u[0], rho * Math.sinh(sigma / rho) * u[1], rho * Math.cosh(sigma / rho) * Math.sinh(z / rho)];
  }
  const qLength = Math.hypot(...q);
  if (qLength < 1e-9) return [0, 0, 0];
  return [(q[0] * D) / qLength, (q[1] * D) / qLength, (q[2] * D) / qLength];
}

/** The present plane's tilt as a turn of the space about n = (0, 0, present): P ↦ n + R·(P − n). */
function tiltPoint(tilt: Amount, P: Vector, present: number): Vector {
  const r = rotatePlane(tilt, [P[0], P[1], P[2] - present]);
  return [r[0], r[1], r[2] + present];
}

/** The cube point the (possibly tilted) screen shows at s while the present is at z. */
export function sliceTotal(
  operation: Operation,
  amount: Amount,
  tilt: Amount,
  s: [number, number],
  z: number,
  half: Vector,
): Vector | null {
  if (operation === "curvature") {
    const c = sliceAt(operation, amount, s, z, half);
    return c && tiltPoint(tilt, c, z);
  }
  return cubeAt(operation, amount, tiltPoint(tilt, [s[0], s[1], z], z), half);
}

/** The cube point at place P of the space the solid view draws (the plane is Z = present there). */
export function cubeTotal(operation: Operation, amount: Amount, tilt: Amount, P: Vector, half: Vector, present: number) {
  if (operation === "curvature") {
    const c = cubeAt(operation, amount, P, half);
    return c && tiltPoint(tilt, c, present);
  }
  return cubeAt(operation, amount, tiltPoint(tilt, P, present), half);
}

/** Where the present plane sits in the space the cube is drawn in (see moving-image/2). */
export function presentPlaneZ(operation: Operation, amount: Amount, z: number) {
  const K = amount[0];
  if (operation !== "curvature" || Math.abs(K) < EPSILON) return z;
  const rho = 1 / Math.sqrt(Math.abs(K));
  if (K < 0) return rho * Math.tanh(z / rho);
  if (Math.abs(z / rho) >= Math.PI / 2 - 1e-3) return null;
  return rho * Math.tan(z / rho);
}

// --- Time ---------------------------------------------------------------
//
// The clip is a loop of `period` = frames − 1 − seam frame intervals: the
// last `seam` intervals are cross-faded into the first, so the loop has no
// cut. Between frame centres, time is continuous (the shader interpolates
// along the optical flow), so every loop time u ∈ [0, period) is a picture.

export type Loop = { frames: number; seam: number; period: number };

/** A loop for `frames` frames at `fps`, with a seam of about `seamSeconds`. */
export function loopOf(frames: number, fps: number, seamSeconds = 1.5): Loop {
  const seam = Math.max(0, Math.min(Math.round(seamSeconds * fps), Math.floor((frames - 1) / 2)));
  return { frames, seam, period: frames - 1 - seam };
}

/**
 * Loop time u (frame intervals, any real) as one or two clip times (frame
 * indices in [0, frames − 1]) and the weight of the second.
 */
export function loopTime(loop: Loop, u: number): { a: number; b: number; weight: number } {
  const { period, seam } = loop;
  const w = u - period * Math.floor(u / period);
  if (w >= seam || seam === 0) return { a: w, b: w, weight: 0 };
  const x = w / seam;
  // Smoothstep: the fade starts and ends without a kink.
  return { a: w + period, b: w, weight: x * x * (3 - 2 * x) };
}

/** Cube depth z (box coordinates) as loop time u. */
export function depthToLoop(loop: Loop, half: Vector, z: number) {
  return ((z + half[2]) / (2 * half[2])) * loop.period;
}

/** Loop time u as cube depth z. */
export function loopToDepth(loop: Loop, half: Vector, u: number) {
  return (u / loop.period) * 2 * half[2] - half[2];
}

/**
 * How many frame intervals the screen spans at most, sampled on a grid of
 * screen points (frame heights; `extent` = half the screen's size).
 */
export function timeSpan(
  operation: Operation,
  amount: Amount,
  tilt: Amount,
  z: number,
  half: Vector,
  loop: Loop,
  extent: [number, number],
) {
  const centre = sliceTotal(operation, amount, tilt, [0, 0], z, half);
  if (!centre) return Infinity;
  let span = 0;
  for (let i = -2; i <= 2; i += 1) {
    for (let j = -2; j <= 2; j += 1) {
      const c = sliceTotal(operation, amount, tilt, [(i / 2) * extent[0], (j / 2) * extent[1]], z, half);
      if (!c) continue;
      span = Math.max(span, Math.abs(c[2] - centre[2]));
    }
  }
  return (span / (2 * half[2])) * loop.period;
}

/**
 * The present the screen shows: flat, it snaps to the nearest frame so
 * ordinary playback shows the clip's own frames; as the slice starts to
 * span time (0.25 → 1.5 frame intervals) it slides back to the continuous
 * present. The weight is global (one per screen), so it adds no seam.
 */
export function shownPresent(z: number, half: Vector, loop: Loop, span: number) {
  const u = depthToLoop(loop, half, z);
  const snapped = Math.round(u);
  const x = Math.min(1, Math.max(0, (span - 0.25) / 1.25));
  const continuous = x * x * (3 - 2 * x);
  return loopToDepth(loop, half, snapped + (u - snapped) * continuous);
}

// --- Shot cuts -----------------------------------------------------------
//
// Across a cut the flow means nothing (the build script zeroes it), so a
// slice through a montage would show each cut as a hard edge one frame
// interval wide. Instead each cut (a run of consecutive cut intervals,
// c0 … c1) becomes a dissolve window [from, to] in clip time: before the cut
// the clip runs on (interpolated) while fading towards the first frame after
// it; after the cut it runs on from that frame. Windows reach `seconds / 2`
// beyond the cut on each side, shrunk so neighbours never overlap.

export type CutWindow = {
  /** Window in clip time (frame indices, integers). */
  from: number;
  to: number;
  /** Last frame before the cut, first frame after it. */
  before: number;
  after: number;
};

export function cutWindows(cuts: readonly number[], frames: number, fps: number, seconds = 0.6): CutWindow[] {
  const sorted = [...new Set(cuts)].filter((i) => i >= 0 && i < frames - 1).sort((a, b) => a - b);
  const runs: [number, number][] = [];
  for (const i of sorted) {
    const last = runs.at(-1);
    if (last && last[1] === i - 1) last[1] = i;
    else runs.push([i, i]);
  }
  const reach = Math.max(0, Math.round((seconds / 2) * fps));
  return runs.map(([c0, c1], k) => {
    const previousEnd = k > 0 ? runs[k - 1][1] + 1 : 0;
    const nextStart = k < runs.length - 1 ? runs[k + 1][0] : frames - 1;
    // Half of the good frames on each side belong to this window.
    const left = Math.min(reach, Math.floor((c0 - previousEnd) / 2));
    const right = Math.min(reach, Math.floor((nextStart - (c1 + 1)) / 2));
    return { from: c0 - left, to: c1 + 1 + right, before: c0, after: c1 + 1 };
  });
}

/**
 * The clip time f as one or two clip times and the weight of the second
 * (mirrors the shader): inside a cut window, the run-on before the cut
 * (held at its last frame) fades into the run-on after it (held at its first).
 */
export function cutTime(windows: readonly CutWindow[], f: number): { a: number; b: number; weight: number } {
  const window = windows.find((w) => f >= w.from && f <= w.to);
  if (!window) return { a: f, b: f, weight: 0 };
  const x = (f - window.from) / (window.to - window.from);
  return { a: Math.min(f, window.before), b: Math.max(f, window.after), weight: x * x * (3 - 2 * x) };
}
