// node --test apps/xyt-cube/components/moving-image/3/model/geometry.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  boxHalf,
  cubeAt,
  cubeTotal,
  cutTime,
  cutWindows,
  depthToLoop,
  glue,
  sliceTotal,
  unrotatePlane,
  rotatePlane,
  loopOf,
  loopTime,
  loopToDepth,
  OPERATIONS,
  shownPresent,
  sliceAt,
  timeSpan,
  type Amount,
  type Vector,
} from "./geometry.ts";

const half = boxHalf(16 / 9);
const close = (a: number, b: number, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance, `${a} ≉ ${b}`);

test("every operation is the identity at (0, 0)", () => {
  for (const operation of OPERATIONS) {
    for (const P of [[0.3, -0.2, 0.4], [-0.8, 0.45, -0.7]] as Vector[]) {
      const c = cubeAt(operation, [0, 0], P, half);
      assert.ok(c);
      c.forEach((value, i) => close(value, P[i], 1e-7));
    }
  }
});

test("a tilted plane keeps the present's centre and turns rigidly", () => {
  const tilt: Amount = [0.7, -0.4];
  const z = 0.3;
  const centre = sliceTotal("none", [0, 0], tilt, [0, 0], z, half)!;
  close(centre[0], 0);
  close(centre[1], 0);
  close(centre[2], z);
  const p = sliceTotal("none", [0, 0], tilt, [0.5, 0], z, half)!;
  const q = sliceTotal("none", [0, 0], tilt, [0, 0.4], z, half)!;
  close(Math.hypot(p[0] - centre[0], p[1] - centre[1], p[2] - centre[2]), 0.5);
  close(Math.hypot(q[0] - centre[0], q[1] - centre[1], q[2] - centre[2]), 0.4);
  // A quarter turn about y is the x–t slice.
  const side = sliceTotal("none", [0, 0], [Math.PI / 2, 0], [0.5, 0], z, half)!;
  close(side[0], 0, 1e-12);
  close(Math.abs(side[2] - z), 0.5);
  // The solid view's space is the same map on the plane Z = present.
  const solid = cubeTotal("moebius", [0.6, 0], tilt, [0.2, -0.1, z], half, z)!;
  const screen = sliceTotal("moebius", [0.6, 0], tilt, [0.2, -0.1], z, half)!;
  solid.forEach((value, i) => close(value, screen[i]));
  // R⁻¹·R = 1.
  const v = unrotatePlane(tilt, rotatePlane(tilt, [0.3, -0.2, 0.5]));
  [0.3, -0.2, 0.5].forEach((value, i) => close(v[i], value, 1e-12));
});

test("moebius: identity at a = 0; a ring whose two ends are glued with a half-turn", () => {
  for (const P of [[0.3, -0.2, 0.4], [-0.8, 0.45, -0.7]] as Vector[]) {
    const c = cubeAt("moebius", [0, 0], P, half)!;
    c.forEach((value, i) => close(value, P[i], 1e-12));
  }
  const h = half[2];
  // Just above and below the ring's far side (θ = ±π, x < −R_ring): the two ends of the clip, flipped.
  const above = cubeAt("moebius", [1, 0], [-0.7, 0.2, 1e-7], half)!;
  const below = cubeAt("moebius", [1, 0], [-0.7, 0.2, -1e-7], half)!;
  close(above[2], h, 1e-5);
  close(below[2], -h, 1e-5);
  close(-above[0], below[0], 1e-5);
  close(-above[1], below[1], 1e-5);
  // That is the gluing the loop's cross-fade uses: end (x, y) → start R(aπ)·(x, y).
  const glued = glue(1, [above[0], above[1]]);
  close(glued[0], below[0], 1e-5);
  close(glued[1], below[1], 1e-5);
  // Along the near side the screen holds a range of times and of twists.
  const right = cubeAt("moebius", [1, 0], [0.8, 0, 0.3], half)!;
  const left = cubeAt("moebius", [1, 0], [-0.3, 0, 0.3], half)!;
  assert.ok(left[2] > right[2] + 0.1, "farther round the ring is later");
  // An open ring (a < 1) has nothing beyond its ends.
  assert.equal(cubeAt("moebius", [0.5, 0], [-1.5, 0, 1e-3], half), null);
});

