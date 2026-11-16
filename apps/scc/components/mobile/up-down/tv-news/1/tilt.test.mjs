import assert from "node:assert/strict";
import test from "node:test";
import { DEAD_ZONE, FULL_TILT, leanOf, northShare, pitchOf, voiceGains } from "./tilt.ts";

test("level stays level inside the dead zone", () => {
  assert.equal(leanOf(50, 50), 0);
  assert.equal(leanOf(50 + DEAD_ZONE - 0.5, 50), 0);
  assert.equal(leanOf(50 - DEAD_ZONE + 0.5, 50), 0);
});

test("tipping the top edge away goes north, toward the body south", () => {
  assert.equal(leanOf(50 - FULL_TILT, 50), 1);
  assert.equal(leanOf(50 + FULL_TILT, 50), -1);
  assert.equal(leanOf(50 - 90, 50), 1);
  const half = leanOf(50 - (DEAD_ZONE + FULL_TILT) / 2, 50);
  assert.ok(Math.abs(half - 0.5) < 1e-9);
});

test("the share runs from the South alone to the North alone", () => {
  assert.equal(northShare(-1), 0);
  assert.equal(northShare(0), 0.5);
  assert.equal(northShare(1), 1);
});

test("the two voices keep equal power", () => {
  for (const share of [0, 0.25, 0.5, 0.75, 1]) {
    const [south, north] = voiceGains(share);
    assert.ok(Math.abs(south * south + north * north - 1) < 1e-9);
  }
  assert.ok(voiceGains(0)[1] < 1e-9);
  assert.ok(voiceGains(1)[0] < 1e-9);
});

test("pitch follows the way the screen is turned", () => {
  const reading = { beta: 40, gamma: 10 };
  assert.equal(pitchOf(reading, 0), 40);
  assert.equal(pitchOf(reading, 180), -40);
  assert.equal(pitchOf(reading, 90), -10);
  assert.equal(pitchOf(reading, 270), 10);
});
