import assert from "node:assert/strict";
import test from "node:test";
import {
  addCandidate,
  addPage,
  computeRank,
  concentration,
  createRankedWeb,
  groupProfiles,
  DEFAULT_PARAMETERS,
  fadeCandidate,
  leader,
  MAX_CANDIDATES,
  MAX_PAGES,
  outWeight,
  setDamping,
  stepRankedWeb,
  type RankedWeb,
  type WebParameters,
} from "./model.ts";

function sum(web: RankedWeb) {
  let total = 0;
  for (let page = 0; page < web.size; page += 1) total += web.rank[page]!;
  return total;
}

/** Runs `seconds` of screen time at 60 steps per second. */
function run(web: RankedWeb, seconds: number, parameters: WebParameters = DEFAULT_PARAMETERS) {
  const pending = { value: 0 };
  for (let step = 0; step < seconds * 60; step += 1) stepRankedWeb(web, 1 / 60, parameters, pending);
}

test("rank satisfies the weighted PageRank equation and sums to 1", () => {
  const web = createRankedWeb();
  run(web, 5);
  assert.ok(Math.abs(sum(web) - 1) < 1e-9);
  const n = web.size;
  const d = web.damping;
  let dangling = 0;
  for (let i = 0; i < n; i += 1) if (outWeight(web, i) <= 1e-12) dangling += web.rank[i]!;
  for (let i = 0; i < n; i += 1) {
    let incoming = 0;
    for (let j = 0; j < n; j += 1) {
      const total = outWeight(web, j);
      if (total <= 1e-12) continue;
      for (const entry of web.out[j]!) if (entry.target === i) incoming += (web.rank[j]! * entry.weight) / total;
    }
    assert.ok(Math.abs(web.rank[i]! - ((1 - d) / n + d * incoming + (d * dangling) / n)) < 1e-7);
  }
});

test("a symmetric cycle ranks every page equally", () => {
  const web = createRankedWeb(6, 1);
  for (let page = 0; page < 6; page += 1) {
    web.out[page]!.length = 0;
    web.out[page]!.push({ target: (page + 1) % 6, weight: 1, fading: false });
  }
  computeRank(web);
  for (let page = 0; page < 6; page += 1) assert.ok(Math.abs(web.rank[page]! - 1 / 6) < 1e-9);
});

test("rank changes continuously: no page jumps by more than half a point per frame", () => {
  const web = createRankedWeb();
  const pending = { value: 0 };
  for (let step = 0; step < 60 * 60; step += 1) {
    const before = web.rank.slice(0, web.size);
    stepRankedWeb(web, 1 / 60, DEFAULT_PARAMETERS, pending);
    for (let page = 0; page < before.length; page += 1) {
      assert.ok(Math.abs(web.rank[page]! - before[page]!) < 0.005);
    }
  }
});

test("drifting quality keeps the leadership changing; frozen quality changes it less", () => {
  const leaderChanges = (volatility: number) => {
    const web = createRankedWeb();
    const pending = { value: 0 };
    let last = leader(web);
    let changes = 0;
    for (let step = 0; step < 60 * 120; step += 1) {
      stepRankedWeb(web, 1 / 60, { ...DEFAULT_PARAMETERS, volatility }, pending);
      if (step % 60 === 0) {
        const now = leader(web);
        if (now !== last) changes += 1;
        last = now;
      }
    }
    return changes;
  };
  const lively = leaderChanges(DEFAULT_PARAMETERS.volatility);
  assert.ok(lively >= 8);
  assert.ok(lively > leaderChanges(0));
});

test("attention following rank concentrates rank more than even attention", () => {
  const share = (floor: number) => {
    const web = createRankedWeb();
    run(web, 90, { ...DEFAULT_PARAMETERS, floor, volatility: 0.3 });
    return concentration(web).topTenth;
  };
  assert.ok(share(0.05) > share(20) + 0.05);
});

test("candidates enter at zero, fade out before removal, and stay bounded", () => {
  const web = createRankedWeb();
  run(web, 30);
  for (let page = 0; page < web.size; page += 1) {
    const list = web.out[page]!;
    assert.ok(list.filter((entry) => !entry.fading).length <= MAX_CANDIDATES);
    assert.equal(new Set(list.map((entry) => entry.target)).size, list.length);
    assert.ok(list.every((entry) => entry.target !== page && entry.weight >= 0));
  }
  const page = 3;
  const target = web.out[page]![0]!.target;
  const weight = web.out[page]![0]!.weight;
  fadeCandidate(web, page, target);
  stepRankedWeb(web, 1 / 60, DEFAULT_PARAMETERS);
  const fading = web.out[page]!.find((entry) => entry.target === target);
  assert.ok(fading && fading.weight < weight && fading.weight > 0);
  run(web, 20);
  assert.ok(!web.out[page]!.some((entry) => entry.target === target && entry.fading));
});

test("a hand-drawn link from the leader lifts a new page more than one from a minor page", () => {
  const lift = (fromLeader: boolean) => {
    const web = createRankedWeb();
    run(web, 10, { ...DEFAULT_PARAMETERS, growth: 0, volatility: 0 });
    const order = Array.from({ length: web.size }, (_, page) => page).sort((a, b) => web.rank[b]! - web.rank[a]!);
    const page = addPage(web)!;
    addCandidate(web, fromLeader ? order[0]! : order.at(-1)!, page, 0.5);
    computeRank(web);
    return web.rank[page]!;
  };
  assert.ok(lift(true) > lift(false) * 2);
});

test("growth and damping stay within bounds; replay is deterministic", () => {
  const web = createRankedWeb();
  // Fast enough to pass this route's 1,000-page cap within the run.
  run(web, 30, { ...DEFAULT_PARAMETERS, growth: 40 });
  assert.equal(web.size, MAX_PAGES);
  assert.equal(addPage(web), null);
  setDamping(web, 2);
  assert.equal(web.damping, 0.95);
  const first = createRankedWeb();
  const second = createRankedWeb();
  run(first, 10);
  run(second, 10);
  assert.deepEqual(first.rank, second.rank);
});

test("groups never link to one another automatically; one group is the original web", () => {
  const split = createRankedWeb(120, undefined, 3);
  const pending = { value: 0 };
  for (let step = 0; step < 300; step += 1) stepRankedWeb(split, 1 / 30, { ...DEFAULT_PARAMETERS, growth: 2 }, pending);
  assert.ok(split.size > 120);
  for (let page = 0; page < split.size; page += 1) {
    for (const entry of split.out[page]!) assert.equal(split.group[entry.target], split.group[page]);
  }
  const one = createRankedWeb(120, undefined, 1);
  const plain = createRankedWeb(120);
  assert.deepEqual(one.out, plain.out);
});

test("groups differ in size and character around the parameters; diversity 0 makes them alike", () => {
  const web = createRankedWeb(120, undefined, 4);
  const sizes = Array.from(web.groupSize.subarray(0, 4));
  assert.equal(sizes.reduce((sum, value) => sum + value, 0), 120);
  assert.ok(Math.max(...sizes) >= Math.min(...sizes) * 2, `sizes ${sizes.join(", ")}`);
  assert.equal(new Set(web.profiles.map((profile) => profile.floor.toFixed(3))).size, 4);
  const alike = createRankedWeb(120, undefined, 4, 0);
  assert.deepEqual(Array.from(alike.groupSize.subarray(0, 4)), [30, 30, 30, 30]);
  for (const profile of groupProfiles(3, 0, 7)) assert.deepEqual(profile, { share: 1, quality: 0, floor: 1, volatility: 1, adaptation: 1, discovery: 1 });
});
