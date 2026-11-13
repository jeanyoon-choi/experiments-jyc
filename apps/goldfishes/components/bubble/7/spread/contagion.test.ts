import assert from "node:assert/strict";
import test from "node:test";
import { createRankedWeb, MAX_PAGES } from "../web/model.ts";
import { Contagion, SPREAD_DEFAULTS } from "./contagion.ts";

/** A row of pages, each pressed against the next. */
function row(count: number) {
  const points = new Float64Array(MAX_PAGES * 2);
  const radii = new Float64Array(MAX_PAGES);
  for (let page = 0; page < count; page += 1) {
    points[page * 2] = page * 20;
    points[page * 2 + 1] = 0;
    radii[page] = 10;
  }
  return { points, radii };
}

function seeded() {
  let state = 7;
  return () => {
    state = (state * 16807) % 2147483647;
    return state / 2147483647;
  };
}

test("a newcomer's strain spreads step by step along the raft's contacts, its object with it", () => {
  const web = createRankedWeb(40, 3);
  const { points, radii } = row(40);
  const contagion = new Contagion();
  const random = seeded();
  const parameters = { ...SPREAD_DEFAULTS, route: 0 };
  contagion.step(0.016, web, points, radii, parameters, random);
  contagion.seed(0, 0, 5);
  const reached: number[] = [];
  for (let second = 1; second <= 60; second += 1) {
    for (let frame = 0; frame < 60; frame += 1) contagion.step(1 / 60, web, points, radii, parameters, random);
    let furthest = 0;
    for (let page = 0; page < 40; page += 1) if (contagion.strain[page] === 0) furthest = page;
    reached.push(furthest);
  }
  // Gradual: not the whole row at once, but further and further.
  assert.ok(reached[4]! < 10, `after 5 s: ${reached[4]}`);
  assert.ok(reached[59]! > reached[9]!, `after 10 s ${reached[9]}, 60 s ${reached[59]}`);
  for (let at = 1; at < reached.length; at += 1) assert.ok(reached[at]! >= reached[at - 1]!, "never retreats without 유지 시간");
  // A page that has fully taken it on carries the newcomer's object and its colour.
  assert.equal(contagion.caught[1], 5);
  assert.ok(contagion.tints[1 * 4 + 3]! > 0.99);
});

test("with 유지 시간 a strain fades again; without exposure nothing changes", () => {
  const web = createRankedWeb(10, 3);
  const { points, radii } = row(10);
  const contagion = new Contagion();
  const random = seeded();
  const parameters = { ...SPREAD_DEFAULTS, rate: 0, keep: 2 };
  contagion.step(0.016, web, points, radii, parameters, random);
  contagion.seed(4, 2, 1);
  for (let frame = 0; frame < 60 * 30; frame += 1) contagion.step(1 / 60, web, points, radii, parameters, random);
  for (let page = 0; page < 10; page += 1) assert.equal(contagion.strain[page], -1);
});

test("one colour brought in with two objects is two strains: neither turns the other's pages", () => {
  const web = createRankedWeb(10, 3);
  const { points, radii } = row(10);
  const contagion = new Contagion();
  const random = seeded();
  contagion.step(0.016, web, points, radii, SPREAD_DEFAULTS, random);
  contagion.seed(0, 0, 5);
  contagion.seed(9, 0, 8);
  contagion.step(1, web, points, radii, { ...SPREAD_DEFAULTS, rate: 0 }, random);
  assert.notEqual(contagion.strain[0], contagion.strain[9]);
  assert.equal(contagion.caught[0], 5);
  assert.equal(contagion.caught[9], 8);
  // The same pair again is the same strain.
  contagion.seed(4, 0, 5);
  assert.equal(contagion.strain[4], contagion.strain[0]);
});

test("a page taken from one strain by another eases between their colours, never through silver, and keeps its object until the new one's", () => {
  const web = createRankedWeb(2, 3);
  const { points, radii } = row(2);
  const contagion = new Contagion();
  const random = seeded();
  const quiet = { ...SPREAD_DEFAULTS, rate: 0 };
  contagion.step(0.016, web, points, radii, quiet, random);
  contagion.seed(0, 0, 5);
  for (let frame = 0; frame < 60 * 10; frame += 1) contagion.step(1 / 60, web, points, radii, quiet, random);
  assert.ok(contagion.tints[3]! > 0.99);
  // Taken over by teal with another object.
  contagion.seed(0, 1, 8);
  contagion.level[0] = 0;
  let lowest = 1;
  let previous = [...contagion.tints.subarray(0, 3)];
  let largestJump = 0;
  for (let frame = 0; frame < 60 * 10; frame += 1) {
    contagion.step(1 / 60, web, points, radii, quiet, random);
    lowest = Math.min(lowest, contagion.tints[3]!);
    const now = [...contagion.tints.subarray(0, 3)];
    largestJump = Math.max(largestJump, ...now.map((value, index) => Math.abs(value - previous[index]!)));
    previous = now;
    if (contagion.level[0]! < 0.5) assert.equal(contagion.caught[0], 5, "the old object stays until the new strain is half taken on");
  }
  assert.ok(lowest > 0.95, `amount never fell: ${lowest}`);
  assert.ok(largestJump < 0.05, `no jump in colour: ${largestJump}`);
  assert.equal(contagion.caught[0], 8);
});
