// A pinned digest of the layout step: a refactor or optimisation of layout.ts must leave every bit of the bodies as
// it was (the layout is chaotic: one ulp becomes another raft). A deliberate change of behaviour updates the digest
// (printed on failure). The step keeps its sort order between calls (layout.ts `order`), so the runs below are in
// one fixed sequence.

import assert from "node:assert/strict";
import test from "node:test";
import { bodyAt, groupAnchors, relaxBodies, type Body, type Pair } from "./layout.ts";

const FRAME = { width: 1200, height: 700 };

/** FNV-1a over the bytes of `values`, folded into `hash`. */
function fold(hash: number, values: ArrayLike<number>) {
  const bytes = new Uint8Array(Float64Array.from(values).buffer);
  for (const byte of bytes) hash = Math.imul(hash ^ byte, 16_777_619) >>> 0;
  return hash;
}

function lehmer(seed: number) {
  let state = seed;
  return () => {
    state = (state * 48_271) % 2_147_483_647;
    return state / 2_147_483_647;
  };
}

/** `count` bodies, a few of them large (a concentrated rank), linked sparsely, relaxed for `steps`. */
function digest(count: number, steps: number, groups: number) {
  const random = lehmer(20_261_118 + count);
  const bodies: Body[] = Array.from({ length: count }, () => bodyAt(FRAME, random));
  const radii = new Float64Array(count);
  const presence = new Float64Array(count);
  for (let index = 0; index < count; index += 1) {
    radii[index] = index % 97 === 0 ? 60 + 80 * random() : 5 + 9 * random() * random();
    presence[index] = 0.35 + 0.65 * random();
  }
  const links: Pair[] = [];
  for (let index = 0; index < count; index += 1) {
    if (random() < 0.6) links.push({ from: index, to: Math.floor(random() * count) });
  }
  const anchors = new Float64Array(count * 2);
  const places = new Float64Array(groups * 2);
  groupAnchors(groups, FRAME, places);
  for (let index = 0; index < count; index += 1) {
    anchors[index * 2] = places[(index % groups) * 2]!;
    anchors[index * 2 + 1] = places[(index % groups) * 2 + 1]!;
  }
  let hash = 2_166_136_261;
  for (let step = 0; step < steps; step += 1) {
    // Radii breathe, as the displayed rank's do.
    for (let index = 0; index < count; index += 97) radii[index] = radii[index]! * (1 + 0.01 * Math.sin(step * 0.1 + index));
    if (groups > 1) relaxBodies(bodies, links, radii, FRAME, 1 / 60, presence, anchors);
    else relaxBodies(bodies, links, radii, FRAME, 1 / 60, presence);
    if (step % 50 === 49) for (const body of bodies) hash = fold(hash, [body.x, body.y, body.vx, body.vy]);
  }
  return hash.toString(16).padStart(8, "0");
}

test("the layout step leaves every bit of the bodies as pinned", () => {
  const found = [digest(800, 300, 1), digest(240, 300, 3), digest(801, 120, 1)];
  assert.deepEqual(found, PINNED, `layout digests: ${JSON.stringify(found)}`);
});

const PINNED = ["0de419cc", "2fe28691", "164c6e0b"];
