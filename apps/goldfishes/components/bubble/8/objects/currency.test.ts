import assert from "node:assert/strict";
import test from "node:test";
import { GLYPHS } from "./currency.ts";
import { FIELD_SIZE, fieldOf } from "./fields.ts";
import { KIND, KINDS_OF } from "./groups.ts";
import { polygonsOf } from "./marks.ts";

test("every currency sign parses into closed polygons inside its 24 box", () => {
  assert.equal(KINDS_OF.currency.length, 8);
  for (const kind of KINDS_OF.currency) {
    assert.equal(KIND[kind].source, "glyph", kind);
    const polygons = polygonsOf(GLYPHS[kind]);
    assert.ok(polygons.length > 0, kind);
    for (const polygon of polygons) for (const [x, y] of polygon) assert.ok(Number.isFinite(x + y) && x > -0.5 && x < 24.5 && y > -0.5 && y < 24.5, `${kind} ${x} ${y}`);
  }
});

test("every currency sign bakes a bold balloon: plump strokes, finite, inside its reach", () => {
  for (const kind of KINDS_OF.currency) {
    const field = fieldOf(kind);
    // Grown by GLYPH_BOLD, no stroke is a wire: the thickest is well over its growth.
    assert.ok(field.thickness > 0.15 && field.peak > 0.2, `${kind} thickness ${field.thickness} peak ${field.peak}`);
    assert.ok(field.reach > 0.8 && field.reach < 1.4, `${kind} reach ${field.reach}`);
    for (const value of field.data) assert.ok(Number.isFinite(value), kind);
    assert.ok(field.data[1]! > 0 && field.data[(FIELD_SIZE * FIELD_SIZE - 1) * 4 + 1]! > 0, kind);
  }
});
