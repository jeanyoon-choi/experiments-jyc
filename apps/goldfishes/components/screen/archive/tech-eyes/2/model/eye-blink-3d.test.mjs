import assert from "node:assert/strict";
import test from "node:test";
import { advanceEyeBlink3D, createEyeBlink3D, setEyeBlink3DSpeed, triggerEyeBlink3D } from "./eye-blink-3d.ts";

function advanceFor(state, seconds) {
  for (let remaining = seconds; remaining > 0; remaining -= .02) {
    advanceEyeBlink3D(state, Math.min(.02, remaining), true);
  }
}

test("identity seeds give independent, reproducible natural intervals", () => {
  const first = createEyeBlink3D(30), again = createEyeBlink3D(30), other = createEyeBlink3D(31);
  assert.equal(first.delay, again.delay);
  assert.notEqual(first.delay, other.delay);
  assert.ok(first.delay >= 2.5 && first.delay <= 7);
});

test("a blink closes quickly, holds briefly, then opens more slowly", () => {
  const state = createEyeBlink3D(3);
  advanceFor(state, state.delay);
  assert.equal(state.phase, "closing");
  const closeDuration = state.duration;
  advanceFor(state, closeDuration + .005);
  assert.equal(state.phase, "closed");
  const closedDuration = state.duration;
  assert.ok(closedDuration >= .045 * .94 && closedDuration <= .075 * 1.06);
  advanceFor(state, closedDuration + .005);
  assert.equal(state.phase, "opening");
  assert.ok(closeDuration >= .11 * .94 && closeDuration <= .145 * 1.06);
  assert.ok(state.duration >= .17 * .94 && state.duration <= .22 * 1.06);
  assert.ok(state.duration > closeDuration);
});

test("disabled motion stays open and resets the cadence instead of catching up", () => {
  const state = createEyeBlink3D(12);
  advanceFor(state, state.delay + .04);
  assert.ok(state.phase === "closing" || state.phase === "closed");
  assert.equal(advanceEyeBlink3D(state, 99, false), 1);
  assert.equal(state.phase, "open");
  const resetDelay = state.delay;
  assert.ok(resetDelay >= 2.5 && resetDelay <= 7);
  assert.equal(advanceEyeBlink3D(state, 10, true), 1, "a long restored-frame delta is capped");
  assert.equal(state.phase, "open");
});

test("manual command replaces a blink and permits no extra follow-up", () => {
  for (let id = 0; id < 80; id++) {
    const state = createEyeBlink3D(id);
    state.followup = true;
    triggerEyeBlink3D(state);
    assert.equal(state.phase, "closing");
    assert.equal(state.elapsed, 0);
    assert.equal(state.blinkMayDouble, false);
    advanceFor(state, .07);
    triggerEyeBlink3D(state);
    assert.equal(state.elapsed, 0);
    advanceFor(state, .6);
    assert.equal(state.phase, "open");
    assert.equal(state.followup, false);
    assert.ok(state.delay > 2);
  }
});

test("speed changes duration without altering cadence or jumping the lid", () => {
  const normal = createEyeBlink3D(7);
  const slow = createEyeBlink3D(7);
  setEyeBlink3DSpeed(slow, 0.7);
  assert.equal(slow.delay, normal.delay);
  triggerEyeBlink3D(normal);
  triggerEyeBlink3D(slow);
  assert.ok(slow.duration > normal.duration * 1.4);
  advanceEyeBlink3D(slow, slow.duration / 2, true);
  const halfway = 1 - slow.elapsed / slow.duration;
  const remaining = slow.duration - slow.elapsed;
  setEyeBlink3DSpeed(slow, 0.4);
  assert.ok(Math.abs(1 - slow.elapsed / slow.duration - halfway) < 1e-10);
  assert.ok(slow.duration - slow.elapsed > remaining);
  assert.equal(slow.speed, 0.4);
});

test("a double blink is bounded to one follow-up before the normal interval", () => {
  const state = createEyeBlink3D(7);
  // Exercise many deterministic blinks; any requested follow-up must clear when it starts.
  for (let frame = 0; frame < 3000; frame++) {
    advanceEyeBlink3D(state, .02, true);
    if (state.phase === "closing" && state.followup) assert.fail("follow-up flag must be consumed before closing");
  }
  assert.ok(state.delay >= 0, "state remains finite after repeated timing transitions");
});
