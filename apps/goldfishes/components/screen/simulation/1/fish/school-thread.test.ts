import assert from "node:assert/strict";
import test from "node:test";
import { FISH_DEFAULTS, GoldfishSchool, MAX_FISH, type LifeContext } from "./goldfish.ts";
import { LIFE_DEFAULTS, type Rgb } from "./lifecycle.ts";
import { FISH_STRIDE, packFish, unpackFish } from "./school-core.ts";
import { SchoolThread } from "./school-thread.ts";
import { HEIGHT, raft, WIDTH } from "./test-raft.ts";
import { createRankedWeb } from "../web/model.ts";

test("packed fish read back exactly", () => {
  const school = new GoldfishSchool(WIDTH, HEIGHT);
  school.setLife(LIFE_DEFAULTS);
  school.setCount(30);
  school.fish[4]!.life.dying = true;
  school.fish[4]!.life.dyingTime = 0.25;
  school.fish[7]!.touching = true;
  const state = new Float64Array(30 * FISH_STRIDE);
  packFish(school.fish, state);
  const read: typeof school.fish = [];
  unpackFish(state, 30, read);
  assert.deepEqual(read, school.fish);
  // Fewer fish: the array shrinks, its objects reused.
  const first = read[0];
  unpackFish(state, 12, read);
  assert.equal(read.length, 12);
  assert.equal(read[0], first);
});

test("the school stepped through frames is the school stepped directly", () => {
  const pages = 120;
  const portions = 6;
  const web = createRankedWeb(pages);
  const shown = new Float64Array(pages);
  for (let page = 0; page < pages; page += 1) shown[page] = 1 / (page + 1);
  const parameters = { ...FISH_DEFAULTS, scale: 0.65, speed: 2.2, span: 0.5, schooling: 2, habituation: 1.75 };
  const coat = (bubble: number, out: Rgb) => {
    out[0] = (bubble % 7) / 7;
    out[1] = 0.3;
    out[2] = 0.9;
  };
  const life: LifeContext = { parameters: { ...LIFE_DEFAULTS, lifespan: 4, crushDistance: 6, waveEvery: 1 }, colourOf: coat };
  const direct = new GoldfishSchool(WIDTH, HEIGHT);
  const thread = new SchoolThread(WIDTH, HEIGHT, false);
  const bubbles = new Float32Array((pages + portions) * 4);
  const contactDirect = new Float64Array(pages);
  const contactThread = new Float64Array(pages);
  let touches = 0;
  for (let frame = 0; frame < 60 * 20; frame += 1) {
    const count = raft(pages, frame / 60, bubbles, portions);
    const fishCount = frame < 600 ? 300 : MAX_FISH;
    for (const school of [direct, thread]) {
      if (frame === 400) school.notePages(100, 120);
      school.setLife(life.parameters);
      school.setCount(fishCount);
      school.step(1 / 60, web, shown, bubbles, count, portions, pages, parameters, life);
    }
    direct.drainContact(pages, contactDirect);
    thread.drainContact(pages, contactThread);
    assert.deepEqual(contactThread, contactDirect);
    assert.equal(thread.touchCount, direct.touchCount);
    assert.deepEqual(thread.touches.subarray(0, thread.touchCount * 3), direct.touches.subarray(0, direct.touchCount * 3));
    touches += direct.touchCount;
  }
  assert.deepEqual(thread.fish, direct.fish);
  assert.deepEqual(thread.deaths, direct.deaths);
  assert.equal(thread.departed, direct.departed);
  // The comparison meant something: fish touched, died and were replaced.
  assert.ok(touches > 100, `${touches} touches`);
  assert.ok(direct.deaths.spent + direct.deaths.crushed > 10, JSON.stringify(direct.deaths));
  assert.ok(direct.fish.length > 900, `${direct.fish.length} fish`);
});
