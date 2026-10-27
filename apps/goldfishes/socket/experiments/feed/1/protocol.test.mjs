import assert from "node:assert/strict";
import test from "node:test";
import { events, limits, normalizePush, normalizeSnapshot, normalizeVocabulary } from "./protocol.mjs";

const item = (fields = {}) => ({ id: 1, slot: 0, fish: 3, page: 2, keyword: "gpu", rank: 0.5, seed: 9, at: 0, ...fields });

test("every event carries the version's prefix", () => {
  for (const name of Object.values(events)) assert.ok(name.startsWith("goldfishes-feed-1:"), name);
});

test("vocabulary keeps valid, unique keywords and falls back to the id as label", () => {
  assert.deepEqual(normalizeVocabulary([{ id: "gpu", label: "GPU", set: "tech" }, { id: "gpu" }, { id: "bad id" }, { id: "cloud" }, null]), [
    { id: "gpu", label: "GPU", set: "tech" },
    { id: "cloud", label: "cloud", set: "" },
  ]);
});

test("a push keeps valid items and slots only, rank clamped", () => {
  const push = normalizePush({ items: [item({ rank: 3 }), item({ slot: -1 }), item({ keyword: "" }), item({ slot: limits.slots })], released: [1, "2", -1], idle: [4] });
  assert.deepEqual(push, { items: [item({ rank: 1 })], released: [1], idle: [4] });
});

test("a snapshot keeps its slots and their valid history", () => {
  const snapshot = normalizeSnapshot({ vocabulary: [{ id: "gpu" }], slots: [{ slot: 0, fish: 3, attached: true, history: [item(), { id: "x" }] }, { slot: "y" }] });
  assert.equal(snapshot.slots.length, 1);
  assert.equal(snapshot.slots[0].history.length, 1);
  assert.equal(snapshot.slots[0].attached, true);
  assert.equal(snapshot.vocabulary[0].id, "gpu");
});
