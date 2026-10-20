import assert from "node:assert/strict";
import test from "node:test";
import { CLOCK_RADIUS, HANDS } from "./index.ts";
import { FRACTAL_EXTENT, FRACTAL_NODES, fractalCentres, fractalPhases } from "./fractal.ts";

test("the tree is SCC's, one level shallower: 40 clocks in pre-order with subtree sizes", () => {
  assert.equal(FRACTAL_NODES.length, 40);
  assert.equal(FRACTAL_NODES[0]!.size, 40);
  FRACTAL_NODES.forEach((node, index) => {
    if (node.parent >= 0) assert.ok(node.parent < index, "parents come first");
    const end = index + node.size;
    for (let child = index + 1; child < end; child += 1) assert.ok(FRACTAL_NODES[child]!.depth > node.depth);
  });
  // The minute-hand child of the root runs at the root's rate; the second-hand child 1.14×.
  assert.equal(FRACTAL_NODES[1 + 13]!.rate, 1);
  assert.ok(Math.abs(FRACTAL_NODES[1 + 26]!.rate - 1.14) < 1e-12);
});

test("children sit on their parent's hand tips, and the root is the ordinary clock", () => {
  const seconds = 14 * 3600 + 7 * 60 + 3;
  const centres = fractalCentres(seconds, CLOCK_RADIUS);
  const phases = fractalPhases(seconds);
  for (let h = 0; h < 3; h += 1) {
    assert.ok(Math.abs(phases[h]! - ((seconds / HANDS[h].period) % 1)) < 1e-6, "root hands = local time");
  }
  // Root's minute-hand child (pre-order index 1 + 13).
  const turn = phases[1]!;
  const tip = [HANDS[1].length * CLOCK_RADIUS * Math.sin(2 * Math.PI * turn), HANDS[1].length * CLOCK_RADIUS * Math.cos(2 * Math.PI * turn)];
  const child = centres[14]!;
  assert.ok(Math.hypot(child[0] - tip[0]!, child[1] - tip[1]!) < 1e-6);
});

test("a subtree never reaches beyond its extent bound", () => {
  const centres = fractalCentres(50000, CLOCK_RADIUS);
  FRACTAL_NODES.forEach((node, index) => {
    const radius = CLOCK_RADIUS * 0.6 ** node.depth;
    const reach = radius * FRACTAL_EXTENT[node.depth]!;
    for (let child = index + 1; child < index + node.size; child += 1) {
      const d = Math.hypot(centres[child]![0] - centres[index]![0], centres[child]![1] - centres[index]![1]);
      const childRadius = CLOCK_RADIUS * 0.6 ** FRACTAL_NODES[child]!.depth;
      assert.ok(d + childRadius <= reach + 1e-9);
    }
  });
});
