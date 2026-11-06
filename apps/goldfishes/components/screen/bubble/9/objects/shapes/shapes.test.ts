import assert from "node:assert/strict";
import test from "node:test";
import { GROUPS, KIND, KINDS_OF, type ObjectGroup } from "../kinds/groups.ts";
import { polygonsOf, MARKS } from "./marks.ts";
import { groupBit, OBJECT_DEFAULTS, OBJECT_KINDS, pageKind, pagesAreObjects, PORTION_SHOWS, portionKind, type ObjectParameters } from "../kinds/parameters.ts";
import { shapeOf, type MeshKind } from "./shapes.ts";

test("every object builds, in both levels, rising from z 0 within its reach of the disc", () => {
  for (const kind of OBJECT_KINDS) {
    if (KIND[kind].make || KIND[kind].source === "mark" || KIND[kind].source === "face" || KIND[kind].source === "glyph") continue;
    for (const detailed of [true, false]) {
      const { positions, normals, indices } = shapeOf(kind as MeshKind, detailed);
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

test("every logo mark parses into closed polygons inside its 24 box", () => {
  for (const kind of KINDS_OF.logo) {
    const polygons = polygonsOf(MARKS[kind].path);
    assert.ok(polygons.length > 0, kind);
    for (const polygon of polygons) for (const [x, y] of polygon) assert.ok(Number.isFinite(x + y) && x > -0.5 && x < 24.5 && y > -0.5 && y < 24.5, `${kind} ${x} ${y}`);
  }
});

test("pages and portions take their groups; off kinds never come; bubbles stay bubbles", () => {
  assert.equal(pageKind(7, OBJECT_DEFAULTS), pageKind(7, OBJECT_DEFAULTS));
  const tech = { ...OBJECT_DEFAULTS, pages: groupBit("tech") };
  for (let page = 0; page < 60; page += 1) {
    // bubble/8 opens with every group on: a page is some object, never a bubble.
    assert.ok(pageKind(page, OBJECT_DEFAULTS) !== null);
    const kind = pageKind(page, tech);
    assert.ok(kind && (KINDS_OF.tech as readonly string[]).includes(kind) && kind !== "ape", `${kind}`);
    // Portions can follow their page.
    assert.equal(portionKind(page, 0.3, { ...tech, portions: PORTION_SHOWS.indexOf("page") }), kind);
    // By default they are hearts and likes (bubble/6; bubble/7 morphs them at both ends, objects.portionMorph).
    assert.ok(["heart", "like"].includes(portionKind(page, (page * 0.137) % 1, OBJECT_DEFAULTS)!));
  }
  // SNS for the portions alone: pages stay tech, portions are hearts, likes and comments.
  const snsPortions = { ...OBJECT_DEFAULTS, portions: PORTION_SHOWS.indexOf("sns"), commentOn: 1 };
  for (let seed = 0; seed < 1; seed += 0.05) assert.ok((KINDS_OF.sns as readonly string[]).includes(portionKind(3, seed, snsPortions)!));
  const onlyHearts = { ...snsPortions, likeOn: 0, commentOn: 0 };
  for (let seed = 0; seed < 1; seed += 0.05) assert.equal(portionKind(3, seed, onlyHearts), "heart");
  // Bubbles.
  // Pages as bubbles, and portions following them: bubbles too.
  const bubbles = { ...OBJECT_DEFAULTS, pages: 0, portions: PORTION_SHOWS.indexOf("page") };
  assert.ok(!pagesAreObjects(bubbles));
  assert.equal(pageKind(3, bubbles), null);
  assert.equal(portionKind(3, 0.5, bubbles), null);
  assert.equal(portionKind(3, 0.5, { ...OBJECT_DEFAULTS, portions: PORTION_SHOWS.indexOf("bubble") }), null);
});

test("pages take any combination of groups, mixed: every selected group comes, no other, off kinds never", () => {
  const combinations: ObjectGroup[][] = [["tech", "logo"], [...GROUPS]];
  for (const selected of combinations) {
    const mask = selected.reduce((bits, group) => bits | groupBit(group), 0);
    for (const change of [0, 14]) {
      const parameters: ObjectParameters = { ...OBJECT_DEFAULTS, pages: mask, change, likeOn: 0 };
      assert.ok(pagesAreObjects(parameters));
      const seen = new Set<ObjectGroup>();
      for (let page = 0; page < 400; page += 1) {
        const kind = pageKind(page, parameters, page * 3.7);
        assert.ok(kind, `page ${page}`);
        const { group } = KIND[kind];
        assert.ok(selected.includes(group), `${kind} not in ${selected.join("+")}`);
        assert.ok(parameters[`${kind}On`] >= 0.5, `${kind} is off`);
        seen.add(group);
      }
      for (const group of selected) assert.ok(seen.has(group), `${group} never came in ${selected.join("+")}`);
    }
  }
  // A selected group with every kind off gives its share to the others.
  const noLogos = Object.fromEntries(KINDS_OF.logo.map((kind) => [`${kind}On`, 0]));
  const parameters = { ...OBJECT_DEFAULTS, ...noLogos, pages: groupBit("tech") | groupBit("logo") };
  for (let page = 0; page < 100; page += 1) assert.equal(KIND[pageKind(page, parameters)!].group, "tech");
});
