import assert from "node:assert/strict";
import test from "node:test";
import { addAmount, cubeAt, OPERATIONS, presentPlaneZ, sliceAt } from "./geometry.mjs";

/** A 16:9 screen (shorter side = 1); depth = the longer side. */
const half = [16 / 9 / 2, 0.5, 16 / 9 / 2];
const near = (actual, expected, tolerance = 1e-9) =>
  actual.forEach((value, i) => assert.ok(Math.abs(value - expected[i]) < tolerance, `${actual} vs ${expected}`));

test("every operation is the identity when flat", () => {
  const points = [
    [0, 0, 0],
    [0.7, -0.4, 0.5],
    [-0.88, 0.49, -0.85],
  ];
  for (const operation of OPERATIONS) {
    for (const P of points) {
      near(cubeAt(operation, [0, 0], P, half), P, 1e-9);
      near(sliceAt(operation, [0, 0], [P[0], P[1]], P[2], half), P, 1e-9);
    }
  }
});

test("small amounts move points little (continuity at flat)", () => {
  const P = [0.6, 0.3, -0.4];
  for (const operation of OPERATIONS) {
    const moved = cubeAt(operation, [1e-3, 1e-3], P, half);
    assert.ok(Math.hypot(...moved.map((value, i) => value - P[i])) < 0.02, operation);
  }
});

test("shear leans the t axis linearly", () => {
  near(cubeAt("shear", [0.5, -1], [0.4, 0.2, 0.1], half), [0.4, 0.2, 0.1 + 0.2 - 0.2]);
});

test("cylinder keeps distances along the bent t axis; its axis is outside the cube", () => {
  // The t axis through the centre is an arc of radius ρ0 = 1/k + half-width: arc length = ρ0·θ = t.
  const k = 2;
  const rho0 = 1 / k + half[0];
  const theta = 0.6;
  const P = [rho0 * Math.cos(theta) - rho0, 0, rho0 * Math.sin(theta)];
  near(cubeAt("cylinder", [k, 0], P, half), [0, 0, rho0 * theta], 1e-12);
  for (const X of [-half[0], 0, half[0]]) {
    const c = cubeAt("cylinder", [4, 0], [X, 0, 0], half);
    assert.ok(Number.isFinite(c[2]) && Math.abs(c[0] - X) < 1e-9, "no singularity across the frame");
  }
});

test("sphere: magnification stays bounded through the whole sweep", () => {
  for (const z of [-half[2], 0, half[2]]) {
    const c = sliceAt("sphere", [4, 0], [0.01, 0], z, half);
    assert.ok(c[0] / 0.01 < 5 && c[0] / 0.01 > 0.3, `scale ${c[0] / 0.01} at z ${z}`);
  }
});

test("sphere: the screen centre shows the present, its edges show other times", () => {
  const z = 0.2;
  const centre = cubeAt("sphere", [2, 0], [0, 0, z], half);
  near(centre, [0, 0, z], 1e-12);
  const edge = cubeAt("sphere", [2, 0], [0.8, 0, z], half);
  assert.ok(edge[2] > z, "with the centre behind, the edge is later");
  const ahead = cubeAt("sphere", [-2, 0], [0.8, 0, z], half);
  assert.ok(ahead[2] < z, "with the centre ahead, the edge is earlier");
});

test("curvature: the slice obeys the curved Pythagorean theorem", () => {
  for (const K of [2, -3]) {
    const rho = 1 / Math.sqrt(Math.abs(K));
    const s = [0.5, 0.2];
    const z = 0.4;
    const c = sliceAt("curvature", [K, 0], s, z, half);
    const D = Math.hypot(...c);
    const sigma = Math.hypot(...s);
    if (K > 0) {
      assert.ok(Math.abs(Math.cos(D / rho) - Math.cos(sigma / rho) * Math.cos(z / rho)) < 1e-9);
    } else {
      assert.ok(Math.abs(Math.cosh(D / rho) - Math.cosh(sigma / rho) * Math.cosh(z / rho)) < 1e-9);
    }
    // Centre of the screen is still the present.
    near(sliceAt("curvature", [K, 0], [0, 0], z, half), [0, 0, z], 1e-9);
  }
});

test("curvature: the chart's present plane is the geodesic distance mapped through tan / tanh", () => {
  const z = 0.4;
  const Z = presentPlaneZ("curvature", [2, 0], z);
  near(cubeAt("curvature", [2, 0], [0, 0, Z], half), [0, 0, z], 1e-9);
  const W = presentPlaneZ("curvature", [-3, 0], z);
  near(cubeAt("curvature", [-3, 0], [0, 0, W], half), [0, 0, z], 1e-9);
  assert.equal(cubeAt("curvature", [-3, 0], [2, 0, 0], half), null, "beyond the horizon");
});

test("torus: a half turn in (e1, e3) swaps the x and t circles' roles", () => {
  // At a = π/2 the new x-angle reads sin(α) against −cos(τ).
  const c = cubeAt("torus", [Math.PI / 2, 0], [0, 0, 0], half);
  // α = 0, τ = 0: r = (−1, 0, 1, 0) → α' = π (the far edge), τ' = 0.
  assert.ok(Math.abs(Math.abs(c[0]) - half[0]) < 1e-9);
  assert.ok(Math.abs(c[2]) < 1e-9);
});

test("mobius: a ring whose two ends are glued with a half-turn", () => {
  const h = half[2];
  // Just above and below the ring's far side (θ = ±π, x < −R_ring): the two ends of the clip, flipped.
  const above = cubeAt("mobius", [1, 0], [-0.7, 0.2, 1e-7], half);
  const below = cubeAt("mobius", [1, 0], [-0.7, 0.2, -1e-7], half);
  assert.ok(Math.abs(above[2] - h) < 1e-5 && Math.abs(below[2] + h) < 1e-5, `${above} / ${below}`);
  near([-above[0], -above[1]], [below[0], below[1]], 1e-5);
  // Along the near side the screen holds a range of times and of twists.
  const right = cubeAt("mobius", [1, 0], [0.8, 0, 0.3], half);
  const left = cubeAt("mobius", [1, 0], [-0.3, 0, 0.3], half);
  assert.ok(left[2] > right[2] + 0.1, "farther round the ring is later");
});

test("amounts stay in range; angles wrap", () => {
  assert.deepEqual(addAmount("shear", [2.9, 0], [1, 0]), [3, 0]);
  const wrapped = addAmount("torus", [3, 0], [1, 0]);
  assert.ok(Math.abs(wrapped[0] - (4 - 2 * Math.PI)) < 1e-12);
});
