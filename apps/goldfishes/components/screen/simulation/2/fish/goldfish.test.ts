import assert from "node:assert/strict";
import test from "node:test";
import { FISH_DEFAULTS, GoldfishSchool } from "./goldfish.ts";
import { attend, createRankedWeb } from "../web/model.ts";

const WIDTH = 1200;
const HEIGHT = 700;

/** A pressed raft: pages on a hexagonal lattice at less than touching distance, so discs overlap like the foam. */
function raft(count: number, radius: number, time: number, bubbles: Float32Array, portions: number) {
  let at = 0;
  // Travelling portions first, crossing open water, as the route draws them.
  for (let portion = 0; portion < portions; portion += 1) {
    const phase = (time * 0.2 + portion / portions) % 1;
    bubbles[at++] = 100 + phase * (WIDTH - 200);
    bubbles[at++] = 120 + portion * 40;
    bubbles[at++] = 6;
    bubbles[at++] = 0.5;
  }
  const columns = Math.ceil(Math.sqrt(count));
  const step = radius * 1.7;
  for (let page = 0; page < count; page += 1) {
    const row = Math.floor(page / columns);
    const column = page % columns;
    bubbles[at++] = WIDTH / 2 + (column - columns / 2 + (row % 2) * 0.5) * step + Math.sin(time * 0.3) * 20;
    bubbles[at++] = HEIGHT / 2 + (row - columns / 2) * step * 0.87;
    // One page swells and shrinks, pressing on fish beside it.
    bubbles[at++] = page === 7 ? radius * (1 + 0.5 * Math.sin(time)) : radius * (0.7 + 0.6 * ((page * 37) % 10) / 10);
    bubbles[at++] = 0.3;
  }
  return at / 4;
}

test("fish never overlap a drawn bubble and gather around the raft", () => {
  const pages = 30;
  const portions = 4;
  const web = createRankedWeb(pages);
  const shown = new Float64Array(pages).fill(1 / pages);
  const school = new GoldfishSchool(WIDTH, HEIGHT);
  school.setCount(80);
  const bubbles = new Float32Array((pages + portions) * 4);
  const parameters = { ...FISH_DEFAULTS, speed: 1.5 };
  const contact = new Float64Array(pages);
  const attended = new Float64Array(pages);
  let worst = Infinity;
  for (let frame = 0; frame < 60 * 40; frame += 1) {
    const time = frame / 60;
    const count = raft(pages, 34, time, bubbles, portions);
    school.step(1 / 60, web, shown, bubbles, count, portions, pages, parameters);
    school.drainContact(pages, contact);
    for (let page = 0; page < pages; page += 1) attended[page] = attended[page]! + contact[page]!;
    worst = Math.min(worst, school.deepestOverlap());
  }
  // The smallest exclusion is the mouth or the side reach (6.15 × 0.8) plus the edge gap.
  assert.ok(worst >= 6.15 * FISH_DEFAULTS.scale, `a fish came ${worst.toFixed(2)} px from a bubble's edge`);
  const watched = Array.from(attended).filter((seconds) => seconds > 1).length;
  assert.ok(watched >= 5, `only ${watched} pages were watched`);

  // Most fish are near some bubble's edge rather than lost in open water.
  let near = 0;
  for (const fish of school.fish) {
    let gap = Infinity;
    for (let bubble = portions; bubble < portions + pages; bubble += 1) {
      gap = Math.min(gap, Math.hypot(fish.x - bubbles[bubble * 4]!, fish.y - bubbles[bubble * 4 + 1]!) - bubbles[bubble * 4 + 2]!);
    }
    if (gap < 60) near += 1;
  }
  assert.ok(near >= school.fish.length * 0.6, `${near} of ${school.fish.length} fish are near a bubble`);
});

test("buried pages are never targeted", () => {
  const pages = 25;
  const web = createRankedWeb(pages);
  const shown = new Float64Array(pages).fill(1 / pages);
  // The centre page is the most salient but enclosed by its neighbours.
  shown[12] = 0.5;
  const school = new GoldfishSchool(WIDTH, HEIGHT);
  school.setCount(40);
  const bubbles = new Float32Array(pages * 4);
  for (let frame = 0; frame < 60 * 10; frame += 1) {
    let at = 0;
    for (let page = 0; page < pages; page += 1) {
      bubbles[at++] = WIDTH / 2 + ((page % 5) - 2) * 50;
      bubbles[at++] = HEIGHT / 2 + (Math.floor(page / 5) - 2) * 50;
      bubbles[at++] = 34;
      bubbles[at++] = 0;
    }
    school.step(1 / 60, web, shown, bubbles, pages, 0, pages, { ...FISH_DEFAULTS, follow: 0 });
    for (const fish of school.fish) assert.notEqual(fish.target, 12);
  }
});

test("count changes keep existing fish and zero removes them", () => {
  const school = new GoldfishSchool(WIDTH, HEIGHT);
  school.setCount(20);
  const first = school.fish[0];
  school.setCount(50);
  assert.equal(school.fish.length, 50);
  assert.equal(school.fish[0], first);
  school.setCount(0);
  assert.equal(school.fish.length, 0);
});

test("attention raises quality up to a ceiling", () => {
  const web = createRankedWeb(10);
  web.quality[3] = 0;
  attend(web, 3, 0.5);
  assert.equal(web.quality[3], 0.5);
  attend(web, 3, 10);
  assert.equal(web.quality[3], 1.5);
  attend(web, 3, -1);
  assert.equal(web.quality[3], 1.5);
});

test("a fish shut in a cavity of the raft swims in again from the edge", () => {
  // A ring of bubbles round an empty middle where one fish starts.
  const ring = 10;
  const web = createRankedWeb(ring);
  const shown = new Float64Array(ring).fill(1 / ring);
  const bubbles = new Float32Array(ring * 4);
  for (let page = 0; page < ring; page += 1) {
    const angle = (page / ring) * Math.PI * 2;
    bubbles.set([WIDTH / 2 + Math.cos(angle) * 100, HEIGHT / 2 + Math.sin(angle) * 100, 40, 0], page * 4);
  }
  const school = new GoldfishSchool(WIDTH, HEIGHT);
  school.setCount(1);
  const fish = school.fish[0]!;
  fish.x = WIDTH / 2;
  fish.y = HEIGHT / 2;
  for (let frame = 0; frame < 60 * 20; frame += 1) school.step(1 / 60, web, shown, bubbles, ring, 0, ring, FISH_DEFAULTS);
  assert.ok(Math.hypot(fish.x - WIDTH / 2, fish.y - HEIGHT / 2) > 120, "the fish is still inside the ring");
});
