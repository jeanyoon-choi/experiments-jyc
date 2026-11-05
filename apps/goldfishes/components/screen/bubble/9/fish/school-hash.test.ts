// Pinned digests of deterministic school and web runs: refactors and
// optimisations of fish/ and web/ must leave every bit of their state as it was.
// A deliberate change of behaviour updates the digests (printed on failure).

import assert from "node:assert/strict";
import test from "node:test";
import { FISH_DEFAULTS, GoldfishSchool, type LifeContext } from "./goldfish.ts";
import { LIFE_DEFAULTS, type Rgb } from "./lifecycle.ts";
import { FISH_STRIDE, packFish } from "./school-thread.ts";
import { createRankedWeb, DEFAULT_PARAMETERS, stepRankedWeb } from "../web/model.ts";

const WIDTH = 1200;
const HEIGHT = 700;

/** FNV-1a over the bytes of `values`, folded into `hash`. */
function fold(hash: number, values: ArrayLike<number>) {
  const bytes = new Uint8Array(Float64Array.from(values).buffer);
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 16_777_619) >>> 0;
  return hash;
}

/** A pressed raft after travelling portions, one page swelling to crush fish now and then. */
function raft(count: number, time: number, bubbles: Float32Array, portions: number) {
  let at = 0;
  for (let portion = 0; portion < portions; portion += 1) {
    bubbles[at++] = 100 + ((time * 0.2 + portion / portions) % 1) * (WIDTH - 200);
    bubbles[at++] = 120 + portion * 40;
    bubbles[at++] = 6;
    bubbles[at++] = 0.5;
  }
  for (let page = 0; page < count; page += 1) {
    const r = 9 * Math.sqrt(page + 0.5);
    const a = page * 2.39996;
    bubbles[at++] = WIDTH / 2 + Math.cos(a) * r * 1.4 + Math.sin(time * 0.3) * 10;
    bubbles[at++] = HEIGHT / 2 + Math.sin(a) * r;
    bubbles[at++] = page === 3 ? 16 * (1 + 0.8 * Math.sin(time * 2)) : 7 + 10 * (((page * 37) % 10) / 10);
    bubbles[at++] = (page * 0.137) % 1;
  }
  return at / 4;
}

function schoolDigest(lifeOn: boolean) {
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
  const life: LifeContext = { parameters: { ...LIFE_DEFAULTS, enabled: lifeOn ? 1 : 0, lifespan: 4, crushDistance: 6, waveEvery: 1 }, colourOf: coat };
  const school = new GoldfishSchool(WIDTH, HEIGHT);
  const bubbles = new Float32Array((pages + portions) * 4);
  const contact = new Float64Array(pages);
  const state = new Float64Array(1_000 * FISH_STRIDE);
  let hash = 2_166_136_261;
  for (let frame = 0; frame < 60 * 8; frame += 1) {
    const count = raft(pages, frame / 60, bubbles, portions);
    if (frame === 200) school.notePages(100, 120);
    if (frame === 330) school.resize(WIDTH * 0.9, HEIGHT);
    school.setLife(life.parameters);
    school.setCount(frame < 240 ? 250 : 500);
    school.step(1 / 60, web, shown, bubbles, count, portions, pages, parameters, life);
    school.drainContact(pages, contact);
    hash = fold(hash, contact);
    hash = fold(hash, school.touches.subarray(0, school.touchCount * 3));
    if (frame % 30 === 29) {
      packFish(school.fish, state);
      hash = fold(hash, state.subarray(0, school.fish.length * FISH_STRIDE));
      hash = fold(hash, [school.fish.length, school.deaths.spent, school.deaths.crushed, school.deaths.shut, school.departed]);
    }
  }
  return hash.toString(16);
}

function webDigest() {
  const web = createRankedWeb();
  const pending = { value: 0 };
  let hash = 2_166_136_261;
  for (let step = 0; step < 60 * 20; step += 1) {
    stepRankedWeb(web, 1 / 60, { ...DEFAULT_PARAMETERS, growth: 12 }, pending);
    if (step % 60 === 59) {
      hash = fold(hash, web.rank.subarray(0, web.size));
      hash = fold(hash, web.quality.subarray(0, web.size));
      hash = fold(hash, [web.size]);
      for (let page = 0; page < web.size; page += 1) for (const link of web.out[page]!) hash = fold(hash, [page, link.target, link.weight]);
    }
  }
  return hash.toString(16);
}

test("the school's state, step by step, is pinned (lifecycle off)", () => {
  assert.equal(schoolDigest(false), "689abf41");
});

test("the school's state, step by step, is pinned (lifecycle on: deaths, crushes, waves)", () => {
  assert.equal(schoolDigest(true), "851b51c2");
});

test("the web's rank, quality and links, step by step, are pinned", () => {
  assert.equal(webDigest(), "adb1ecd7");
});
