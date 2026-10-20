import assert from 'node:assert/strict';
import test from 'node:test';
import { sampleEyeBlinkPlan, sampleFirstBlinkDelay } from './eye-blink-timing.ts';

const sequence = (...values) => {
  let cursor = 0;
  return () => values[cursor++] ?? 0;
};

test('entry delay is independent, early, and deterministic', () => {
  assert.equal(sampleFirstBlinkDelay(sequence(0)), 180);
  assert.equal(sampleFirstBlinkDelay(sequence(.999999)), 920);
  assert.notEqual(
    sampleFirstBlinkDelay(sequence(.1)),
    sampleFirstBlinkDelay(sequence(.9)),
  );
});

test('a blink closes quickly, briefly dwells, then reopens more slowly', () => {
  const plan = sampleEyeBlinkPlan(sequence(0, 0, 0, 0, 0, .5, .5));
  assert.deepEqual(plan.steps.map(({ frame }) => frame), [1, 2, 4, 2, 1, 0]);
  assert.equal(plan.durationMs, 206);
  assert.equal(plan.isDoubleBlink, false);
  assert.equal(plan.nextDelayMs, 4700);

  const closingMs = plan.steps[0].holdMs + plan.steps[1].holdMs;
  const reopeningMs = plan.steps[3].holdMs + plan.steps[4].holdMs;
  assert.ok(closingMs < reopeningMs);
  assert.ok(plan.steps[2].holdMs <= 44, 'fully closed frame is only a short dwell');
  assert.equal(plan.steps.at(-1).holdMs, 0, 'returning open has no fake motion hold');
});

test('all sampled plans retain the natural duration and recurrence bounds', () => {
  for (const value of [0, .125, .5, .875, .999999]) {
    const plan = sampleEyeBlinkPlan(sequence(value, value, value, value, value, .5, value));
    assert.ok(plan.durationMs >= 206 && plan.durationMs <= 244);
    assert.equal(plan.steps.filter(({ frame }) => frame !== 0).length, 5);
    assert.ok(plan.nextDelayMs >= 2600 && plan.nextDelayMs <= 6800);
  }
});

test('an occasional double blink uses a short independent recovery interval', () => {
  const plan = sampleEyeBlinkPlan(sequence(.5, .5, .5, .5, .5, 0, .999999));
  assert.equal(plan.isDoubleBlink, true);
  assert.equal(plan.nextDelayMs, 210);
});
