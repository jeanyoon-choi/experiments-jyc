import assert from "node:assert/strict";
import test from "node:test";
import { applyContactChanges, createNetwork, isLinked, lifeOf, pruneFaded } from "./network.ts";

test("lifted nodes stay where they were left and later touches add to them", () => {
  const network = createNetwork();
  applyContactChanges(network, "touchstart", [{ identifier: 0, x: 10, y: 10 }, { identifier: 1, x: 50, y: 50 }], 0);
  applyContactChanges(network, "touchmove", [{ identifier: 0, x: 30, y: 40 }], 0);
  applyContactChanges(network, "touchend", [{ identifier: 0, x: 30, y: 40 }, { identifier: 1, x: 50, y: 50 }], 0);
  assert.equal(network.held.size, 0);
  assert.deepEqual(network.nodes.map(({ x, y }) => [x, y]), [[30, 40], [50, 50]]);

  applyContactChanges(network, "touchstart", [{ identifier: 0, x: 90, y: 90 }], 0);
  applyContactChanges(network, "touchcancel", [{ identifier: 0, x: 90, y: 90 }], 0);
  assert.equal(network.nodes.length, 3);
  assert.deepEqual(network.nodes.map((node) => node.id), [0, 1, 2]);
  assert.deepEqual(network.nodes[0], { id: 0, session: 1, releasedAt: 0, x: 30, y: 40 }, "a reused touch identifier never moves an earlier node");
});

test("one session is a complete graph; other sessions link only when near", () => {
  const network = createNetwork();
  applyContactChanges(network, "touchstart", [{ identifier: 0, x: 0, y: 0 }], 0);
  applyContactChanges(network, "touchstart", [{ identifier: 1, x: 300, y: 0 }, { identifier: 2, x: 0, y: 300 }], 0);
  applyContactChanges(network, "touchend", [{ identifier: 0, x: 0, y: 0 }], 0);
  applyContactChanges(network, "touchstart", [{ identifier: 3, x: 300, y: 300 }], 0);
  applyContactChanges(network, "touchend", [{ identifier: 1, x: 0, y: 0 }, { identifier: 2, x: 0, y: 0 }, { identifier: 3, x: 0, y: 0 }], 0);
  assert.deepEqual(network.nodes.map((node) => node.session), [1, 1, 1, 1], "a finger added before the last one lifts joins the session");

  applyContactChanges(network, "touchstart", [{ identifier: 4, x: 20, y: 10 }, { identifier: 5, x: 600, y: 600 }], 0);
  const [a, b, c, d, near, far] = network.nodes;
  assert.equal(near.session, 2);
  for (const [x, y] of [[a, b], [a, c], [a, d], [b, c], [near, far]]) assert.ok(isLinked(x, y, 100));
  assert.ok(isLinked(near, a, 100));
  assert.ok(!isLinked(near, b, 100));
  assert.ok(!isLinked(far, d, 100));
});

test("left nodes fade over their lifetime and are removed; held nodes stay alive", () => {
  const network = createNetwork();
  applyContactChanges(network, "touchstart", [{ identifier: 0, x: 0, y: 0 }, { identifier: 1, x: 50, y: 0 }], 0);
  applyContactChanges(network, "touchend", [{ identifier: 0, x: 0, y: 0 }], 1000);
  const [left, held] = network.nodes;
  assert.equal(lifeOf(left, 6000, 10000), 0.5);
  assert.equal(lifeOf(held, 60000, 10000), 1);
  pruneFaded(network, 11000, 10000);
  assert.deepEqual(network.nodes.map((node) => node.id), [1]);
});
