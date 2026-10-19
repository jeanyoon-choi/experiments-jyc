import assert from "node:assert/strict";
import test from "node:test";
import type { SpacetimeSnapshot } from "../model/index.ts";
import {
  advanceSpacetimePresenter,
  createSpacetimePresenter,
} from "./presenter.ts";
import { defaultSpacetimeOperations } from "./settings.ts";

const clip = { aspect: 16 / 9, duration: 8 };
const all = defaultSpacetimeOperations;

function snapshot(partial: Partial<SpacetimeSnapshot>): SpacetimeSnapshot {
  return { compactness: 0, observers: [], masses: [], serverTime: 0, ...partial };
}

function settle(presenter: ReturnType<typeof createSpacetimePresenter>, state: SpacetimeSnapshot, seconds = 3) {
  let result = advanceSpacetimePresenter(presenter, state, 0, clip, all);
  for (let t = 0; t < seconds; t += 1 / 60) {
    result = advanceSpacetimePresenter(presenter, state, 1 / 60, clip, all);
  }
  return result.frame;
}

test("with nothing happening the screen plays the clip in the rest frame", () => {
  const frame = settle(createSpacetimePresenter(), snapshot({}));
  assert.deepEqual(frame.restX, [0, 1, 0]);
  assert.deepEqual(frame.restY, [0, 0, 1]);
  assert.equal(frame.period, 8);
  assert.equal(frame.compactScale, 1);
  assert.equal(frame.masses.length, 0);
});

test("a boosted observer tilts the now; isolating operations restores the clip", () => {
  const presenter = createSpacetimePresenter();
  const state = snapshot({ observers: [{ id: "a", bx: 0.6, by: 0 }], compactness: 1 });
  const frame = settle(presenter, state);
  assert.ok(frame.restX[0] > 0.7);
  assert.ok(frame.compactScale < 0.3);
  const off = advanceSpacetimePresenter(presenter, state, 0, clip, {
    ...all,
    boost: false,
    compact: false,
  }).frame;
  assert.deepEqual(off.restX, [0, 1, 0]);
  assert.equal(off.compactScale, 1);
});

test("a departed observer decays back to rest and leaves the chain", () => {
  const presenter = createSpacetimePresenter();
  settle(presenter, snapshot({ observers: [{ id: "a", bx: 0.5, by: 0 }] }));
  settle(presenter, snapshot({}), 6);
  assert.equal(presenter.chain.length, 0);
});

test("masses accumulate lag that a relay reset clears", () => {
  const presenter = createSpacetimePresenter();
  const held = snapshot({ masses: [{ id: "m1", u: 0.5, v: 0.5, mu: 0.05, holding: false }] });
  settle(presenter, held, 2);
  const centre = presenter.lag[Math.floor(presenter.lagHeight / 2) * presenter.lagWidth + 64];
  assert.ok(centre > 0.05);
  settle(presenter, snapshot({}), 0.1);
  assert.equal(Math.max(...presenter.lag), 0);
});
