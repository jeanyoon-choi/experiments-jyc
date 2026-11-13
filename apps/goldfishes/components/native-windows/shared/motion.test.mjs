import test from 'node:test';
import assert from 'node:assert/strict';
import { frameFor, eventSpacing } from './motion.ts';

const defaults = { seed: 1, period: 9, spread: 90, breath: 40, size: 75, movement: 85, displayWidth: 1440, displayHeight: 900 };

test('native rectangles stay finite and inside display for varied formats and times', () => {
  for (const [displayWidth, displayHeight] of [[640, 480], [1440, 900], [2560, 1440]]) {
    const settings = { ...defaults, displayWidth, displayHeight, breath: 100, movement: 100, spread: 100 };
    for (let slot = 0; slot < 9; slot++) for (let t = 0; t < 30; t += .25) {
      const [x, y, right, bottom] = frameFor(slot, t, settings);
      assert.ok([x, y, right, bottom].every(Number.isFinite));
      assert.ok(x >= 0 && y >= 0 && right <= displayWidth && bottom <= displayHeight);
      assert.ok(right - x >= 360 && bottom - y >= 260);
    }
  }
});
test('motion is continuous, deterministic, and phase-separated', () => {
  const a = frameFor(0, 3, defaults);
  assert.deepEqual(a, frameFor(0, 3, defaults));
  assert.notDeepEqual(a, frameFor(1, 3, defaults));
  const next = frameFor(0, 3.01, defaults);
  assert.ok(a.every((value, i) => Math.abs(value - next[i]) <= 5));
  const still = { ...defaults, movement: 0, breath: 0 };
  assert.deepEqual(frameFor(0, 0, still), frameFor(0, 100, still));
});
test('zero irregularity retains cadence; pressure changes it within bounds', () => {
  assert.equal(eventSpacing(500, 4, 0), 500);
  const intervals = Array.from({ length: 100 }, (_, t) => eventSpacing(500, t, 100));
  assert.ok(new Set(intervals).size > 10);
  assert.ok(intervals.every(n => n >= 125 && n <= 1000));
});
