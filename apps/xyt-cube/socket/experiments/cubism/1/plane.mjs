// cubism/1 cut-plane math, shared by the relay, the screen and the phones.
//
// The video is a box in (x, y, t): x right, y up, t toward the viewer (the
// latest frame is the front face, as in Fels, Lee & Mase 2000). Lengths are
// frame heights: the box is aspect × 1 × depth.
//
// The cut plane is a unit quaternion q. Its in-plane axes u = q·x̂, v = q·ŷ map
// the screen's right and up; its normal w = q·t̂. q = identity is ordinary
// playback: the xy plane advancing along t. Where the plane sits is a pivot:
//
//   now   (default) the plane turns about the centre of the present frame,
//         (0, 0, t_now), which advances along t; time loops, so the screen
//         centre is always "now" and a tilt reaches into past and future.
//   cube  Fels, Lee & Mase: the plane passes through the box centre offset by
//         d along w; d sweeps the box's extent along w once per clip duration.
//         Outside the box is empty.

/** @typedef {[number, number, number, number]} Quaternion  w, x, y, z */
/** @typedef {[number, number, number]} Vector */

/** @type {Quaternion} */
export const IDENTITY = Object.freeze([1, 0, 0, 0]);

/** The two pivots; see above. */
export const PIVOTS = Object.freeze(["now", "cube"]);

function finite(value) {
  return Number.isFinite(value) ? Number(value) : 0;
}

/** @returns {Quaternion} */
export function normalize(q) {
  const length = Math.hypot(q[0], q[1], q[2], q[3]);
  if (!(length > 1e-9)) return [...IDENTITY];
  return [q[0] / length, q[1] / length, q[2] / length, q[3] / length];
}

/** Hamilton product a·b: apply b, then a. @returns {Quaternion} */
export function multiply(a, b) {
  return [
    a[0] * b[0] - a[1] * b[1] - a[2] * b[2] - a[3] * b[3],
    a[0] * b[1] + a[1] * b[0] + a[2] * b[3] - a[3] * b[2],
    a[0] * b[2] - a[1] * b[3] + a[2] * b[0] + a[3] * b[1],
    a[0] * b[3] + a[1] * b[2] - a[2] * b[1] + a[3] * b[0],
  ];
}

/** @returns {Quaternion} */
export function conjugate(q) {
  return [q[0], -q[1], -q[2], -q[3]];
}

/** @returns {Quaternion} */
export function fromAxisAngle(axis, radians) {
  const length = Math.hypot(axis[0], axis[1], axis[2]);
  if (!(length > 1e-9) || !Number.isFinite(radians)) return [...IDENTITY];
  const s = Math.sin(radians / 2) / length;
  return [Math.cos(radians / 2), axis[0] * s, axis[1] * s, axis[2] * s];
}

/** @returns {Vector} */
export function rotate(q, v) {
  const [w, x, y, z] = q;
  const tx = 2 * (y * v[2] - z * v[1]);
  const ty = 2 * (z * v[0] - x * v[2]);
  const tz = 2 * (x * v[1] - y * v[0]);
  return [
    v[0] + w * tx + (y * tz - z * ty),
    v[1] + w * ty + (z * tx - x * tz),
    v[2] + w * tz + (x * ty - y * tx),
  ];
}

/** Shortest-arc interpolation; amount 0 → a, 1 → b. @returns {Quaternion} */
export function slerp(a, b, amount) {
  let dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  const target = dot < 0 ? [-b[0], -b[1], -b[2], -b[3]] : b;
  dot = Math.abs(dot);
  if (dot > 0.9995) {
    return normalize(a.map((value, i) => value + (target[i] - value) * amount));
  }
  const theta = Math.acos(Math.min(1, dot));
  const sinTheta = Math.sin(theta);
  const wa = Math.sin((1 - amount) * theta) / sinTheta;
  const wb = Math.sin(amount * theta) / sinTheta;
  return normalize(a.map((value, i) => value * wa + target[i] * wb));
}

/** Coerces untrusted input to a unit quaternion, or null. */
export function readQuaternion(value) {
  if (!Array.isArray(value) || value.length !== 4) return null;
  const q = value.map(finite);
  if (!(Math.hypot(...q) > 1e-6)) return null;
  return normalize(q);
}

/**
 * Device orientation (W3C: intrinsic Z-X'-Y'', degrees) as a quaternion
 * taking the phone's frame (x right, y toward the top, z out of the screen)
 * to the earth frame.
 * @returns {Quaternion}
 */
export function fromDeviceOrientation(alpha, beta, gamma) {
  const radians = Math.PI / 180;
  return multiply(
    multiply(fromAxisAngle([0, 0, 1], finite(alpha) * radians), fromAxisAngle([1, 0, 0], finite(beta) * radians)),
    fromAxisAngle([0, 1, 0], finite(gamma) * radians),
  );
}

/**
 * The phone's rotation from `previous` to `next`, expressed in its own frame.
 * Held like the plane (screen = cut, top = up), the same quaternion turns the
 * plane in its own frame: plane ← plane · delta.
 * @returns {Quaternion}
 */
export function bodyDelta(previous, next) {
  return normalize(multiply(conjugate(previous), next));
}

/** @returns {{ u: Vector, v: Vector, w: Vector }} */
export function planeAxes(q) {
  return { u: rotate(q, [1, 0, 0]), v: rotate(q, [0, 1, 0]), w: rotate(q, [0, 0, 1]) };
}

/**
 * Box half sizes in frame heights for a clip of this aspect. The depth along t
 * equals the frame's longer side (Fels: depth = width), so a portrait clip is
 * not a thin slab.
 * @returns {Vector}
 */
export function boxHalf(aspect) {
  return [aspect / 2, 0.5, Math.max(aspect, 1) / 2];
}

/**
 * A point the plane passes through. `cycle` counts clip durations; its
 * fractional part runs from the back face (frame 0) to the front.
 * @returns {Vector}
 */
export function planeCentre(pivot, w, half, cycle) {
  const phase = cycle - Math.floor(cycle);
  if (pivot !== "cube") return [0, 0, (2 * phase - 1) * half[2]];
  const extent = 2 * (Math.abs(w[0]) * half[0] + Math.abs(w[1]) * half[1] + Math.abs(w[2]) * half[2]);
  const d = (phase - 0.5) * extent;
  return [d * w[0], d * w[1], d * w[2]];
}
