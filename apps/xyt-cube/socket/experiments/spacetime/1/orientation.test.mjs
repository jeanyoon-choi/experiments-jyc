import assert from "node:assert/strict";
import test from "node:test";
import { MAX_BETA } from "./physics.mjs";
import { signedAngleDelta, tiltToBeta } from "./orientation.mjs";

const rest = { beta: 30, gamma: -5 };

test("the enabling pose is rest; tremor stays rest", () => {
  assert.deepEqual(tiltToBeta(rest, rest), { bx: 0, by: 0 });
  assert.deepEqual(tiltToBeta({ beta: 31, gamma: -5 }, rest), { bx: 0, by: 0 });
});

test("tilt right moves right, top away moves up, never reaching C", () => {
  const right = tiltToBeta({ beta: 30, gamma: 25 }, rest);
  assert.ok(right.bx > 0 && right.by === 0);
  const up = tiltToBeta({ beta: 0, gamma: -5 }, rest);
  assert.ok(up.by < 0 && up.bx === 0);
  const extreme = tiltToBeta({ beta: 30, gamma: 85 }, rest);
  assert.ok(Math.hypot(extreme.bx, extreme.by) < MAX_BETA);
});

test("angle deltas wrap", () => {
  assert.equal(signedAngleDelta(-170, 170), 20);
  assert.equal(signedAngleDelta(Number.NaN, 10), -10);
});
