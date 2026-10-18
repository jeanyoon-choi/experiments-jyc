import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { CELL, CELL_PROPERTIES, EDGE, RAW, ROOT, TEXT, UI, property } from "./marks.ts";

const sheet = readFileSync(new URL("./drawing/sheet.css", import.meta.url), "utf8");

test("the hiding sheet knows every attribute the renderer writes", () => {
  for (const name of [ROOT, UI, CELL, RAW, TEXT]) assert.ok(sheet.includes(`[${name}`), name);
});

test("the hiding sheet reads every custom property a cell is written as", () => {
  assert.ok(sheet.includes(`var(${EDGE}`), EDGE);
  for (const name of CELL_PROPERTIES) {
    assert.ok(sheet.includes(`var(${property(name)}`), property(name));
    assert.ok(sheet.includes(`@property ${property(name)}`), `${property(name)} registered as non-inherited`);
  }
});
