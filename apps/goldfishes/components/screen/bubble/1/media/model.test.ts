import assert from "node:assert/strict";
import test from "node:test";
import { createRankedWeb, DEFAULT_PARAMETERS, MAX_PAGES, stepRankedWeb } from "../web/model.ts";
import { assignPage, beginChange, bornLayer, createMediaField, follow, MEDIA_DEFAULTS, otherLayer, resetField, stepMedia } from "./model.ts";

function xorshift(seed: number) {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4_294_967_296;
  };
}

const STEP = 1 / 60;
const FIXED = { ...MEDIA_DEFAULTS, mode: "fixed" as const };

test("fixed: every page keeps the image it was born with", () => {
  const random = xorshift(7);
  const web = createRankedWeb(100);
  const field = createMediaField(MAX_PAGES);
  resetField(field, web.size, 294, 0, FIXED, random);
  const born = Array.from(field.layer.subarray(0, web.size));
  let time = 0;
  for (let step = 0; step < 900; step += 1) {
    time += STEP;
    stepRankedWeb(web, STEP, DEFAULT_PARAMETERS, { value: 0 });
    stepMedia(field, web, time, STEP, FIXED, random);
  }
  assert.deepEqual(Array.from(field.layer.subarray(0, 100)), born);
  assert.equal(field.changes, 0);
  for (let page = 0; page < web.size; page += 1) {
    assert.ok(field.layer[page]! >= 0 && field.layer[page]! < 294);
    assert.equal(field.layer[page], bornLayer(page, 294));
    assert.equal(field.blend[page], 0);
  }
});

test("otherLayer never returns the current layer and covers the rest", () => {
  const random = xorshift(3);
  const seen = new Set<number>();
  for (let i = 0; i < 2_000; i += 1) {
    const layer = otherLayer(4, 9, random);
    assert.notEqual(layer, 4);
    assert.ok(layer >= 0 && layer < 9);
    seen.add(layer);
  }
  assert.equal(seen.size, 8);
  assert.equal(otherLayer(0, 1, random), 0);
});

test("churn: pages change on their own clocks at about the set rate, each as a cross-fade", () => {
  const random = xorshift(11);
  const web = createRankedWeb(100);
  const field = createMediaField(MAX_PAGES);
  const parameters = { ...MEDIA_DEFAULTS, mode: "churn" as const, churnRate: 2, fade: 0.25 };
  resetField(field, web.size, 60, 0, parameters, random);
  let time = 0;
  let fading = 0;
  let frames = 0;
  for (let step = 0; step < 1_200; step += 1) {
    time += STEP;
    stepMedia(field, web, time, STEP, parameters, random);
    for (let page = 0; page < web.size; page += 1) {
      if (field.next[page] !== field.layer[page]) {
        fading += 1;
        assert.ok(field.blend[page]! >= 0 && field.blend[page]! < 1);
      }
      frames += 1;
    }
  }
  // 100 pages × 20 s × 2 per second = 4,000 changes, within jitter and the clock's granularity.
  assert.ok(field.changes > 2_800 && field.changes < 5_200, `changes ${field.changes}`);
  // Each change fades for 0.25 s of its ~0.5 s interval, so about half the page-frames are fading.
  assert.ok(fading / frames > 0.3 && fading / frames < 0.7, `fading share ${fading / frames}`);
});

test("a change under way is completed before the next begins; fade reaches the target", () => {
  const random = xorshift(5);
  const web = createRankedWeb(20);
  const field = createMediaField(MAX_PAGES);
  resetField(field, web.size, 10, 0, FIXED, random);
  const start = field.layer[0]!;
  assert.ok(beginChange(field, 0, (start + 1) % 10, 0));
  assert.equal(beginChange(field, 0, (start + 1) % 10, 0), false);
  stepMedia(field, web, 0.1, 0.1, FIXED, random);
  assert.ok(field.blend[0]! > 0.3 && field.blend[0]! < 0.5);
  assert.ok(beginChange(field, 0, (start + 2) % 10, 0.1));
  assert.equal(field.layer[0], (start + 1) % 10);
  assert.equal(field.next[0], (start + 2) % 10);
  assert.equal(field.blend[0], 0);
  stepMedia(field, web, 0.5, 0.4, FIXED, random);
  assert.equal(field.layer[0], (start + 2) % 10);
  assert.equal(field.blend[0], 0);
});

