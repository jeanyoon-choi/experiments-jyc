import assert from "node:assert/strict";
import test from "node:test";
import { OBJECT_DEFAULTS, OBJECT_KINDS, OBJECT_SETS, PAGE_SHOWS, pageKind, PORTION_SHOWS, portionKind } from "./objects.ts";
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

test("pages and portions take their sets; off kinds never come; bubbles stay bubbles", () => {
  assert.equal(pageKind(7, OBJECT_DEFAULTS), pageKind(7, OBJECT_DEFAULTS));
  for (let page = 0; page < 60; page += 1) {
    const kind = pageKind(page, OBJECT_DEFAULTS);
    assert.ok(kind && (OBJECT_SETS.tech.kinds as readonly string[]).includes(kind) && kind !== "ape", `${kind}`);
    // Portions can follow their page.
    assert.equal(portionKind(page, 0.3, { ...OBJECT_DEFAULTS, portions: PORTION_SHOWS.indexOf("page") }), kind);
    // By default they are hearts and likes (bubble/6; bubble/7 morphs them at both ends, objects.portionMorph).
    assert.ok(["heart", "like"].includes(portionKind(page, (page * 0.137) % 1, OBJECT_DEFAULTS)!));
  }
  // SNS for the portions alone: pages stay tech, portions are hearts, likes and comments.
  const snsPortions = { ...OBJECT_DEFAULTS, portions: PORTION_SHOWS.indexOf("sns"), commentOn: 1 };
  for (let seed = 0; seed < 1; seed += 0.05) assert.ok((OBJECT_SETS.sns.kinds as readonly string[]).includes(portionKind(3, seed, snsPortions)!));
  const onlyHearts = { ...snsPortions, likeOn: 0, commentOn: 0 };
  for (let seed = 0; seed < 1; seed += 0.05) assert.equal(portionKind(3, seed, onlyHearts), "heart");
  // Bubbles.
  // Pages as bubbles, and portions following them: bubbles too.
  const bubbles = { ...OBJECT_DEFAULTS, pages: PAGE_SHOWS.indexOf("bubble"), portions: PORTION_SHOWS.indexOf("page") };
  assert.equal(pageKind(3, bubbles), null);
  assert.equal(portionKind(3, 0.5, bubbles), null);
  assert.equal(portionKind(3, 0.5, { ...OBJECT_DEFAULTS, portions: PORTION_SHOWS.indexOf("bubble") }), null);
});
