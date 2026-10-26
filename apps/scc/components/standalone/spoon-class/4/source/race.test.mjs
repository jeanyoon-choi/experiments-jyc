import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  RACER_COUNT,
  STUN_DURATION,
  createRace,
  startJump,
  stepRace,
} from "../race.ts";

const FRAME = 1000 / 60;

test("assets are the upstream resources byte for byte", () => {
  const html = readFileSync(new URL("./dino.html", import.meta.url), "utf8");
  const assets = JSON.parse(readFileSync(new URL("./assets.json", import.meta.url), "utf8"));
  for (const uri of [...Object.values(assets.images), ...Object.values(assets.sounds)]) {
    assert.ok(html.includes(`src="${uri}"`));
  }
});

test("a hit never ends the race: the runner lies down one second and loses that distance", () => {
  const race = createRace(560);
  race.started = true;
  let hitRacer = null;
  for (let frame = 0; frame < 60 * 30 && !hitRacer; frame += 1) {
    hitRacer = stepRace(race, FRAME)[0] ?? null;
  }
  assert.ok(hitRacer, "without jumping, some runner hits an obstacle");
  const stalled = hitRacer.distance;
  const unhurt = race.racers.find((racer) => racer.hits === 0);
  const before = unhurt?.distance;
  for (let elapsed = 0; elapsed < STUN_DURATION - FRAME; elapsed += FRAME) stepRace(race, FRAME);
  assert.equal(hitRacer.distance, stalled, "distance stands still while hurt");
  assert.ok(hitRacer.stun > 0);
  if (unhurt && unhurt.hits === 0) assert.ok(unhurt.distance > before);
  for (let frame = 0; frame < 10; frame += 1) stepRace(race, FRAME);
  assert.equal(hitRacer.stun, 0);
  assert.ok(hitRacer.distance > stalled, "runs on after getting up");
});

test("every runner keeps its row and stands further right the further it has run", () => {
  const race = createRace(560);
  race.started = true;
  for (let frame = 0; frame < 60 * 40; frame += 1) {
    if (frame % 50 === 0) race.racers.forEach(startJump);
    stepRace(race, FRAME);
  }
  assert.equal(race.racers.length, RACER_COUNT);
  assert.deepEqual(race.racers.map((racer) => racer.id), [...race.racers.keys()]);
  assert.ok(race.racers.some((racer) => racer.hits > 0));
  const byDistance = [...race.racers].sort((a, b) => b.distance - a.distance);
  for (let index = 1; index < byDistance.length; index += 1) {
    assert.ok(byDistance[index - 1].place >= byDistance[index].place);
  }
});
