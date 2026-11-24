// What must hold of the bubbles' side of the agents (model/agents.ts), whatever the school does.
//   node --test components/screen/simulation/1/model/agents.test.ts

import assert from "node:assert/strict";
import test from "node:test";
import { AgentWorld, M9, PAGE_INTS, type AgentParameters } from "./agents.ts";

const START = { bubbles: 60, fish: 150, seed: 7, keywords: 3 };

/** Sixty bubbles in a ring, each touching the next; an audience of `crowd(bubble, time)` fish at each. */
function drive(world: AgentWorld, parameters: AgentParameters, seconds: number, crowd: (bubble: number, time: number) => number) {
  const size = () => world.state.size;
  const points = new Float64Array(2_000);
  const radii = new Float64Array(1_000);
  for (let time = 0; time < seconds; time += 0.05) {
    for (let bubble = 0; bubble < size(); bubble += 1) {
      const angle = (bubble / size()) * Math.PI * 2;
      points[bubble * 2] = 500 + Math.cos(angle) * 300;
      points[bubble * 2 + 1] = 500 + Math.sin(angle) * 300;
      radii[bubble] = (Math.PI * 300) / size();
      world.attend(bubble, crowd(bubble, time) * 0.05);
    }
    world.touch(0.05, points, radii);
    world.step(0.05, parameters);
    world.show(0.05);
  }
}

test("no keyword appears without a stroke", () => {
  const world = new AgentWorld(START);
  drive(world, { ...M9, mu: 0 }, 60, (bubble, time) => (Math.floor(time / 7 + bubble / 9) % 3 === 0 ? 6 : 0));
  assert.equal(world.keywords.length, 3);
  assert.ok(world.counts.signChanges > 0, "signs were copied");
});

test("a bubble that loses its fish takes its busiest neighbour's sign, once the sign has crossed", () => {
  const world = new AgentWorld(START);
  const rule = { ...M9, mu: 0, copy: 5 };
  // Bubble 10 holds a crowd, then loses it while bubble 11 keeps one.
  drive(world, rule, 12, (bubble) => (bubble === 10 || bubble === 11 ? 5 : 0));
  const wanted = world.sign[11];
  assert.notEqual(world.sign[10], wanted);
  drive(world, rule, 1.4, (bubble) => (bubble === 11 ? 5 : 0));
  assert.ok(world.couriers.some((courier) => courier.to === 10 && courier.from === 11), "its sign is on its way");
  assert.notEqual(world.sign[10], wanted, "not taken on before it arrives");
  drive(world, rule, 4, (bubble) => (bubble === 11 ? 5 : 0));
  assert.equal(world.sign[10], wanted);
});

test("zero sum: the displayed shares settle to a total of 1 whatever the audience; absolute: they follow the heat", () => {
  for (const zeroSum of [1, 0]) {
    const world = new AgentWorld(START);
    drive(world, { ...M9, zeroSum, capacity: 1e9 }, 40, (bubble) => (bubble < 6 ? 20 : 0));
    let total = 0;
    for (let bubble = 0; bubble < world.state.size; bubble += 1) total += world.shown[bubble]!;
    if (zeroSum) assert.ok(Math.abs(total - 1) < 0.02, `total ${total}`);
    else assert.ok(total > 0.5 && Math.abs(total - 1) > 0.05, `total ${total}`);
  }
});

test("a bubble over its capacity bursts: its heat is gone and the school is told", () => {
  const world = new AgentWorld(START);
  drive(world, { ...M9, capacity: 4 }, 10, (bubble) => (bubble === 20 ? 30 : 0));
  assert.ok(world.counts.bursts > 0);
  assert.ok(world.pageData[20 * PAGE_INTS + 2]! > 0);
});

test("a stroke lays bubbles of one new keyword, each its own shape; the same seed is the same world", () => {
  const signature = () => {
    const world = new AgentWorld(START);
    drive(world, M9, 5, (bubble) => (bubble % 5 === 0 ? 3 : 0));
    const keyword = world.beginStroke(10_000);
    const laid = [world.lay(keyword), world.lay(keyword), world.lay(keyword)];
    assert.equal(world.state.size, 63);
    assert.equal(new Set(laid.map((bubble) => world.sign[bubble!])).size, 3);
    for (const bubble of laid) assert.equal(world.keywordOf(bubble!), keyword);
    drive(world, M9, 10, (bubble) => (bubble % 5 === 0 ? 3 : 0));
    return Array.from(world.shown.subarray(0, world.state.size)).join(",") + Array.from(world.sign.subarray(0, world.state.size)).join(",");
  };
  assert.equal(signature(), signature());
});
