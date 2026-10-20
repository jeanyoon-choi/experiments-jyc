// clock/2 geometry (copied from moving-image/2's geometry.mjs and changed:
// flux is replaced by a true Möbius gluing). The GLSL in ../render/shaders.ts
// mirrors `cubeAt` / `sliceAt`; keep them in step.
//
// The clock's cube is a box in cube coordinates c = (x, y, t): x right, y up,
// t later toward the viewer, lengths in screen units (shorter side = 1). The
// screen never moves: it is the flat plane Z = z (the present) in the space the
// cube sits in, sweeping the box once per span. What changes is the cube: an
// operation says which cube point c lies at each place P of that space
// (c = cubeAt(P)). Each operation is global, smooth, and the identity at
// amount (0, 0), where the screen is the ordinary clock.
//
//   shear      non-orthogonal axes: the t axis leans, t = Z + a·X + b·Y.
//   cylinder   cylindrical coordinates: t becomes the angle around an axis
//              lying 1/|(a, b)| beyond the cube's side (direction of bending
//              in xy = (a, b)); lengths along t are kept at the cube centre.
//   sphere     spherical coordinates: frames become concentric shells around a
//              point 1/|a| behind the back face (a > 0) or ahead of the front
//              face (a < 0); x, y are arc lengths on the shell through the
//              cube centre.
//   curvature  the cube in a space of constant sectional curvature K = a
//              (S³ for K > 0, H³ for K < 0), x, y, t its Riemann normal
//              coordinates about the cube centre; the screen is the totally
//              geodesic plane through the present, in its own geodesic
//              coordinates (cos D/ρ = cos σ/ρ · cos d/ρ, or the cosh form).
//   torus      x and t wrapped into a Clifford torus in R⁴; a double rotation
//              of R⁴ by a in (e1, e3) and b in (e2, e4) mixes the two circles.
//   mobius     the cube embedded as a Möbius ring: its t axis bent into a
//              circle (axis parallel to y, at x = −R_m) so t_max meets t_min,
//              and its (x, y) frame turned about the t axis by
//              φ(t) = a·π·t/(t_max − t_min) on the way round — half a turn
//              per loop, so the ends are glued (x, y, t_max) ~ (−x, −y,
//              t_min). The flat present cuts this ring obliquely: across the
//              screen both the time and the twist change, and when the
//              present passes the ring's middle the far side crosses the
//              seam into the flipped other end. With a ∈ [0, 1]: R_m =
//              R_RING/a (straight at a = 0), the loop closes at a = 1; arc
//              length along the ring is t·(1 + a·(k − 1)), k = 2π·R_RING /
//              depth, so a = 0 is the identity and a = 1 closes exactly.
//   Centres and axes of curvature lie outside the cube (no local steepness).

/** @typedef {[number, number, number]} Vector */
/** @typedef {[number, number]} Amount */

/** Operation keys in scaffolding order. */
export const OPERATIONS = Object.freeze(["shear", "cylinder", "sphere", "curvature", "torus", "mobius"]);

/**
 * Per operation: how far one full-screen drag (or 90° of tilt) moves each
 * amount, and the range each amount is kept in. `wrap` amounts are angles.
 */
export const OPERATION_SPECS = Object.freeze({
  shear: { gain: [1.5, 1.5], min: [-3, -3], max: [3, 3], wrap: [false, false] },
  cylinder: { gain: [3, 3], min: [-4, -4], max: [4, 4], wrap: [false, false] },
  sphere: { gain: [3, 0], min: [-4, 0], max: [4, 0], wrap: [false, false] },
  curvature: { gain: [6, 0], min: [-8, 0], max: [2.4, 0], wrap: [false, false] },
  torus: { gain: [Math.PI, Math.PI], min: [-Math.PI, -Math.PI], max: [Math.PI, Math.PI], wrap: [true, true] },
  mobius: { gain: [1, 0], min: [0, 0], max: [1, 0], wrap: [false, false] },
});

const EPSILON = 1e-4;

/** The Möbius ring's axis distance from the cube centre at a = 1 (screen units). */
export const MOBIUS_RING = 0.5;

/** The present: Z (= t on the undeformed cube) after `cycle` spans; it sweeps the box once per span. */
export function presentDepth(half, cycle) {
  const phase = cycle - Math.floor(cycle);
  return (2 * phase - 1) * half[2];
}

function wrapAngle(value) {
  return value - 2 * Math.PI * Math.floor((value + Math.PI) / (2 * Math.PI));
}

