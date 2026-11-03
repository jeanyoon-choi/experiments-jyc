import assert from "node:assert/strict";
import test from "node:test";
import { FISH_DEFAULTS, GoldfishSchool, type LifeContext } from "./goldfish.ts";
import { createLife, greyness, LIFE_DEFAULTS, lifeColour, stepLife, type Rgb } from "./lifecycle.ts";
import { createRankedWeb } from "../web/model.ts";

const RED: Rgb = [0.8, 0.05, 0.05];

test("watching wears a fish down at its lifespan; swimming about, by idleWear of that", () => {
  const parameters = { ...LIFE_DEFAULTS, lifespan: 10, idleWear: 0.2, spread: 0 };
  const watcher = createLife(parameters, 0.5);
  const swimmer = createLife(parameters, 0.5);
  for (let step = 0; step < 50; step += 1) {
    stepLife(watcher, 0.1, RED, parameters);
    stepLife(swimmer, 0.1, null, parameters);
  }
  assert.ok(Math.abs(watcher.vitality - 0.5) < 1e-9);
  assert.ok(Math.abs(swimmer.vitality - 0.9) < 1e-9);
  let died = false;
  for (let step = 0; step < 60 && !died; step += 1) died = stepLife(watcher, 0.1, RED, parameters);
  assert.ok(died && watcher.dying && watcher.vitality === 0);
});

test("a fish takes on what it watches, then greys as its strength fails", () => {
  const parameters = { ...LIFE_DEFAULTS, lifespan: 100, spread: 0, tintRate: 2, fadeAt: 0.3 };
  const life = createLife(parameters, 0.5);
  const out: Rgb = [0, 0, 0];
  const own: Rgb = [1, 0.5, 0];
  const grey: Rgb = [0.6, 0.6, 0.6];
  assert.deepEqual(lifeColour(life, parameters, own, grey, out), own);
  for (let step = 0; step < 30; step += 1) stepLife(life, 0.1, RED, parameters);
  lifeColour(life, parameters, own, grey, out);
  // Mostly red now; fresh enough not to be grey.
  assert.ok(out[0] > 0.75 && out[1] < 0.15 && greyness(life, parameters) === 0);
  life.vitality = 0.15;
  assert.ok(Math.abs(greyness(life, parameters) - 0.5) < 1e-9);
  life.vitality = 0;
  assert.equal(greyness(life, parameters), 1);
  assert.deepEqual(lifeColour(life, parameters, own, grey, out), grey);
});

test("off, nobody wears down", () => {
  const parameters = { ...LIFE_DEFAULTS, enabled: 0, lifespan: 1 };
  const life = createLife(parameters, 0.5);
  for (let step = 0; step < 100; step += 1) assert.equal(stepLife(life, 0.1, RED, parameters), false);
  assert.equal(life.vitality, 1);
});

test("the spent sink off the bottom of the screen, and a wave brings as many back from the edges", () => {
  const width = 600;
  const height = 300;
  const web = createRankedWeb(4);
  const shown = new Float64Array(4).fill(0.25);
  const bubbles = new Float32Array(16);
  const school = new GoldfishSchool(width, height);
  // No pages to watch: they wear down by swimming alone, fast.
  const context: LifeContext = {
    parameters: { ...LIFE_DEFAULTS, lifespan: 1, idleWear: 1, spread: 0, sinkSpeed: 120, waveEvery: 2 },
    colourOf: (_bubble, out) => {
      out[0] = 1;
      out[1] = 0;
      out[2] = 0;
    },
  };
  school.setLife(context.parameters);
  school.setCount(20);
  let sawSinking = false;
  let fewest = 20;
  for (let step = 0; step < 24 * 12; step += 1) {
    school.setCount(20);
    school.step(1 / 24, web, shown, bubbles, 0, 0, 0, FISH_DEFAULTS, context);
    if (school.fish.some((fish) => fish.life.dying)) sawSinking = true;
    fewest = Math.min(fewest, school.fish.length);
    // Once its glide has died away, a sinking fish only moves down the screen.
    for (const fish of school.fish) if (fish.life.dying && fish.life.dyingTime > 3) assert.ok(fish.vy > 0);
  }
  assert.ok(sawSinking, "some fish were spent and sank");
  assert.ok(school.departed > 0, "some sank off the screen");
  assert.ok(fewest < 20, "the school thinned between waves");
  // Waves keep it from emptying: it is never short by more than those gone since the last one.
  assert.ok(school.fish.length > 0 && school.fish.length <= 20);
});

test("a fish thrown far in one step by a swelling bubble dies there; the dead do not pass through bubbles", () => {
  const web = createRankedWeb(1);
  const shown = new Float64Array(1).fill(1);
  const school = new GoldfishSchool(600, 600);
  const context: LifeContext = {
    parameters: { ...LIFE_DEFAULTS, lifespan: 1_000, idleWear: 0, crushDistance: 12, sinkSpeed: 90 },
    colourOf: (_bubble, out) => {
      out[0] = 1;
      out[1] = 0;
      out[2] = 0;
    },
  };
  school.setLife(context.parameters);
  school.setCount(1);
  const fish = school.fish[0]!;
  // One bubble in the middle; the fish just beside it.
  const bubbles = new Float32Array([300, 300, 40, 0.3]);
  fish.x = 300;
  fish.y = 300 - 40 - 20;
  fish.vx = 0;
  fish.vy = 0;
  school.step(1 / 60, web, shown, bubbles, 1, 0, 1, FISH_DEFAULTS, context);
  assert.equal(fish.life.dying, false);
  // The bubble swells by 60 px at once: the fish is thrown out and killed.
  bubbles[2] = 100;
  school.step(1 / 60, web, shown, bubbles, 1, 0, 1, FISH_DEFAULTS, context);
  assert.equal(fish.life.dying, true);
  // Falling, it never ends inside the bubble.
  for (let step = 0; step < 600; step += 1) {
    school.step(1 / 60, web, shown, bubbles, 1, 0, 1, FISH_DEFAULTS, context);
    if (!school.fish.includes(fish)) break;
    assert.ok(Math.hypot(fish.x - 300, fish.y - 300) >= 100 - 0.5);
  }
  assert.ok(!school.fish.includes(fish), "it fell off the bottom of the screen");
});

test("fish, living or dead, do not overlap one another", () => {
  const web = createRankedWeb(1);
  const shown = new Float64Array(1).fill(1);
  const school = new GoldfishSchool(400, 400);
  const off = { ...LIFE_DEFAULTS, enabled: 0 };
  school.setLife(off);
  school.setCount(12);
  // All piled on one spot, one of them dead.
  school.fish.forEach((fish, index) => {
    fish.x = 200 + (index % 3) * 0.5;
    fish.y = 200 + Math.floor(index / 3) * 0.5;
    fish.facing = index * 0.7;
  });
  school.fish[0]!.life.dying = true;
  const bubbles = new Float32Array(4);
  for (let step = 0; step < 30; step += 1) school.step(1 / 60, web, shown, bubbles, 0, 0, 0, { ...FISH_DEFAULTS, schooling: 0 }, { parameters: off, colourOf: () => {} });
  // Centres of any two are at least the body's width apart (capsules 3.6 × 0.7 wide each way).
  const fish = school.fish.filter((one) => one.y < 400);
  for (let a = 0; a < fish.length; a += 1) {
    for (let b = a + 1; b < fish.length; b += 1) {
      assert.ok(Math.hypot(fish[a]!.x - fish[b]!.x, fish[a]!.y - fish[b]!.y) > 2 * 3.6 * 0.7 * 0.8);
    }
  }
});
