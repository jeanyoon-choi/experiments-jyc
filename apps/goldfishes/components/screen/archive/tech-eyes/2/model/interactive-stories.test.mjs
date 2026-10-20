import assert from "node:assert/strict";
import test from "node:test";
import {
  bubblePresentationChanged,
  createInteractiveStorySystem,
  placeBubbleAt,
  resizeSocialStorySystem,
  stepSocialStorySystem,
} from "./social-stories.ts";

test("clicks alone create bubbles at their exact normalized positions", () => {
  let system = createInteractiveStorySystem(4, 3);
  assert.ok(system.states.every((state) => state.status === "empty"));

  system = stepSocialStorySystem(system, 1000, new Map(), 300, null, 300, false);
  assert.ok(system.states.every((state) => state.status === "empty"));

  system = placeBubbleAt(system, 1000, 0.173, 0.814);
  const clockStep = stepSocialStorySystem(system, 1100, new Map(), 300, null, 300, false);
  assert.equal(clockStep.states, system.states);
  assert.equal(bubblePresentationChanged(system, clockStep), false);
  const attentionStep = stepSocialStorySystem(clockStep, 1200, new Map([[clockStep.states.findIndex((state) => state.status === "new"), 0.1]]), 300, null, 300, false);
  assert.equal(bubblePresentationChanged(clockStep, attentionStep), false);
  const placed = system.states.find((state) => state.status === "new");
  assert.deepEqual(placed?.position, { x: 0.173, y: 0.814 });

  system = stepSocialStorySystem(system, 2000, new Map(), 300, null, 300, false);
  assert.equal(system.states.filter((state) => state.status !== "empty").length, 1);
  const resized = resizeSocialStorySystem(system, 5, 3, 2000);
  assert.deepEqual(resized.states.find((state) => state.position)?.position, { x: 0.173, y: 0.814 });
  assert.equal(resized.states.filter((state) => state.status !== "empty").length, 1);
  const smaller = resizeSocialStorySystem(resized, 1, 1, 2000);
  assert.deepEqual(smaller.states[0].position, { x: 0.173, y: 0.814 });
});
