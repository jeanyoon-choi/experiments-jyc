import assert from "node:assert/strict";
import test from "node:test";
import { createSlots, ingest, slotOf, snapshotSlots, tick, TUNING } from "./slots.mjs";

const contact = (fish, page, keyword = "gpu", rank = 0.5) => ({ fish, page, keyword, rank });

test("380 fish feed every one of 64 slots", () => {
  const runtime = createSlots();
  const fed = new Set();
  for (let fish = 0; fish < 380; fish += 1) fed.add(slotOf(runtime, fish));
  assert.equal(fed.size, TUNING.slots);
});

test("a touch becomes an item at once; a burst on one slot comes out one per dwell, none lost up to the queue", () => {
  const runtime = createSlots({ slots: 1 });
  ingest(runtime, { contacts: [contact(1, 0), contact(2, 1), contact(3, 2)] });
  assert.equal(tick(runtime, 0).items.length, 1);
  assert.equal(tick(runtime, TUNING.dwellMs / 2).items.length, 0);
  assert.equal(tick(runtime, TUNING.dwellMs).items[0].fish, 2);
  assert.equal(tick(runtime, TUNING.dwellMs * 2).items[0].fish, 3);
});

test("detaching and dying never darken a slot", () => {
  const runtime = createSlots({ slots: 1 });
  ingest(runtime, { contacts: [contact(1, 0)] });
  tick(runtime, 0);
  ingest(runtime, { detached: [1], departures: [1] });
  const { released, idle } = tick(runtime, 1_000);
  assert.deepEqual([released, idle], [[], []]);
  assert.equal(snapshotSlots(runtime)[0].attached, true);
});

test("history is capped and items have unique ids and seeds", () => {
  const runtime = createSlots({ slots: 1 });
  for (let step = 0; step < TUNING.history + 5; step += 1) {
    ingest(runtime, { contacts: [contact(step, step)] });
    tick(runtime, step * TUNING.dwellMs);
  }
  const { history } = snapshotSlots(runtime)[0];
  assert.equal(history.length, TUNING.history);
  assert.equal(new Set(history.map((item) => item.id)).size, history.length);
  assert.equal(new Set(history.map((item) => item.seed)).size, history.length);
});