/** Adds a change to an amount, keeping it in range (angles wrap). @returns {Amount} */
export function addAmount(operation, amount, delta) {
  const spec = OPERATION_SPECS[operation];
  return /** @type {Amount} */ (
    [0, 1].map((i) => {
      const next = amount[i] + delta[i];
      if (spec.wrap[i]) return wrapAngle(next);
      return Math.min(spec.max[i], Math.max(spec.min[i], next));
    })
  );
}

function length3(v) {
  return Math.hypot(v[0], v[1], v[2]);
}

/** ρ = 1/√|K|, the radius of curvature. */
function radiusOf(K) {
  return 1 / Math.sqrt(Math.abs(K));
}

/**
 * The cube point at place P of the space the cube is drawn in. For
 * `curvature` that space is the gnomonic (K > 0) or Klein (K < 0) chart, in
 * which geodesics, and so the present plane, are straight.
 * Returns null where the operation has no point (beyond the hyperbolic horizon
 * or the stereographic pole).
 * @returns {Vector | null}
 */
export function cubeAt(operation, amount, P, half) {
  const [a, b] = amount;
  const [X, Y, Z] = P;
  switch (operation) {
    case "shear":
      return [X, Y, Z + a * X + b * Y];
    case "cylinder": {
      const k = Math.hypot(a, b);
      if (k < EPSILON) return [X, Y, Z];
      const n = [a / k, b / k];
      const u = X * n[0] + Y * n[1];
      const v = -X * n[1] + Y * n[0];
      // Axis beyond the side the bend points away from; ρ0 = its distance to the centre.
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
      const rho = radiusOf(a);
      const r = length3(P);
      if (r < 1e-9) return [0, 0, 0];
      let D;
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
      // At (0, 0) the angles come back unchanged, also beyond the box (unwrapped).
      const alphaOut = alpha + wrapAngle(Math.atan2(r[1], r[0]) - alpha);
      const tauOut = tau + wrapAngle(Math.atan2(r[3], r[2]) - tau);
      return [(alphaOut * L[0]) / (2 * Math.PI), Y, (tauOut * L[1]) / (2 * Math.PI)];
    }
    case "mobius": {
      if (a < EPSILON) return [X, Y, Z];
      const depth = 2 * half[2];
      const k = (2 * Math.PI * MOBIUS_RING) / depth;
      const stretch = 1 + a * (k - 1);
      const ringRadius = MOBIUS_RING / a;
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
    default:
      return [X, Y, Z];
  }
}

/**
 * The cube point the screen shows at screen position s (frame heights from
 * the screen centre) while the present is at depth z.
 * @returns {Vector | null}
 */
export function sliceAt(operation, amount, s, z, half) {
  if (operation !== "curvature" || Math.abs(amount[0]) < EPSILON) {
    return cubeAt(operation, amount, [s[0], s[1], z], half);
  }
  // The screen is the geodesic plane through the present, orthogonal to t,
  // in its own geodesic polar coordinates (σ, direction u).
  const K = amount[0];
  const rho = radiusOf(K);
  const sigma = Math.hypot(s[0], s[1]);
  const u = sigma > 1e-9 ? [s[0] / sigma, s[1] / sigma] : [0, 0];
  let D;
  let q;
  if (K > 0) {
    D = rho * Math.acos(Math.max(-1, Math.min(1, Math.cos(sigma / rho) * Math.cos(z / rho))));
    q = [rho * Math.sin(sigma / rho) * u[0], rho * Math.sin(sigma / rho) * u[1], rho * Math.cos(sigma / rho) * Math.sin(z / rho)];
  } else {
    D = rho * Math.acosh(Math.cosh(sigma / rho) * Math.cosh(z / rho));
    q = [rho * Math.sinh(sigma / rho) * u[0], rho * Math.sinh(sigma / rho) * u[1], rho * Math.cosh(sigma / rho) * Math.sinh(z / rho)];
  }
  const qLength = length3(q);
  if (qLength < 1e-9) return [0, 0, 0];
  return [(q[0] * D) / qLength, (q[1] * D) / qLength, (q[2] * D) / qLength];
}

/**
 * Where the present plane sits in the space the cube is drawn in: Z = z,
 * except for `curvature`, whose chart moves it to ρ·tan(z/ρ) (K > 0) or
 * ρ·tanh(z/ρ) (K < 0). Null when the plane lies beyond the chart.
 */
export function presentPlaneZ(operation, amount, z) {
  const K = amount[0];
  if (operation !== "curvature" || Math.abs(K) < EPSILON) return z;
  const rho = radiusOf(K);
  if (K < 0) return rho * Math.tanh(z / rho);
  if (Math.abs(z / rho) >= Math.PI / 2 - 1e-3) return null;
  return rho * Math.tan(z / rho);
}
