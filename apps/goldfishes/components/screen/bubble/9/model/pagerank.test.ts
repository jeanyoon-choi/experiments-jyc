// The adapter is the web: stepped side by side with web/model.ts and web/iteration.ts called directly, as the frame
// loop and the raft call them, every bit of rank, quality, fatigue, the links and the displayed distribution agrees.

import assert from "node:assert/strict";
import test from "node:test";
import { PageRankWorld, type PageRankStart } from "./pagerank.ts";
import type { World } from "./world.ts";
import { iterate, outWeights, transit } from "../web/iteration.ts";
import {
  addCandidate,
  addPage,
  attend,
  candidate,
  concentration,
  createRankedWeb,
  DEFAULT_PARAMETERS,
  fadeCandidate,
  leader,
  MAX_PAGES,
  setDamping,
  stepRankedWeb,
  type RankedWeb,
  type WebParameters,
} from "../web/model.ts";

/** The bytes of the first `count` values. */
function bits(values: Float64Array | Uint8Array, count: number) {
  const part = values.subarray(0, count);
  return Buffer.from(part.buffer, part.byteOffset, part.byteLength);
}

function same(world: PageRankWorld, web: RankedWeb, shown: Float64Array, step: number) {
  const mine = world.web;
  assert.equal(mine.size, web.size, `size at step ${step}`);
  assert.equal(mine.randomState, web.randomState, `random stream at step ${step}`);
  for (const field of ["rank", "quality", "fatigue", "group"] as const) {
    assert.ok(bits(mine[field], web.size).equals(bits(web[field], web.size)), `${field} at step ${step}`);
  }
  assert.ok(bits(world.shown, MAX_PAGES).equals(bits(shown, MAX_PAGES)), `shown at step ${step}`);
  for (let page = 0; page < web.size; page += 1) {
    const a = mine.out[page]!;
    const b = web.out[page]!;
    assert.equal(a.length, b.length, `links of ${page} at step ${step}`);
    for (let index = 0; index < b.length; index += 1) {
      assert.equal(a[index]!.target, b[index]!.target);
      assert.ok(Object.is(a[index]!.weight, b[index]!.weight), `weight ${page}→${b[index]!.target} at step ${step}`);
      assert.equal(a[index]!.fading, b[index]!.fading);
    }
  }
}

function run(start: PageRankStart, steps: number, growth = 2) {
  const parameters: WebParameters = { ...DEFAULT_PARAMETERS, growth };
  // Through the contract wherever it reaches; the adapter's own for the rest (restart, d).
  const adapter = new PageRankWorld(start);
  const world: World<WebParameters> = adapter;

  let web = createRankedWeb(start.pages, start.seed, start.groups, start.diversity);
  setDamping(web, start.damping);
  let pending = { value: 0 };
  const shown = new Float64Array(MAX_PAGES);
  const stepped = new Float64Array(MAX_PAGES);
  const weights = new Float64Array(MAX_PAGES);
  shown.fill(1 / Math.max(1, web.size), 0, web.size);

  same(adapter, web, shown, -1);
  for (let step = 0; step < steps; step += 1) {
    const seconds = step % 5 === 0 ? 0.3 / 60 : 1 / 60;
    const fraction = Math.min(1, seconds / 1.1);

    const born = stepRankedWeb(web, seconds, parameters, pending);
    outWeights(web, weights);
    iterate(web, shown, stepped, weights);
    for (let page = 0; page < web.size; page += 1) shown[page] = shown[page]! + (stepped[page]! - shown[page]!) * fraction;

    assert.deepEqual(world.step(seconds, parameters), born, `events at step ${step}`);
    world.show(fraction);

    // Portions.
    for (let from = 0; from < web.size; from += 7) {
      for (const [index, entry] of web.out[from]!.entries()) {
        assert.ok(Object.is(world.flow(from, world.state.out[from]![index]!), transit(web, shown, from, entry.weight, weights[from]!)));
      }
    }
    assert.equal(world.carried, web.damping);

    // The school's watching.
    for (let page = step % 3; page < web.size; page += 11) {
      const amount = 0.004 * ((page * 7 + step) % 5);
      if (step % 2 === 0) {
        attend(web, page, amount, 0.8);
        world.attend(page, amount, 0.8);
      } else {
        attend(web, page, amount);
        world.attend(page, amount);
      }
    }

    // By hand: a page (linked, and a 전파 newcomer's quality), a link drawn, a link let go, d.
    if (step % 40 === 17) {
      const from = step % web.size;
      const group = web.group[from]!;
      const page = addPage(web, 0, group);
      assert.equal(world.add(group), page);
      if (page !== null) {
        assert.equal(world.relate(from, page, 0.5), addCandidate(web, from, page, 0.5));
        web.quality[page] = 1.5;
        world.setQuality(page, 1.5);
      }
    }
    if (step % 40 === 29) assert.equal(world.add(), addPage(web));
    if (step % 25 === 9) {
      const from = (step * 3) % web.size;
      const to = (step * 5 + 1) % web.size;
      const live = candidate(web, from, to);
      assert.equal(world.relation(from, to)?.weight, live?.weight);
      if (live && !live.fading) assert.equal(world.release(from, to), fadeCandidate(web, from, to));
      else assert.equal(world.relate(from, to, 0.5), addCandidate(web, from, to, 0.5));
      const first = web.out[from]![0];
      if (first) assert.equal(world.release(from, first.target), fadeCandidate(web, from, first.target));
    }
    if (step === 150) {
      setDamping(web, 0.7);
      adapter.setDamping(0.7);
    }
    if (step === 260) {
      const again = { ...start, pages: start.pages + 30, damping: 0.7 };
      web = createRankedWeb(again.pages, again.seed, again.groups, again.diversity);
      setDamping(web, again.damping);
      pending = { value: 0 };
      shown.fill(0);
      shown.fill(1 / Math.max(1, web.size), 0, web.size);
      const before = world.state;
      adapter.restart(again);
      assert.notEqual(world.state, before, "a restart is a new state");
    }

    same(adapter, web, shown, step);
    if (step % 60 === 59) assert.deepEqual(world.metrics(), { leader: leader(web), ...concentration(web) });
  }
  return web.size;
}

test("the PageRank adapter, stepped beside the web called directly, agrees to the bit", () => {
  assert.ok(run({ pages: 100, seed: 0x2545f491, groups: 2, diversity: 0.6, damping: 0.85 }, 480) > 100);
  assert.ok(run({ pages: 300, seed: 12_345, groups: 1, diversity: 0.6, damping: 0.6 }, 300) > 300);
  // At the cap: nothing more comes in, by itself or by hand.
  assert.equal(run({ pages: 960, seed: 99, groups: 4, diversity: 1, damping: 0.9 }, 300, 40), MAX_PAGES);
});