test("slices are continuous: neighbouring screen points stay close in the cube", () => {
  const step = 1e-4;
  for (const operation of OPERATIONS) {
    const amount: Amount = operation === "curvature" ? [1.2, 0] : operation === "moebius" ? [0.8, 0] : [0.9, 0.6];
    for (let i = 0; i < 200; i += 1) {
      const s: [number, number] = [((i * 37) % 100) / 60 - 0.8, ((i * 53) % 100) / 100 - 0.5];
      const a = sliceAt(operation, amount, s, 0.2, half);
      const b = sliceAt(operation, amount, [s[0] + step, s[1]], 0.2, half);
      if (!a || !b) continue;
      const jump = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
      assert.ok(jump < 200 * step, `${operation} jumps ${jump} at ${s}`);
    }
  }
});

test("the loop is continuous across its seam", () => {
  const loop = loopOf(300, 10);
  assert.equal(loop.seam, 15);
  assert.equal(loop.period, 284);
  const at = (u: number) => {
    const { a, b, weight } = loopTime(loop, u);
    return { a, b, weight };
  };
  // Just before the wrap the loop shows the clip's end …
  const end = at(loop.period - 1e-9);
  close(end.weight, 0);
  close(end.a, loop.period, 1e-6);
  // … and just after it the same picture, fading towards the start.
  const start = at(0);
  close(start.weight, 0);
  close(start.a, loop.period);
  // At the end of the seam the fade is complete and joins plain time.
  const joined = at(loop.seam - 1e-9);
  close(joined.weight, 1, 1e-6);
  close(joined.b, loop.seam, 1e-6);
  // Every clip time stays inside the clip.
  for (let u = -400; u < 700; u += 0.37) {
    const { a, b } = at(u);
    for (const t of [a, b]) assert.ok(t >= 0 && t <= loop.frames - 1, `${t} out of the clip at u=${u}`);
  }
});

test("depth and loop time are inverse", () => {
  const loop = loopOf(260, 10);
  for (const z of [-half[2], -0.3, 0, 0.71]) close(loopToDepth(loop, half, depthToLoop(loop, half, z)), z);
});

test("flat playback snaps to frames; a slice across time does not", () => {
  const loop = loopOf(300, 24);
  const z = loopToDepth(loop, half, 41.37);
  const flat = timeSpan("shear", [0, 0], [0, 0], z, half, loop, [half[0], half[1]]);
  close(flat, 0);
  close(depthToLoop(loop, half, shownPresent(z, half, loop, flat)), 41, 1e-9);
  const tilted = timeSpan("none", [0, 0], [0.4, 0], z, half, loop, [half[0], half[1]]);
  assert.ok(tilted > 10);
  close(shownPresent(z, half, loop, tilted), z, 1e-12);
});

test("cuts become dissolve windows that never overlap and join the clip continuously", () => {
  const frames = 120;
  const windows = cutWindows([10, 11, 12, 20, 21, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 100], frames, 10);
  assert.equal(windows.length, 4);
  for (let k = 1; k < windows.length; k += 1) assert.ok(windows[k].from >= windows[k - 1].to, "windows overlap");
  for (const w of windows) {
    assert.ok(w.from <= w.before && w.to >= w.after);
    // At the window's edges the dissolve is the plain clip.
    const start = cutTime(windows, w.from);
    assert.ok(start.weight === 0 && start.a === w.from);
    const end = cutTime(windows, w.to);
    assert.ok(end.weight === 1 && end.b === w.to);
    // Neither side ever reads across the cut.
    for (let f = w.from; f <= w.to; f += 0.05) {
      const { a, b } = cutTime(windows, f);
      assert.ok(a <= w.before && b >= w.after);
    }
  }
  // A picture function that is continuous in f stays continuous through cutTime.
  const picture = (f: number) => Math.sin(f) + (f > 10.5 ? 5 : 0);
  const shown = (f: number) => {
    const { a, b, weight } = cutTime(windows, f);
    return picture(a) * (1 - weight) + picture(b) * weight;
  };
  for (let f = 0; f < frames - 1; f += 0.01) assert.ok(Math.abs(shown(f + 0.01) - shown(f)) < 0.2, `jump at ${f}`);
});
