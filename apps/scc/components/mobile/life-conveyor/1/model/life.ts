// A population carried along a hundred-year conveyor. People are born only to married couples, marry someone
// close in age, and are removed by death or at 100. The model owns ages, ties and lines spoken; the screen
// derives every position, bubble and animation from them.

import { birthLine, centuryLine, deathLine, marriageLine, script, widowLine, type Sex } from "./script.ts";

export const lifespan = 100;
// Simulated years per real second: one ten-year belt takes ten seconds to ride.
export const yearsPerSecond = 1;
// Real seconds a person takes to fall off the belt once their life ends.
export const fallSeconds = 1.1;
// Real seconds a newborn takes to travel from its parents to the start of the belt; its age waits meanwhile.
export const arrivalSeconds = 1;
// Fertility is steered toward this head count so the belts neither empty nor flood.
export const targetPopulation = 110;

const marriageAges = [26, 40] as const;
const marriageGap = 5;
const marriageHazard = 0.8;
const fertileAges = [25, 42] as const;
const birthHazard = 0.35;
const maximumChildren = 4;
const birthSpacing = 1.2;

export type Person = {
  id: number;
  sex: Sex;
  age: number;
  /** Adult height relative to the population mean. */
  stature: number;
  /** Arm spread relative to the rest pose. */
  reach: number;
  /** Real seconds since the life ended; null while alive. */
  fallen: number | null;
  /** Real seconds left on the way from the parents to the belt; null once on it. */
  arriving: number | null;
  parents: readonly [number, number] | null;
  spouse: number | null;
  children: number;
  lastBirth: number;
  willMarry: boolean;
  /** Personal shift of every scripted age, so lines spread a little along the belt. */
  lag: number;
};

export type Line = { id: number; text: string };

export type Population = {
  people: Person[];
  byId: Map<number, Person>;
  nextId: number;
  random: () => number;
  /** Lines spoken since the screen last drained them. */
  lines: Line[];
};

// Annual hazard, roughly Korean period mortality: infant risk, a low childhood floor, then Gompertz growth
// that doubles about every seven years (life expectancy near 82).
export function hazard(age: number) {
  if (age < 1) return 0.0025;
  return 0.00015 + 0.00002 * Math.exp(0.1 * age);
}

const chance = (random: () => number, rate: number, years: number) => random() < 1 - Math.exp(-rate * years);

function person(population: Population, age: number, parents: Person["parents"]): Person {
  const { random } = population;
  const born: Person = {
    id: population.nextId++,
    sex: random() < 0.5 ? "m" : "f",
    age,
    stature: 0.93 + random() * 0.13,
    reach: 0.85 + random() * 0.3,
    fallen: null,
    arriving: parents ? arrivalSeconds : null,
    parents,
    spouse: null,
    children: 0,
    lastBirth: -Infinity,
    willMarry: random() < 0.85,
    lag: (random() - 0.5) * 0.8,
  };
  population.people.push(born);
  population.byId.set(born.id, born);
  return born;
}

const say = (population: Population, id: number, text: string) => population.lines.push({ id, text });
const alive = (someone: Person | undefined): someone is Person => someone !== undefined && someone.fallen === null;

export function spouseOf(population: Population, someone: Person) {
  const spouse = someone.spouse === null ? undefined : population.byId.get(someone.spouse);
  return alive(spouse) ? spouse : null;
}

export function createPopulation(random: () => number = Math.random): Population {
  const population: Population = { people: [], byId: new Map(), nextId: 0, random, lines: [] };
  // Seed a steady-state age pyramid of singles, then ride two lifespans so couples and families form.
  let survival = 1;
  for (let age = 0; age < lifespan; age += 0.85) {
    if (random() < survival) person(population, age, null);
    survival *= Math.exp(-hazard(age) * 0.85);
  }
  for (let second = 0; second < (2 * lifespan) / yearsPerSecond; second += 0.1) step(population, 0.1);
  population.lines.length = 0;
  return population;
}

function end(population: Population, someone: Person, text: string) {
  someone.fallen = 0;
  say(population, someone.id, text);
  const spouse = spouseOf(population, someone);
  if (spouse) {
    spouse.spouse = null;
    say(population, spouse.id, widowLine);
  }
  someone.spouse = null;
}

export function step(population: Population, seconds: number) {
  const years = seconds * yearsPerSecond;
  const { random } = population;
  const living = population.people.filter((someone) => someone.fallen === null);

  for (const someone of population.people) {
    if (someone.fallen !== null) {
      someone.fallen += seconds;
      continue;
    }
    if (someone.arriving !== null) {
      someone.arriving -= seconds;
      if (someone.arriving <= 0) someone.arriving = null;
      continue;
    }
    const before = someone.age;
    const risk = 1 - Math.exp(-hazard(before) * years);
    someone.age += years;
    if (someone.age >= lifespan) {
      someone.age = lifespan;
      end(population, someone, centuryLine);
      continue;
    }
    if (random() < risk) {
      end(population, someone, deathLine(someone.age));
      continue;
    }
    for (const cue of script) {
      const at = cue.age + someone.lag;
      if (before >= at || someone.age < at) continue;
      const text = cue.line({ sex: someone.sex, married: someone.spouse !== null, children: someone.children, random });
      if (text) say(population, someone.id, text);
    }
  }

  // Marriage: a willing single of marrying age takes the nearest-aged willing single of the other sex.
  for (const someone of living) {
    if (someone.fallen !== null || someone.spouse !== null || !someone.willMarry || someone.arriving !== null) continue;
    if (someone.age < marriageAges[0] || someone.age > marriageAges[1]) continue;
    if (!chance(random, marriageHazard, years)) continue;
    let partner: Person | null = null;
    for (const other of living) {
      if (other.sex === someone.sex || other.spouse !== null || !other.willMarry || other.fallen !== null) continue;
      if (other.age < marriageAges[0] || other.age > marriageAges[1]) continue;
      const gap = Math.abs(other.age - someone.age);
      if (gap <= marriageGap && (!partner || gap < Math.abs(partner.age - someone.age))) partner = other;
    }
    if (!partner) continue;
    someone.spouse = partner.id;
    partner.spouse = someone.id;
    say(population, someone.sex === "f" ? someone.id : partner.id, marriageLine);
  }

  // Births: only a married couple, the wife of fertile age, steered by how far the head count is from the target.
  const steer = Math.min(8, Math.max(0.1, (targetPopulation / Math.max(1, living.length)) ** 2));
  for (const wife of living) {
    if (wife.sex !== "f" || wife.fallen !== null || wife.children >= maximumChildren) continue;
    if (wife.age < fertileAges[0] || wife.age > fertileAges[1] || wife.age - wife.lastBirth < birthSpacing) continue;
    const husband = spouseOf(population, wife);
    if (!husband || !chance(random, birthHazard * steer, years)) continue;
    const child = person(population, 0, [husband.id, wife.id]);
    wife.children += 1;
    husband.children += 1;
    wife.lastBirth = wife.age;
    say(population, wife.id, birthLine(child.sex));
  }

  population.people = population.people.filter((someone) => {
    const kept = someone.fallen === null || someone.fallen < fallSeconds;
    if (!kept) population.byId.delete(someone.id);
    return kept;
  });
}
