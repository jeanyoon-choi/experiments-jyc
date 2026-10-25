import assert from "node:assert/strict";
import test from "node:test";
import { REACTION_DEFAULTS as OFF, ReactionPicker } from "./reactions.ts";

const REACTION_DEFAULTS = { ...OFF, heartOn: 1, likeOn: 1, commentOn: 1 };

const always = () => 0;

test("only now and then: a gap between any two, a rest per fish, a cap on the screen", () => {
  const parameters = { ...REACTION_DEFAULTS, chance: 100, gap: 1, most: 2 };
  const picker = new ReactionPicker();
  assert.equal(picker.pick(0, 1, 0, parameters, always), "heart");
  // Too soon after the last, anywhere.
  assert.equal(picker.pick(0.5, 2, 1, parameters, always), null);
  assert.ok(picker.pick(1.2, 2, 1, parameters, always));
  // The screen holds its most.
  assert.equal(picker.pick(3, 3, 2, parameters, always), null);
  // The same fish rests a while.
  assert.equal(picker.pick(3.5, 1, 0, parameters, always), null);
  assert.ok(picker.pick(9, 1, 0, parameters, always));
});

test("chance, the kinds' shares, and off", () => {
  const picker = new ReactionPicker();
  assert.equal(picker.pick(0, 1, 0, { ...REACTION_DEFAULTS, chance: 0 }, always), null);
  assert.equal(picker.pick(0, 1, 0, { ...OFF, chance: 100 }, always), null);
  // An off kind never comes, whatever its share.
  assert.equal(new ReactionPicker().pick(0, 1, 0, { ...REACTION_DEFAULTS, chance: 100, heartOn: 0, likeOn: 0 }, always), "comment");
  const onlyComments = { ...REACTION_DEFAULTS, chance: 100, gap: 0, heart: 0, like: 0, comment: 1 };
  assert.equal(picker.pick(10, 5, 0, onlyComments, always), "comment");
  let calls = 0;
  const likeRoll = () => (calls++ === 0 ? 0 : 0.6);
  assert.equal(new ReactionPicker().pick(0, 1, 0, { ...REACTION_DEFAULTS, chance: 100 }, likeRoll), "like");
});