test("trend: a group's new image runs out along the links, and the other group keeps its own", () => {
  const random = xorshift(23);
  const web = createRankedWeb(160, 0x2545f491, 2, 0.6);
  // A minute of life first, so rank has gathered into hubs as it does on screen.
  for (let step = 0; step < 60 * 60; step += 1) stepRankedWeb(web, STEP, { ...DEFAULT_PARAMETERS, growth: 0 }, { value: 0 });
  const field = createMediaField(MAX_PAGES);
  // Leaders are changed by hand below, so no automatic trend interrupts the wave.
  const parameters = { ...MEDIA_DEFAULTS, mode: "trend" as const, trendInterval: 1e9, follow: 0.6, fade: 0.25 };
  resetField(field, web.size, 294, 0, parameters, random);
  let leader = 0;
  for (let page = 1; page < web.size; page += 1) if (web.rank[page]! > web.rank[leader]!) leader = page;
  const group = web.group[leader]!;
  // An image nobody was born with.
  const held = new Set(Array.from(field.layer.subarray(0, web.size)));
  let trend = 293;
  while (held.has(trend)) trend -= 1;
  beginChange(field, leader, trend, 0);
  // Portions arrive as in the route: each link on its own period in [1.3, 3.2] s,
  // taken in at phase 0.62 of its cycle.
  const period = (from: number, to: number) => 1.3 + 1.9 * (Math.abs(Math.sin(from * 12.9898 + to * 78.233) * 43_758.5453) % 1);
  const phase = (from: number, to: number) => Math.abs(Math.sin(to * 12.9898 + from * 78.233) * 43_758.5453) % 1;
  let time = 0;
  for (let step = 0; step < 60 * 30; step += 1) {
    const before = time;
    time += STEP;
    stepRankedWeb(web, STEP, { ...DEFAULT_PARAMETERS, growth: 0 }, { value: 0 });
    for (let from = 0; from < web.size; from += 1) {
      for (const entry of web.out[from]!) {
        const p = period(from, entry.target);
        const cycleBefore = (before / p + phase(from, entry.target)) % 1;
        const cycleNow = (time / p + phase(from, entry.target)) % 1;
        const crossed = cycleBefore < 0.62 && cycleNow >= 0.62;
        if (crossed) follow(field, web, from, entry.target, time, parameters, random);
      }
    }
    stepMedia(field, web, time, STEP, parameters, random);
  }
  let own = 0;
  let ownSize = 0;
  let other = 0;
  let otherSize = 0;
  for (let page = 0; page < web.size; page += 1) {
    const adopted = field.next[page] === trend ? 1 : 0;
    if (web.group[page] === group) {
      own += adopted;
      ownSize += 1;
    } else {
      other += adopted;
      otherSize += 1;
    }
  }
  assert.ok(own / ownSize > 0.5, `own group adopted ${own}/${ownSize}`);
  assert.ok(other / otherSize < 0.2, `other group adopted ${other}/${otherSize}`);
});

test("trend: follow copies the receiver only in trend mode and only with its probability", () => {
  const web = createRankedWeb(20);
  const field = createMediaField(MAX_PAGES);
  resetField(field, web.size, 10, 0, MEDIA_DEFAULTS, () => 0.5);
  field.layer[1] = 7;
  field.next[1] = 7;
  assert.equal(follow(field, web, 0, 1, 1, FIXED, () => 0), false);
  const trend = { ...MEDIA_DEFAULTS, mode: "trend" as const, follow: 0.5 };
  // Page 1 outranks page 0 twice over: the full probability applies.
  web.rank[0] = 0.01;
  web.rank[1] = 0.02;
  assert.equal(follow(field, web, 0, 1, 1, trend, () => 0.9), false);
  assert.equal(follow(field, web, 0, 1, 1, trend, () => 0.1), true);
  assert.equal(field.next[0], 7);
  // Nobody copies a page that does not outrank it.
  field.layer[2] = 3;
  field.next[2] = 3;
  web.rank[2] = 0.01;
  assert.equal(follow(field, web, 0, 2, 2, trend, () => 0), false);
});

test("new pages take their born image; a surface change re-deals every page", () => {
  const random = xorshift(2);
  const field = createMediaField(MAX_PAGES);
  resetField(field, 50, 20, 0, MEDIA_DEFAULTS, random);
  assignPage(field, 50, 1, MEDIA_DEFAULTS, random);
  assert.equal(field.layer[50], bornLayer(50, 20));
  resetField(field, 51, 36, 2, MEDIA_DEFAULTS, random);
  for (let page = 0; page < 51; page += 1) assert.equal(field.layer[page], bornLayer(page, 36));
  assert.equal(field.layers, 36);
});
