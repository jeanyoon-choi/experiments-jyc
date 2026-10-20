import assert from "node:assert/strict";
import test from "node:test";
import { bend, createBendRuntime, flatten, setClip, setOperation, setRate, snapshotBend } from "./model.mjs";

test("changes from several devices add up on the current operation", () => {
  const state = createBendRuntime(0);
  assert.equal(bend(state, [0.2, 0]), true);
  assert.equal(bend(state, [0.1, -0.3]), true);
  const amount = snapshotBend(state, 0).amounts.shear;
  assert.ok(Math.abs(amount[0] - 0.3) < 1e-12 && Math.abs(amount[1] + 0.3) < 1e-12);
});

test("each operation keeps its own amount", () => {
  const state = createBendRuntime(0);
  bend(state, [0.5, 0]);
  assert.equal(setOperation(state, "sphere"), true);
  assert.deepEqual(snapshotBend(state, 0).amounts.sphere, [0, 0]);
  setOperation(state, "shear");
  assert.deepEqual(snapshotBend(state, 0).amounts.shear, [0.5, 0]);
  assert.equal(setOperation(state, "nonsense"), false);
});

test("flatten resets only the current operation", () => {
  const state = createBendRuntime(0);
  bend(state, [0.5, 0]);
  setOperation(state, "torus");
  bend(state, [0.4, 0.1]);
  assert.equal(flatten(state), true);
  assert.deepEqual(snapshotBend(state, 0).amounts.torus, [0, 0]);
  assert.deepEqual(snapshotBend(state, 0).amounts.shear, [0.5, 0]);
  assert.equal(flatten(state), false);
});

test("malformed or huge changes are dropped", () => {
  const state = createBendRuntime(0);
  assert.equal(bend(state, [Number.NaN, 0]), false);
  assert.equal(bend(state, [5, 0]), false);
  assert.equal(bend(state, "x"), false);
  assert.equal(bend(state, [0, 0]), false);
});

test("rate rebases the playhead; clip ids are validated", () => {
  const state = createBendRuntime(0);
  assert.equal(setRate(state, 0, 2000), true);
  assert.equal(snapshotBend(state, 5000).playhead, 2);
  assert.equal(setClip(state, "tears-of-steel"), true);
  assert.equal(setClip(state, "../x"), false);
});
