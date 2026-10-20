import assert from "node:assert/strict";
import test from "node:test";
import { distanceL1, iterate } from "./iteration.ts";
import { addPage, computeRank, createRankedWeb, DEFAULT_PARAMETERS, stepRankedWeb } from "./model.ts";

test("one step conserves a unit of mass, dangling pages included", () => {
  const web = createRankedWeb(60);
  addPage(web); // a page with no links: dangling
  const x = new Float64Array(web.size).fill(1 / web.size);
  const next = new Float64Array(web.size);
  for (let step = 0; step < 5; step += 1) {
    iterate(web, x, next);
    const mass = next.reduce((sum, value) => sum + value, 0);
    assert.ok(Math.abs(mass - 1) < 1e-12, `mass ${mass}`);
    x.set(next);
  }
});

test("repeated steps from uniform converge to the model's PageRank", () => {
  const web = createRankedWeb(100);
  const pending = { value: 0 };
  for (let step = 0; step < 300; step += 1) stepRankedWeb(web, 1 / 60, DEFAULT_PARAMETERS, pending);
  computeRank(web);
  let x = new Float64Array(web.size).fill(1 / web.size);
  let next = new Float64Array(web.size);
  for (let step = 0; step < 200; step += 1) {
    iterate(web, x, next);
    [x, next] = [next, x];
  }
  const error = distanceL1(x, web.rank, web.size);
  assert.ok(error < 1e-6, `L1 error ${error}`);
});

test("after a change the display reconverges, and a new page fills in from zero", () => {
  const web = createRankedWeb(80);
  let x = new Float64Array(200).fill(0);
  x.fill(1 / web.size, 0, web.size);
  let next = new Float64Array(200);
  for (let step = 0; step < 100; step += 1) {
    iterate(web, x, next);
    [x, next] = [next, x];
  }
  const page = addPage(web)!;
  web.out[page]!.push({ target: 0, weight: 1, fading: false });
  computeRank(web);
  assert.equal(x[page], 0);
  const before = distanceL1(x, web.rank, web.size);
  for (let step = 0; step < 100; step += 1) {
    iterate(web, x, next);
    [x, next] = [next, x];
  }
  assert.ok(x[page]! > 0);
  assert.ok(distanceL1(x, web.rank, web.size) < before * 1e-3);
});
