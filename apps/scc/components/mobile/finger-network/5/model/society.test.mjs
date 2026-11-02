import assert from "node:assert/strict";
import test from "node:test";
import { ACT_SECONDS, ADULT_AGE, DEFAULT_SOCIETY, SECONDS_PER_YEAR, addAgent, compatibility, createSociety, partnerOf, related, stepSociety } from "./society.ts";

const bounds = { width: 390, height: 800 };
const crowd = (seed, count, trait = (index) => (index * 47) % 360) => {
  const society = createSociety(seed);
  for (let index = 0; index < count; index += 1) {
    addAgent(society, { x: 40 + ((index * 67) % 310), y: 80 + ((index * 131) % 640), trait: trait(index), age: 20 + (index % 15) });
  }
  return society;
};
const run = (society, seconds, parameters = DEFAULT_SOCIETY) => {
  const kinds = { union: 0, split: 0, betrayal: 0, birth: 0, death: 0 };
  for (let t = 0; t < seconds * 60; t += 1) {
    const before = society.time;
    stepSociety(society, 1 / 60, bounds, parameters);
    for (const event of society.events) {
      if (event.time <= before) continue;
      kinds[event.kind] += 1;
      if (event.kind === "split" && event.betrayal) kinds.betrayal += 1;
    }
  }
  return kinds;
};
const snapshot = (society) => society.agents.map((a) => [a.id, Math.round(a.x * 100), Math.round(a.y * 100), Math.round(a.trait), a.partner]);

test("same seed replays the same society", () => {
  const a = crowd(7, 20);
  const b = crowd(7, 20);
  run(a, 30);
  run(b, 30);
  assert.deepEqual(snapshot(a), snapshot(b));
});

test("partnerships are mutual, monogamous, between living adults, and never parent and child", () => {
  const society = crowd(11, 24);
  for (let second = 0; second < 90; second += 1) {
    run(society, 1);
    for (const agent of society.agents) {
      const partner = partnerOf(society, agent);
      if (!partner) continue;
      assert.equal(partner.partner, agent.id);
      assert.ok(agent.diedAt === null && partner.diedAt === null);
      assert.ok(agent.age >= ADULT_AGE && partner.age >= ADULT_AGE);
      assert.ok(!related(agent, partner));
    }
    for (const agent of society.agents) {
      assert.ok(Number.isFinite(agent.x) && agent.x > -60 && agent.x < bounds.width + 60);
      assert.ok(Number.isFinite(agent.y) && agent.y > -60 && agent.y < bounds.height + 60);
    }
  }
});

test("over a few generations people pair, part, cheat, have children, and die", () => {
  const society = crowd(5, 20);
  const seen = run(society, 120);
  for (const kind of ["union", "split", "betrayal", "birth", "death"]) assert.ok(seen[kind] > 0, `${kind}: ${JSON.stringify(seen)}`);
  const living = society.agents.filter((a) => a.diedAt === null);
  assert.ok(living.some((a) => a.parents.length === 2), "children were born into the society");
});

test("children inherit a blend of their parents' traits", () => {
  const society = crowd(9, 16, () => 120);
  run(society, 40, { ...DEFAULT_SOCIETY, mortalityBase: 0 });
  const children = society.agents.filter((a) => a.parents.length === 2);
  assert.ok(children.length > 0);
  for (const child of children) assert.ok(compatibility(child, { trait: 120 }) > 0.7);
});

test("a single loses pickiness with time; nobody old lives forever", () => {
  const society = createSociety(2);
  const loner = addAgent(society, { x: 100, y: 100, trait: 0, age: 30 });
  const start = loner.pickiness;
  run(society, 10 * SECONDS_PER_YEAR, { ...DEFAULT_SOCIETY, mortalityBase: 0 });
  assert.ok(loner.pickiness < start);
  const elder = addAgent(society, { x: 200, y: 400, trait: 0, age: 95 });
  run(society, 30 * SECONDS_PER_YEAR);
  assert.notEqual(elder.diedAt, null);
});

test("no population upper bound: touches past the old 120 cap all stay alive", () => {
  const society = crowd(4, 200);
  assert.equal(society.agents.filter((a) => a.diedAt === null).length, 200);
});

test("a child is born one year after its parents lie down together; partings slap once each; kisses land", () => {
  const society = crowd(5, 20);
  const lay = new Map();
  const slaps = [];
  const kisses = [];
  const births = [];
  for (let step = 0; step < 120 * 60; step += 1) {
    stepSociety(society, 1 / 60, bounds);
    for (const agent of society.agents) if (agent.act?.kind === "lie" && agent.act.lead && !lay.has(`${agent.id}:${agent.act.from}`)) lay.set(`${agent.id}:${agent.act.from}`, { id: agent.id, from: agent.act.from });
    for (const event of society.events) {
      if (event.time !== society.time) continue;
      if (event.kind === "slap") slaps.push(event);
      if (event.kind === "kiss") kisses.push(event);
      if (event.kind === "birth") births.push(event);
    }
  }
  assert.ok(births.length > 0 && kisses.length > 0 && slaps.length > 0, JSON.stringify({ births: births.length, kisses: kisses.length, slaps: slaps.length }));
  const lies = [...lay.values()];
  for (const birth of births) {
    const child = society.byId.get(birth.child);
    if (!child) continue;
    const lie = lies.filter((entry) => child.parents[0] === entry.id && entry.from < birth.time).at(-1);
    assert.ok(lie, "every birth follows a lie-down");
    const wait = birth.time - (lie.from + ACT_SECONDS.lie);
    assert.ok(Math.abs(wait - SECONDS_PER_YEAR) < 0.05, `born ${wait.toFixed(2)} s after getting up`);
  }
  // Slaps come in pairs: the second returns the first.
  const pairs = new Map();
  for (const slap of slaps) pairs.set([slap.hitter, slap.victim].sort().join(), [...(pairs.get([slap.hitter, slap.victim].sort().join()) ?? []), slap]);
  for (const list of pairs.values()) {
    for (let index = 0; index + 1 < list.length; index += 2) assert.equal(list[index + 1].hitter, list[index].victim);
  }
});
