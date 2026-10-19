import assert from "node:assert/strict";
import test from "node:test";
import { MASS_MAX, MAX_BETA, MAX_MASSES } from "./physics.mjs";
import {
  createSpacetimeRuntime,
  moveMass,
  pressMass,
  releaseMass,
  removeObserver,
  resetSpacetime,
  setCompactness,
  setObserver,
  snapshotSpacetime,
  spacetimeModelTiming,
  stepSpacetime,
} from "./model.mjs";

test("observers keep joining order and are clamped", () => {
  const state = createSpacetimeRuntime();
  setObserver(state, "b", 2, 0, 10);
  setObserver(state, "a", 0, 0.2, 20);
  setObserver(state, "b", 0.1, 0, 30);
  const { observers } = snapshotSpacetime(state, 30);
  assert.deepEqual(observers.map(({ id }) => id), ["b", "a"]);
  assert.equal(observers[0].bx, 0.1);
  setObserver(state, "c", 5, 0, 40);
  const c = snapshotSpacetime(state, 40).observers[2];
  assert.ok(Math.abs(c.bx - MAX_BETA) < 1e-12);
  removeObserver(state, "a");
  assert.equal(snapshotSpacetime(state, 40).observers.length, 2);
});

test("silent observers leave their frame", () => {
  const state = createSpacetimeRuntime();
  setObserver(state, "a", 0.3, 0, 0);
  assert.equal(stepSpacetime(state, spacetimeModelTiming.observerStaleMs + 1, 0.03), true);
  assert.equal(snapshotSpacetime(state, 0).observers.length, 0);
});

test("a held mass grows, stays after release and persists", () => {
  const state = createSpacetimeRuntime();
  pressMass(state, "p", 0.2, 0.4, 0);
  moveMass(state, "p", 0.3, 0.5);
  for (let i = 0; i < 1000; i += 1) stepSpacetime(state, i, 0.05);
  const [held] = snapshotSpacetime(state, 0).masses;
  assert.equal(held.mu, MASS_MAX);
  assert.deepEqual([held.u, held.v], [0.3, 0.5]);
  releaseMass(state, "p");
  assert.equal(stepSpacetime(state, 2000, 0.05), false);
  assert.equal(snapshotSpacetime(state, 0).masses[0].holding, false);
});

test("masses are capped by dropping the oldest released one", () => {
  const state = createSpacetimeRuntime();
  for (let i = 0; i < MAX_MASSES + 3; i += 1) pressMass(state, `p${i}`, 0.5, 0.5, i);
  assert.equal(state.masses.length, MAX_MASSES);
});

test("compactness is validated and reset clears history only", () => {
  const state = createSpacetimeRuntime();
  assert.equal(setCompactness(state, "x"), false);
  assert.equal(setCompactness(state, 2), true);
  assert.equal(state.compactness, 1);
  pressMass(state, "p", 0.5, 0.5, 0);
  setObserver(state, "o", 0.2, 0, 0);
  resetSpacetime(state);
  assert.equal(state.compactness, 0);
  assert.equal(state.masses.length, 0);
  assert.equal(state.observers.size, 1);
});
