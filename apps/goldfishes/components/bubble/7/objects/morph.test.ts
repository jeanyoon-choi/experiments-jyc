import assert from "node:assert/strict";
import test from "node:test";
import { FIELD_EXTENT, FIELD_SIZE, fieldOf, MEMBRANE_SIZE } from "./fields.ts";
import { LIQUID_DEFAULTS } from "./liquid.ts";
import { envelope, FIELD_KINDS, nextInSequence, passage, retarget, spring } from "./morph.ts";

test("the bubble's field is a sphere over its disc: distance to the circle, height √(1 − r²), its membrane the same", () => {
  const field = fieldOf("bubble");
  const texel = (2 * FIELD_EXTENT) / FIELD_SIZE;
  for (const [x, y] of [[0.0, 0.0], [0.5, 0.1], [-0.3, -0.7], [1.2, 0.4]] as const) {
    const column = Math.round((x / FIELD_EXTENT / 2 + 0.5) * FIELD_SIZE - 0.5);
    const row = Math.round((y / FIELD_EXTENT / 2 + 0.5) * FIELD_SIZE - 0.5);
    const at = (row * FIELD_SIZE + column) * 4;
    const px = ((column + 0.5) / FIELD_SIZE - 0.5) * 2 * FIELD_EXTENT;
    const py = ((row + 0.5) / FIELD_SIZE - 0.5) * 2 * FIELD_EXTENT;
    const r = Math.hypot(px, py);
    assert.ok(Math.abs(field.data[at + 1]! - (r - 1)) < 2 * texel, `distance at ${x},${y}: ${field.data[at + 1]}`);
    if (r < 0.95) assert.ok(Math.abs(field.data[at]! - Math.sqrt(1 - r * r)) < 0.02, `height at ${x},${y}`);
  }
  const middle = (MEMBRANE_SIZE / 2) * MEMBRANE_SIZE + MEMBRANE_SIZE / 2;
  assert.ok(Math.abs(field.membrane[middle]! - 1) < 0.05, `membrane ${field.membrane[middle]}`);
});

test("every kind bakes a finite field with an outline inside its reach", () => {
  for (const kind of FIELD_KINDS) {
    const field = fieldOf(kind);
    assert.ok(field.thickness > 0.05 && field.peak > 0, kind);
    for (const value of field.data) assert.ok(Number.isFinite(value), kind);
    // The border of the field is outside every object.
    assert.ok(field.data[1]! > 0 && field.data[(FIELD_SIZE * FIELD_SIZE - 1) * 4 + 1]! > 0, kind);
  }
});

test("a morph melts, flows with a spring's overshoot, and sets as the new object", () => {
  assert.deepEqual(envelope(0, LIQUID_DEFAULTS), { shape: 0, melt: 0 });
  assert.deepEqual(envelope(1, LIQUID_DEFAULTS), { shape: 1, melt: 0 });
  const middle = envelope(0.45, LIQUID_DEFAULTS);
  assert.ok(middle.melt > 0.95, `melted in the middle: ${middle.melt}`);
  let highest = 0;
  for (let tau = 0; tau < 2; tau += 0.01) highest = Math.max(highest, spring(tau, 0.2));
  assert.ok(highest > 1.15 && highest < 1.25, `overshoot ${highest}`);
  assert.ok(Math.abs(spring(1.45, 0.2) - 1) < 0.02, "settled before it sets");
  // Nothing melts at 0: the outlines alone flow.
  assert.equal(envelope(0.45, { ...LIQUID_DEFAULTS, melt: 0 }).melt, 0);
});

test("a morph retargeted midway starts from what it shows most of; the lab's heart hub alternates", () => {
  const morph = { from: 1, to: 2, start: 0 };
  retarget(morph, 3, LIQUID_DEFAULTS.duration * 0.2, LIQUID_DEFAULTS);
  assert.deepEqual([morph.from, morph.to], [1, 3]);
  retarget(morph, 4, morph.start + LIQUID_DEFAULTS.duration * 0.9, LIQUID_DEFAULTS);
  assert.deepEqual([morph.from, morph.to], [3, 4]);
  const visited = { last: -1 };
  const kinds = ["heart", "gpu", "cloud"] as const;
  assert.equal(nextInSequence("heart", "heart", kinds, visited), "gpu");
  assert.equal(nextInSequence("heart", "gpu", kinds, visited), "heart");
  assert.equal(nextInSequence("heart", "heart", kinds, visited), "cloud");
});

test("a portion morphs at both ends of its way: its source page's shape, its own across the middle, the target's on arrival", () => {
  const [source, own, target] = [3, 0, 7];
  const start = passage(0, source, own, target, LIQUID_DEFAULTS);
  assert.deepEqual([start.from, start.to, start.shape, start.melt], [source, own, 0, 0]);
  const middle = passage(0.5, source, own, target, LIQUID_DEFAULTS);
  assert.deepEqual([middle.from, middle.to, middle.shape, middle.melt], [own, own, 1, 0]);
  const leaving = passage(0.2, source, own, target, LIQUID_DEFAULTS);
  assert.ok(leaving.melt > 0.5 && leaving.to === own, `leaving melts into its own: ${JSON.stringify(leaving)}`);
  const arriving = passage(0.8, source, own, target, LIQUID_DEFAULTS);
  assert.ok(arriving.melt > 0.5 && arriving.from === own && arriving.to === target, `arriving melts into the target: ${JSON.stringify(arriving)}`);
  const end = passage(1, source, own, target, LIQUID_DEFAULTS);
  assert.deepEqual([end.to, end.shape, end.melt], [target, 1, 0]);
});
