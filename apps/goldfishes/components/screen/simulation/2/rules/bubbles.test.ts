import assert from "node:assert/strict";
import { test } from "node:test";
import { Bubbles } from "./bubbles.ts";
import { drawn, match, SIZE } from "./disposition.ts";

test("a disposition is the same for the same seed and matches itself", () => {
  const a = new Float32Array(SIZE);
  const b = new Float32Array(SIZE);
  drawn(7, a, 0);
  drawn(7, b, 0);
  assert.deepEqual(a, b);
  assert.ok(Math.abs(match(a, 0, b, 0) - 1) < 1e-6);
  drawn(8, b, 0);
  assert.ok(match(a, 0, b, 0) < 1);
});

test("a bubble that adopts takes the other's disposition and face together", () => {
  const bubbles = new Bubbles();
  const state = {};
  bubbles.keep(state, 3);
  assert.notEqual(bubbles.faceOf(0), bubbles.faceOf(1));
  assert.equal(bubbles.adopt(0, 1), true);
  assert.equal(bubbles.faceOf(0), bubbles.faceOf(1));
  assert.ok(Math.abs(match(bubbles.dispositions, 0, bubbles.dispositions, SIZE) - 1) < 1e-6);
  // Nothing to take from itself, from nobody, or twice.
  assert.equal(bubbles.adopt(0, 1), false);
  assert.equal(bubbles.adopt(2, -1), false);
  assert.equal(bubbles.adopt(2, 2), false);
});

test("a stroke's bubbles share one new pair; a new world forgets them", () => {
  const bubbles = new Bubbles();
  const state = {};
  bubbles.keep(state, 2);
  const stroke = bubbles.begin(null);
  bubbles.lay(2, stroke);
  bubbles.lay(3, stroke);
  assert.equal(bubbles.faceOf(2), bubbles.faceOf(3));
  assert.equal(bubbles.faceOf(2), bubbles.strokeFace(stroke));
  assert.notEqual(bubbles.faceOf(2), bubbles.faceOf(0));
  bubbles.keep(state, 4);
  assert.equal(bubbles.faceOf(2), bubbles.strokeFace(stroke));
  bubbles.keep({}, 4);
  assert.equal(bubbles.faceOf(2), 2);
  assert.equal(bubbles.strokeFace(stroke), -1);
});

test("bubble/9's way: a bubble moves on to its own next object, as pageKind(page, turn) names it", () => {
  const bubbles = new Bubbles();
  bubbles.keep({}, 2);
  bubbles.moveOn(1, 3);
  assert.equal(bubbles.faceOf(1), 1 + 3 * 1.618);
});
