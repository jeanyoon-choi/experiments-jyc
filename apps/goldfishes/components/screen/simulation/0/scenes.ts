// The three situations the model document measured every version in, run without a screen:
//   quiet    no input for three minutes — does the screen stay still?
//   one      one stroke after 30 s — how far and how fast does it spread, does the screen come back?
//   many     ten strokes in two minutes, then eight minutes of nothing — does it come back from that?
// A stroke here is a straight line of nine bubbles at a seeded place; the document does not give its strokes'
// length, so figures that depend on it (how many fish one stroke takes) are comparable in kind, not to the digit.
//
//   node apps/goldfishes/components/screen/simulation/0/scenes.ts [preset …]     (all presets when none is named)

import { Meter, shares, type Sample } from "./measure.ts";
import { createWorld, line, PRESETS, random, step, stroke, type Parameters, type World } from "./model.ts";

const STEP = 0.05;

function run(world: World, meter: Meter, seconds: number) {
  for (let time = 0; time < seconds - 1e-9; time += STEP) {
    step(world, STEP);
    meter.after(world, STEP);
  }
}

function drawStroke(world: World) {
  const turn = random(world) * Math.PI * 2;
  const reach = 0.2 * Math.sqrt(random(world));
  const x = 0.5 + reach * Math.cos(turn);
  const y = 0.5 + reach * Math.sin(turn);
  const heading = random(world) * Math.PI * 2;
  return stroke(world, line([x - 0.12 * Math.cos(heading), y - 0.12 * Math.sin(heading)], [x + 0.12 * Math.cos(heading), y + 0.12 * Math.sin(heading)]));
}

/** Seconds from `from` until four samples in a row are still; null if never. */
function settles(samples: readonly Sample[], from: number) {
  let run = 0;
  for (const sample of samples) {
    if (sample.time < from) continue;
    run = sample.state.startsWith("안정") ? run + 1 : 0;
    if (run >= 4) return sample.time - from;
  }
  return null;
}

export function quiet(parameters: Parameters, seed: number) {
  const world = createWorld(parameters, seed);
  const meter = new Meter();
  run(world, meter, 180);
  const samples = meter.samples.filter((sample) => sample.time > 30);
  return { still: shares(samples)["안정"] ?? 0, fishLeft: world.fish.length, rearranged: mean(samples.map((sample) => sample.rearranged)) };
}

export function one(parameters: Parameters, seed: number) {
  const world = createWorld(parameters, seed);
  const meter = new Meter();
  run(world, meter, 30);
  const keyword = drawStroke(world);
  let half: number | null = null;
  let most = 0;
  for (let time = 0; time < 180; time += STEP) {
    step(world, STEP);
    meter.after(world, STEP);
    let on = 0;
    for (const fish of world.fish) if (world.signs[fish.at.sign]!.keyword === keyword) on += 1;
    const share = on / Math.max(1, world.fish.length);
    most = Math.max(most, share);
    if (half === null && share >= 0.5) half = time;
  }
  const after = meter.samples.filter((sample) => sample.time > 30);
  let burstsInFour = 0;
  for (let at = 0; at + 4 <= after.length; at += 1) burstsInFour = Math.max(burstsInFour, after[at]!.bursts + after[at + 1]!.bursts + after[at + 2]!.bursts + after[at + 3]!.bursts);
  return {
    half,
    most,
    largest: Math.max(...after.map((sample) => sample.largest)),
    burstsInFour,
    uproar: after.filter((sample) => sample.state === "난리").length,
    settles: settles(meter.samples, 34),
  };
}

export function many(parameters: Parameters, seed: number) {
  const world = createWorld(parameters, seed);
  const meter = new Meter();
  for (let index = 0; index < 10; index += 1) {
    drawStroke(world);
    run(world, meter, 12);
  }
  const during = meter.samples.slice();
  run(world, meter, 480);
  const after = meter.samples.slice(during.length);
  return {
    uproarDuring: shares(during)["난리"] ?? 0,
    mostFish: Math.max(...meter.samples.map((sample) => sample.fish)),
    keywordsAtEnd: during[during.length - 1]!.keywords,
    burstsPerSecond: mean(during.map((sample) => sample.bursts)),
    rearranged: mean(during.map((sample) => sample.rearranged)),
    settles: settles(meter.samples, 120),
    uproarAfter: shares(after)["난리"] ?? 0,
    fishAtEnd: world.fish.length,
  };
}

function mean(values: readonly number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function span(values: readonly (number | null)[], digits = 0) {
  const numbers = values.filter((value): value is number => value !== null);
  const never = values.length - numbers.length;
  if (!numbers.length) return "never";
  const low = Math.min(...numbers).toFixed(digits);
  const high = Math.max(...numbers).toFixed(digits);
  return (low === high ? low : `${low}–${high}`) + (never ? ` (${never} of ${values.length} never)` : "");
}

if (import.meta.main) {
  const seeds = [11, 23, 37];
  const names = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(PRESETS);
  for (const name of names) {
    const parameters = (PRESETS as Record<string, Parameters>)[name];
    if (!parameters) throw new Error(`no preset ${name}`);
    const q = seeds.map((seed) => quiet(parameters, seed));
    const o = seeds.map((seed) => one(parameters, seed));
    const m = seeds.map((seed) => many(parameters, seed));
    console.log(`\n${name}`);
    console.log(`  quiet  still ${span(q.map((r) => r.still * 100))}% · fish left ${span(q.map((r) => r.fishLeft))} · rearranged ${span(q.map((r) => r.rearranged), 2)}/bubble·s`);
    console.log(
      `  one    half the fish in (s) ${span(o.map((r) => r.half))} · most ${span(o.map((r) => r.most * 100))}% · largest ${span(o.map((r) => r.largest), 1)}× · bursts in 4 s ${span(o.map((r) => r.burstsInFour))} · uproar ${span(o.map((r) => r.uproar))} s · still again after (s) ${span(o.map((r) => r.settles))}`,
    );
    console.log(
      `  many   uproar ${span(m.map((r) => r.uproarDuring * 100))}% · fish up to ${span(m.map((r) => r.mostFish))} · keywords ${span(m.map((r) => r.keywordsAtEnd), 1)} · bursts ${span(m.map((r) => r.burstsPerSecond), 1)}/s · rearranged ${span(m.map((r) => r.rearranged), 2)} · still again after (s) ${span(m.map((r) => r.settles))} · uproar after ${span(m.map((r) => r.uproarAfter * 100))}% · fish at end ${span(m.map((r) => r.fishAtEnd))}`,
    );
  }
}
