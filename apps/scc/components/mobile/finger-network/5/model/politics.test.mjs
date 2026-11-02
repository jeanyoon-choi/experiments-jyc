import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_POLITICS, addCitizen, createPolitics, foundPolitics, heightOf, measurePolitics, opinionAt, stepPolitics } from "./politics.ts";

const bounds = { width: 390, height: 800 };
const pure = { controversyFeedback: 0, issueRate: 0, avoidanceLearning: 0, turnover: 0, reactance: 0, crossExposure: 0 };
const landscape = (seed, override = {}) => {
  const parameters = { ...DEFAULT_POLITICS, ...override };
  const politics = createPolitics(seed, parameters);
  foundPolitics(politics, bounds, parameters);
  return { politics, parameters };
};
const run = ({ politics, parameters }, seconds) => {
  while (politics.time < seconds) stepPolitics(politics, 1 / 60, bounds, parameters);
  return measurePolitics(politics, parameters);
};

test("height and conviction map onto each other, 상파 at the top, strong convictions inside the screen", () => {
  assert.ok(Math.abs(opinionAt(heightOf(2, bounds), bounds) - 2) < 1e-9);
  assert.ok(heightOf(5, bounds) < heightOf(-5, bounds));
  assert.ok(heightOf(1e6, bounds) > 0 && heightOf(-1e6, bounds) < bounds.height);
});

test("same seed replays the same landscape", () => {
  const snapshot = ({ politics }) => politics.citizens.map((c) => [c.id, Math.round(c.x * 100), Math.round(c.opinion * 1e4)]);
  const a = landscape(3);
  const b = landscape(3);
  run(a, 20);
  run(b, 20);
  assert.deepEqual(snapshot(a), snapshot(b));
});

// The three phases of Baumann et al. (2020), reproduced by the core rule without the adaptive layers.
test("weak controversy relaxes everyone to neutral consensus", () => {
  const m = run(landscape(1, { ...pure, baseControversy: 0.04 }), 60);
  assert.ok(m.neutral > 0.95 && m.polarization < 0.05, JSON.stringify(m));
});

test("strong controversy without homophily radicalizes the whole society to one side", () => {
  const m = run(landscape(1, { ...pure, baseControversy: 3, temperamentLow: 0, temperamentHigh: 0 }), 60);
  assert.ok(Math.max(m.upper, m.lower) > 0.8 && Math.min(m.upper, m.lower) < 0.05, JSON.stringify(m));
});

test("strong controversy with homophily splits it into two camps that mostly hear themselves", () => {
  const m = run(landscape(1, { ...pure, baseControversy: 3, temperamentLow: 3, temperamentHigh: 3 }), 60);
  assert.ok(m.upper > 0.2 && m.lower > 0.2 && m.echo > 0.9, JSON.stringify(m));
});

test("in the full model both camps survive, keep shifting, and controversy follows polarization", () => {
  const model = landscape(1);
  const samples = [];
  for (const t of [30, 60, 90, 120, 150, 180]) samples.push({ ...run(model, t), controversy: model.politics.controversy });
  assert.ok(samples.every((m) => m.upper > 0.1 && m.lower > 0.1), JSON.stringify(samples));
  const uppers = samples.map((m) => m.upper);
  assert.ok(Math.max(...uppers) - Math.min(...uppers) > 0.05, `camp sizes did not move: ${uppers}`);
  assert.ok(samples.every((m) => m.controversy > DEFAULT_POLITICS.baseControversy), "polarization raises controversy");
});

test("meeting convinced opponents teaches avoidance, which relaxes back to temperament", () => {
  const politics = createPolitics(4);
  const parameters = { ...DEFAULT_POLITICS, ...pure, avoidanceLearning: 0.5, crossExposure: 1, activationRate: 1e5 };
  const me = addCitizen(politics, { x: 100, y: 400, opinion: 4 }, parameters);
  addCitizen(politics, { x: 120, y: 420, opinion: -4 }, parameters);
  stepPolitics(politics, 1 / 60, bounds, parameters);
  assert.ok(me.homophily > me.temperament);
  for (let t = 0; t < 120 * 60; t += 1) stepPolitics(politics, 1 / 60, bounds, { ...parameters, activationRate: 0 });
  assert.ok(Math.abs(me.homophily - me.temperament) < 0.05);
});

test("turnover keeps the population steady while replacing people", () => {
  const model = landscape(6);
  const first = new Set(model.politics.citizens.map((c) => c.id));
  run(model, 120);
  const present = model.politics.citizens.filter((c) => c.leftAt === null);
  assert.equal(present.length, DEFAULT_POLITICS.founders);
  assert.ok(present.some((c) => !first.has(c.id)));
});

test("no population upper bound: touches past the old 120 cap all stay present", () => {
  const politics = createPolitics(8);
  for (let index = 0; index < 200; index += 1) addCitizen(politics, { x: 40 + (index % 300), y: 400, opinion: 0 });
  assert.equal(politics.citizens.filter((c) => c.leftAt === null).length, 200);
});
