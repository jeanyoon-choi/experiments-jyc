import assert from "node:assert/strict";
import test from "node:test";
import {
  createCubismRuntime,
  facePlane,
  setClip,
  setPivot,
  setRate,
  snapshotCubism,
  turnPlane,
} from "./model.mjs";
import { fromAxisAngle, multiply } from "./plane.mjs";

test("deltas from several holders compose and persist", () => {
  const state = createCubismRuntime(0);
  const a = fromAxisAngle([1, 0, 0], 0.3);
  const b = fromAxisAngle([0, 1, 0], 0.5);
  assert.equal(turnPlane(state, a), true);
  assert.equal(turnPlane(state, b), true);
  const expected = multiply(a, b);
  snapshotCubism(state, 0).orientation.forEach((value, i) =>
    assert.ok(Math.abs(value - expected[i]) < 1e-12),
  );
  assert.equal(turnPlane(state, [0, 0, 0, 0]), false);
  facePlane(state);
  assert.deepEqual(snapshotCubism(state, 0).orientation, [1, 0, 0, 0]);
});

test("the playhead advances at the chosen rate and rebases on change", () => {
  const state = createCubismRuntime(0);
  assert.equal(snapshotCubism(state, 2000).playhead, 2);
  assert.equal(setRate(state, 0, 2000), true);
  assert.equal(snapshotCubism(state, 9000).playhead, 2);
  assert.equal(setRate(state, -1, 9000), true);
  assert.equal(snapshotCubism(state, 10000).playhead, 1);
  assert.equal(setRate(state, 7, 10000), false);
});

test("the clip is a validated id", () => {
  const state = createCubismRuntime(0);
  assert.equal(snapshotCubism(state, 0).clip, null);
  assert.equal(setClip(state, "cat-jump"), true);
  assert.equal(setClip(state, "../etc"), false);
  assert.equal(snapshotCubism(state, 0).clip, "cat-jump");
});

test("the pivot is now by default and only now or cube", () => {
  const state = createCubismRuntime(0);
  assert.equal(snapshotCubism(state, 0).pivot, "now");
  assert.equal(setPivot(state, "cube"), true);
  assert.equal(setPivot(state, "sphere"), false);
  assert.equal(snapshotCubism(state, 0).pivot, "cube");
});
