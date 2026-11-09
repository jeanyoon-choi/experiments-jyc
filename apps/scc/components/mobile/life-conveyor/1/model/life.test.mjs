import assert from "node:assert/strict";
import test from "node:test";
import { createPopulation, hazard, lifespan, spouseOf, step } from "./life.ts";

const seeded = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

test("period life expectancy from the hazard is near Korea's", () => {
  let alive = 1;
  let years = 0;
  for (let age = 0; age < lifespan; age += 0.01) {
    years += alive * 0.01;
    alive *= Math.exp(-hazard(age) * 0.01);
  }
  assert.ok(years > 78 && years < 86, `life expectancy ${years}`);
});

test("couples sustain the belts for ten lifespans and nobody outlives 100", () => {
  const population = createPopulation(seeded(7));
  for (let frame = 0; frame < 60 * 1000; frame += 1) {
    step(population, 1 / 60);
    if (frame % 600 === 0) {
      const count = population.people.length;
      assert.ok(count > 50 && count < 200, `population ${count} at ${frame / 60}s`);
    }
  }
  for (const person of population.people) assert.ok(person.age >= 0 && person.age <= lifespan);
});

test("every newborn has a married pair of parents and every marriage is mutual", () => {
  const population = createPopulation(seeded(11));
  const seen = new Set(population.people.map((person) => person.id));
  for (let frame = 0; frame < 60 * 60; frame += 1) {
    step(population, 1 / 60);
    for (const person of population.people) {
      const spouse = spouseOf(population, person);
      if (spouse) assert.equal(spouse.spouse, person.id);
      if (seen.has(person.id)) continue;
      seen.add(person.id);
      assert.ok(person.parents, "born without parents");
      const [father, mother] = person.parents.map((id) => population.byId.get(id));
      assert.equal(father.sex, "m");
      assert.equal(mother.sex, "f");
      assert.equal(person.age, 0);
    }
  }
});
