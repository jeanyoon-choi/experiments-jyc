import assert from "node:assert/strict";
import test from "node:test";
import { Meter, shares } from "./measure.ts";
import { createWorld, keywordOf, line, M9, PRESETS, step, stroke, type World } from "./model.ts";

function run(world: World, seconds: number, meter?: Meter) {
  for (let time = 0; time < seconds - 1e-9; time += 0.05) {
    step(world, 0.05);
    meter?.after(world, 0.05);
  }
}

/** A short fingerprint of a world's state. */
function digest(world: World) {
  let sum = world.fish.length * 31 + world.bubbles.length * 17 + world.bursts;
  for (const bubble of world.bubbles) sum += bubble.x * 3 + bubble.y * 5 + bubble.heat + bubble.sign * 0.01;
  for (const fish of world.fish) sum += fish.x + fish.y * 7;
  return sum;
}

test("the same seed gives the same world; another seed another", () => {
  const a = createWorld(M9, 5);
  const b = createWorld(M9, 5);
  const c = createWorld(M9, 6);
  for (const world of [a, b, c]) {
    run(world, 10);
    stroke(world, line([0.4, 0.4], [0.6, 0.6]));
    run(world, 10);
  }
  assert.equal(digest(a), digest(b));
  assert.notEqual(digest(a), digest(c));
});

test("with no stroke nothing new appears: the keywords stay the ones it opened on", () => {
  // mu only acts when a copy happens, and a copy never makes a keyword out of nothing.
  const world = createWorld({ ...M9, mu: 0 }, 3);
  run(world, 120);
  assert.equal(world.keywords.length, M9.keywords);
  for (const bubble of world.bubbles) assert.ok(world.opening.includes(keywordOf(world, bubble)));
});

test("with no stroke the screen is mostly still, and bored fish leave", () => {
  const world = createWorld(M9, 11);
  const meter = new Meter();
  run(world, 180, meter);
  const still = shares(meter.samples.filter((sample) => sample.time > 30))["안정"] ?? 0;
  assert.ok(still > 0.85, `still ${still}`);
  assert.ok(world.fish.length < M9.fish / 2, `fish ${world.fish.length}`);
});

test("a stroke brings one keyword, its bubbles and its fish", () => {
  const world = createWorld(M9, 7);
  run(world, 5);
  const fish = world.fish.length;
  const bubbles = world.bubbles.length;
  const points = line([0.38, 0.5], [0.62, 0.5]);
  const keyword = stroke(world, points);
  assert.equal(world.bubbles.length, bubbles + points.length);
  assert.equal(world.fish.length, fish + M9.join);
  assert.equal(world.keywords[keyword]!.parent, null);
  // Each bubble of the stroke is its own shape of the one keyword.
  const laid = world.bubbles.slice(bubbles);
  assert.equal(new Set(laid.map((bubble) => bubble.sign)).size, points.length);
  for (const bubble of laid) assert.equal(keywordOf(world, bubble), keyword);
});

test("a stroke's keyword spreads from bubble to bubble", () => {
  const world = createWorld(M9, 11);
  run(world, 30);
  const before = world.bubbles.length;
  const keyword = stroke(world, line([0.38, 0.5], [0.62, 0.5]));
  run(world, 40);
  const carrying = world.bubbles.slice(0, before).filter((bubble) => keywordOf(world, bubble) === keyword).length;
  assert.ok(carrying > 0, "no bubble that was there before took the new keyword");
});

test("a fish only ever goes to a bubble its own bubble saw", () => {
  const world = createWorld(M9, 13);
  stroke(world, line([0.4, 0.45], [0.6, 0.55]));
  for (let time = 0; time < 30; time += 0.05) {
    const was = new Map(world.fish.map((fish) => [fish, { at: fish.at, saw: new Set(fish.at.neighbours) }]));
    const bursts = world.bursts;
    step(world, 0.05);
    // A burst throws its fish to a neighbour too, but the neighbours are found again after it: skip those steps.
    if (world.bursts !== bursts) continue;
    for (const fish of world.fish) {
      const before = was.get(fish);
      if (!before || fish.at === before.at) continue;
      assert.ok(before.saw.has(fish.at), "a fish jumped to a bubble out of its view");
    }
  }
});

test("a closed audience keeps its number (M8.2)", () => {
  const world = createWorld(PRESETS["M8.2"], 4);
  stroke(world, line([0.4, 0.5], [0.6, 0.5]));
  run(world, 60);
  assert.equal(world.fish.length, PRESETS["M8.2"].fish);
});

test("M8's conditions never rest; M9's do (the document's finding)", () => {
  const stillOf = (name: "M8" | "M9") => {
    const world = createWorld(PRESETS[name], 23);
    const meter = new Meter();
    run(world, 120, meter);
    return shares(meter.samples.filter((sample) => sample.time > 30))["안정"] ?? 0;
  };
  assert.ok(stillOf("M8") < 0.5);
  assert.ok(stillOf("M9") > 0.85);
});
