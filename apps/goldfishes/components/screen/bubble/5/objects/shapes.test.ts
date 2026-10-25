import assert from "node:assert/strict";
import test from "node:test";
import { kindOf, OBJECT_DEFAULTS, OBJECT_KINDS } from "./objects.ts";
import { shapeOf } from "./shapes.ts";

test("every object builds, in both levels, rising from z 0 within its reach of the disc", () => {
  for (const kind of OBJECT_KINDS) {
    for (const detailed of [true, false]) {
      const { positions, normals, indices } = shapeOf(kind, detailed);
      assert.equal(positions.length, normals.length, kind);
      assert.ok(indices.length > 0 && indices.length % 3 === 0, kind);
      let furthest = 0;
      let lowest = Infinity;
      for (let index = 0; index < positions.length; index += 3) {
        assert.ok(Number.isFinite(positions[index]! + positions[index + 1]! + positions[index + 2]!), kind);
        furthest = Math.max(furthest, Math.hypot(positions[index]!, positions[index + 1]!));
        lowest = Math.min(lowest, positions[index + 2]!);
      }
      assert.ok(furthest > 0.95 && furthest <= 1.5, `${kind} reaches ${furthest}`);
      assert.ok(lowest > -1e-6, `${kind} starts at ${lowest}`);
      for (const value of indices) assert.ok(value < positions.length / 3, kind);
    }
  }
});

test("a page keeps its object; off kinds never come; none on, none", () => {
  assert.equal(kindOf(7, OBJECT_DEFAULTS), kindOf(7, OBJECT_DEFAULTS));
  const onlyRockets = { ...OBJECT_DEFAULTS, ...Object.fromEntries(OBJECT_KINDS.map((kind) => [`${kind}On`, kind === "rocket" ? 1 : 0])) };
  for (let page = 0; page < 50; page += 1) assert.equal(kindOf(page, onlyRockets), "rocket");
  const none = { ...OBJECT_DEFAULTS, ...Object.fromEntries(OBJECT_KINDS.map((kind) => [`${kind}On`, 0])) };
  assert.equal(kindOf(3, none), null);
});
