import assert from "node:assert/strict";
import test from "node:test";
import { AttentionSchool, storyCenter, type FieldLayout } from "./attention-school.ts";
import { activateStory, createSocialStorySystem } from "./social-stories.ts";
import type { SocialStorySystem } from "./types.ts";

const layout: FieldLayout = {
  width: 480,
  height: 320,
  columns: 1,
  rows: 1,
  iconSize: 40,
  gap: 26,
  showLabels: false,
};

function emptySystem(columns: number, rows: number): SocialStorySystem {
  const system = createSocialStorySystem(columns, rows, 0);
  return {
    ...system,
    states: system.states.map((state) => ({
      ...state,
      status: "empty" as const,
      viewAt: null,
      viewingUntil: null,
      leavingUntil: null,
      availableAt: 0,
      transmitAt: null,
      transmissionsRemaining: 0,
      transmittedAt: null,
    })),
  };
}

function averageDistanceToStory(school: AttentionSchool, index: number, field: FieldLayout) {
  const center = storyCenter(index, field);
  return school.fish.reduce(
    (total, fish) => total + Math.hypot(fish.x - center.x, fish.y - center.y),
    0,
  ) / school.fish.length;
}

test("attention school preserves deterministic IDs and proportional coordinates through resize", () => {
  const school = new AttentionSchool(layout, 100);
  const before = school.fish.map((fish) => ({ id: fish.id, x: fish.x, y: fish.y }));
  const expanded = { ...layout, width: 960, height: 480 };

  school.resize(expanded);

  assert.deepEqual(school.fish.map((fish) => fish.id), Array.from({ length: 100 }, (_, id) => id));
  for (const [index, fish] of school.fish.entries()) {
    assert.equal(fish.x, before[index]!.x * 2);
    assert.equal(fish.y, before[index]!.y * 1.5);
    assert.equal(fish.target, -1);
  }
});

test("activateStory is immutable, deterministic, and timestamps one valid keyword birth", () => {
  const system = emptySystem(3, 2);
  const first = activateStory(system, 4, 1_234);
  const second = activateStory(system, 4, 1_234);

  assert.deepEqual(first, second);
  assert.equal(system.states[4]!.status, "empty");
  assert.equal(first.states[4]!.status, "new");
  assert.equal(first.states[4]!.availableAt, 1_234);
  assert.deepEqual(first.nodes.map((node) => node.id), [
    "story-1", "story-2", "story-3", "story-4", "story-5", "story-6",
  ]);
  assert.equal(activateStory(system, -1, 1_234), system);
  assert.equal(activateStory(system, 6, 1_234), system);
});

test("one fresh keyword gathers the fixed school into its ring neighborhood", () => {
  let system = emptySystem(1, 1);
  system = activateStory(system, 0, 0);
  const school = new AttentionSchool(layout, 100);
  school.updateTargets(system);
  const initialDistance = averageDistanceToStory(school, 0, layout);

  for (let frame = 0; frame < 720; frame += 1) {
    school.step(1 / 24, frame * (1000 / 24));
  }

  const finalDistance = averageDistanceToStory(school, 0, layout);
  assert.ok(school.fish.every((fish) => fish.target === 0));
  assert.ok(finalDistance < initialDistance * 0.45, `${finalDistance} should gather from ${initialDistance}`);
});

test("dense school steps stay finite, bounded, and speed-capped", () => {
  let system = emptySystem(4, 3);
  for (let index = 0; index < system.nodes.length; index += 1) {
    system = activateStory(system, index, index * 40);
  }
  const denseLayout = { ...layout, columns: 4, rows: 3, width: 640, height: 420 };
  const school = new AttentionSchool(denseLayout, 100);
  school.updateTargets(system);

  for (let frame = 0; frame < 1_200; frame += 1) {
    school.step(1 / 24, frame * (1000 / 24));
  }

  assert.ok(school.fish.every((fish) => (
    Number.isFinite(fish.x) && Number.isFinite(fish.y) &&
    Number.isFinite(fish.vx) && Number.isFinite(fish.vy) &&
    fish.x >= 0 && fish.x < denseLayout.width &&
    fish.y >= 0 && fish.y < denseLayout.height &&
    Math.hypot(fish.vx, fish.vy) <= 96.000001
  )));
});

test("retargeting replaces old attention and an empty system clears all assignments", () => {
  const twoStoryLayout = { ...layout, columns: 1, rows: 2, height: 420 };
  let first = emptySystem(1, 2);
  first = activateStory(first, 0, 0);
  const school = new AttentionSchool(twoStoryLayout, 100);
  school.updateTargets(first);
  school.step(1 / 24, 0);
  assert.ok(school.fish.every((fish) => fish.target === 0));

  let retargeted = emptySystem(1, 2);
  retargeted = activateStory(retargeted, 1, 5_000);
  school.updateTargets(retargeted);
  school.step(1 / 24, 10_000);
  assert.ok(school.fish.every((fish) => fish.target === 1));

  school.updateTargets(emptySystem(1, 2));
  school.step(1 / 24, 20_000);
  assert.ok(school.fish.every((fish) => fish.target === -1));
});

test("a latest keyword's birth recency is strong enough to win a same-strength choice", () => {
  const twoStoryLayout = { ...layout, columns: 1, rows: 2, height: 420 };
  let system = emptySystem(1, 2);
  system = activateStory(system, 0, 0);
  system = activateStory(system, 1, 5_000);
  const school = new AttentionSchool(twoStoryLayout, 100);
  const midpoint = storyCenter(0, twoStoryLayout);
  const secondCenter = storyCenter(1, twoStoryLayout);
  for (const fish of school.fish) {
    fish.x = midpoint.x;
    fish.y = (midpoint.y + secondCenter.y) / 2;
    fish.vx = 0;
    fish.vy = 0;
  }

  school.updateTargets(system);
  school.step(1 / 24, 5_000);

  assert.ok(school.fish.every((fish) => fish.target === 1));
});
