import assert from "node:assert/strict";
import test from "node:test";
import { ColumnAtlas, type Slot } from "../gl/atlas.ts";
import { Dopamine, ripple, Surge, type Seat } from "./field.ts";
import { EASE, eased, poseAt, REST, type Ease } from "./motion.ts";
import { personaFor } from "./persona.ts";
import { random } from "./random.ts";
import { tuningFromQuery, TUNING_DEFAULTS } from "./tuning.ts";

const EASES = Object.values(EASE) as Ease[];

test("every ease starts at 0 and lands on 1, clamped outside its span", () => {
  for (const ease of EASES) {
    assert.equal(eased(ease, 0), 0, `ease ${ease} at 0`);
    assert.ok(Math.abs(eased(ease, 1) - 1) < 1e-9, `ease ${ease} at 1`);
    assert.equal(eased(ease, -3), eased(ease, 0));
    assert.equal(eased(ease, 9), eased(ease, 1));
  }
});

test("springs overshoot and settle; a flick is fast at first and never goes back", () => {
  const spring = Array.from({ length: 101 }, (_, i) => eased(EASE.spring, i / 100));
  assert.ok(Math.max(...spring) > 1.01, "the spring overshoots");
  const flick = Array.from({ length: 101 }, (_, i) => eased(EASE.flick, i / 100));
  for (let i = 1; i < flick.length; i += 1) assert.ok(flick[i]! >= flick[i - 1]!, "monotonic");
  assert.ok(flick[20]! > 0.6, "most of the way in the first fifth");
});

test("a pose eases between its ends and holds them before and after", () => {
  const motion = { t0: 1, t1: 2, ease: EASE.linear, from: { ...REST, x: 0, opacity: 1 }, to: { ...REST, x: 100, opacity: 0 }, ox: 0, oy: 0 };
  assert.equal(poseAt(motion, 0).x, 0);
  assert.equal(poseAt(motion, 1.5).x, 50);
  assert.equal(poseAt(motion, 1.5).opacity, 0.5);
  assert.equal(poseAt(motion, 5).x, 100);
});

test("the atlas never overlaps tiles, keeps them inside, says when it is full, and takes freed room back", () => {
  const atlas = new ColumnAtlas(256, 2, 90, 2);
  const rng = random(7);
  const slots: Slot[] = [];
  for (;;) {
    const slot = atlas.alloc(10 + rng.int(80), 10 + rng.int(120));
    if (!slot) break;
    slots.push(slot);
  }
  assert.ok(slots.length > 6);
  const apart = (a: Slot, b: Slot) => a.layer !== b.layer || a.x + a.w + 2 <= b.x || b.x + b.w + 2 <= a.x || a.y + a.h + 2 <= b.y || b.y + b.h + 2 <= a.y;
  for (const a of slots) {
    assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.w <= 256 && a.y + a.h <= 256);
    for (const b of slots) if (a !== b) assert.ok(apart(a, b), "padded tiles do not touch");
  }
  assert.equal(atlas.alloc(91, 10), null, "wider than a column");
  // Free every other tile, then everything: the columns merge back whole.
  for (const slot of slots.filter((_, i) => i % 2)) atlas.release(slot);
  const again = atlas.alloc(40, 60);
  assert.ok(again, "freed room is reused");
  for (const b of slots.filter((_, i) => i % 2 === 0)) assert.ok(apart(again!, b));
  atlas.release(again!);
  for (const slot of slots.filter((_, i) => i % 2 === 0)) atlas.release(slot);
  assert.ok(Math.abs(atlas.fill) < 1e-9, "empty again");
  assert.ok(atlas.alloc(80, 250), "a whole column is one interval again");
});

const grid = (columns: number, rows: number): Seat[] => Array.from({ length: columns * rows }, (_, i) => ({ column: i % columns, row: Math.floor(i / columns) }));

test("a ripple spreads ring by ring from its phone, never to itself, and only for strong strikes", () => {
  const seats = grid(16, 4);
  const echoes = ripple(seats, 20, 1, 1, () => 0);
  assert.ok(echoes.length > 8);
  assert.ok(!echoes.some((echo) => echo.phone === 20));
  for (const echo of echoes) {
    const distance = Math.max(Math.abs(seats[echo.phone]!.column - seats[20]!.column), Math.abs(seats[echo.phone]!.row - seats[20]!.row));
    assert.ok(Math.abs(echo.delay - distance * 0.11) < 1e-9, "delay grows with the ring");
  }
  assert.deepEqual(ripple(seats, 20, 1, 0, () => 0), []);
  assert.deepEqual(ripple(seats, 20, 0.3, 1, () => 0), []);
});

test("a surge fires on a jump in the strike rate, not on a steady one, then rests", () => {
  const surge = new Surge(1.7, 22, 6);
  let fired = 0;
  let t = 0;
  for (; t < 40; t += 1 / 60) if (surge.step(10 / 60, 1 / 60, t)) fired += 1;
  assert.equal(fired, 0, "steady");
  for (const end = t + 3; t < end; t += 1 / 60) if (surge.step(40 / 60, 1 / 60, t)) fired += 1;
  assert.equal(fired, 1, "one surge on the jump");
  for (const end = t + 10; t < end; t += 1 / 60) if (surge.step(40 / 60, 1 / 60, t)) fired += 1;
  assert.equal(fired, 1, "cooldown");
});

test("dopamine: too many strikes in ten seconds, or ten seconds on the same, kills", () => {
  const dopamine = new Dopamine(0);
  for (let i = 0; i < 5; i += 1) dopamine.strike(i % 2 ? "gpu" : "cloud", i);
  assert.equal(dopamine.verdict(5, 20, 14), null);
  for (let i = 0; i < 20; i += 1) dopamine.strike("gpu", 6 + i * 0.1);
  assert.equal(dopamine.verdict(8, 20, 14), "overdose");
  assert.equal(dopamine.level(30), 0, "strikes fade out of the window");
  assert.equal(dopamine.verdict(30, 20, 14), "still", "nothing new since 6 s");
  dopamine.reset(30);
  assert.equal(dopamine.verdict(31, 20, 14), null);
});

test("personas are stable per seat, and the field is mixed", () => {
  assert.deepEqual(personaFor(3), personaFor(3));
  const field = Array.from({ length: 64 }, (_, seat) => personaFor(seat));
  const dark = field.filter((persona) => persona.mode === "dark").length;
  const android = field.filter((persona) => persona.os === "android").length;
  assert.ok(dark > 18 && dark < 46, `dark ${dark}`);
  assert.ok(android > 6 && android < 30, `android ${android}`);
  assert.ok(new Set(field.map((persona) => persona.lang)).size >= 3);
  for (const persona of field) {
    assert.equal(new Set(persona.apps).size, persona.apps.length, "no app twice");
    assert.ok(persona.apps.length >= 6 && persona.apps.length <= 9);
  }
  assert.ok(new Set(field.map((persona) => persona.apps[0])).size >= 5, "favourites differ");
});

test("the query tunes, clamped and checked", () => {
  const tuning = tuningFromQuery("?phones=500&speed=1.5&death=nope&wave=x");
  assert.equal(tuning.phones, 64);
  assert.equal(tuning.speed, 1.5);
  assert.equal(tuning.death, TUNING_DEFAULTS.death);
  assert.equal(tuning.wave, TUNING_DEFAULTS.wave);
  assert.equal(tuningFromQuery("?death=limit").death, "limit");
});
