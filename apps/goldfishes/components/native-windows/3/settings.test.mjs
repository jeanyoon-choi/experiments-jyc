import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, validateSettings, createPlan } from './settings.ts';

test('Terminal interruption is seeded and occurs at approximately 10 percent', () => {
  const plans = Array.from({ length: 100 }, (_, i) => createPlan({ ...defaults, seed: i + 1, steps: 120 }));
  const hits = plans.flat().filter(step => step.terminal).length;
  assert.ok(hits > 1000 && hits < 1400, `Unexpected count: ${hits}`);
  assert.deepEqual(plans[0], createPlan({ ...defaults, seed: 1, steps: 120 }));
});

test('revisit ratio preserves warmup and supports all-new or all-revisit after warmup', () => {
  const all = createPlan({ ...defaults, revisit: 100 });
  assert.ok(all.slice(0, 3).every(step => !step.revisit));
  assert.ok(all.slice(3).every(step => step.revisit));
  assert.ok(createPlan({ ...defaults, revisit: 0 }).every(step => !step.revisit));
  assert.throws(() => validateSettings({ ...defaults, revisit: 101 }));
});

test('default requested cadence is 300ms', () => {
  assert.equal(defaults.interval, .3);
  assert.ok(createPlan({ ...defaults, jitter: 0 }).every(step => step.intervalMs === 300));
});

test('execution uses an isolated validated snapshot', () => {
  const draft = { ...defaults, apps: ['chrome', 'slack'], interval: .7, steps: 12, jitter: 0 };
  const snapshot = validateSettings(draft);
  draft.apps.pop(); draft.interval = 4;
  assert.deepEqual(snapshot.apps, ['chrome', 'slack']);
  assert.equal(snapshot.interval, .7);
  const plan = createPlan(snapshot);
  assert.equal(plan.length, 12);
  assert.ok(plan.every(step => step.intervalMs === 700 && snapshot.apps.includes(step.app)));
});
test('seed replays the same plan and every browser event has a unique URL', () => {
  const settings = validateSettings({ ...defaults, jitter: 80, steps: 120 });
  const a = createPlan(settings);
  assert.deepEqual(a, createPlan(settings));
  assert.notDeepEqual(a, createPlan({ ...settings, seed: 2 }));
  assert.equal(new Set(a.map(step => step.page.url)).size, 120);
  assert.ok(a.every(step => step.app === 'chrome'));
  assert.ok(a.every(step => step.intervalMs >= 125 && step.intervalMs <= 900));
});
test('browser remains central even with Slack enabled', () => {
  const settings = validateSettings({ ...defaults, order: 'cycle', apps: ['slack', 'chrome'], movement: 0, size: 40, steps: 4 });
  assert.deepEqual(createPlan(settings).map(step => step.app), ['chrome', 'chrome', 'chrome', 'chrome']);
  assert.ok(createPlan(settings).every(step => step.bounds.join(',') === '70,60,510,348'));
  assert.ok(createPlan({ ...settings, slack: 100 }).every(step => step.slack));
});
test('malformed, excessive, and command-like settings are rejected', () => {
  for (const change of [{ apps: [] }, { apps: ['slack'] }, { apps: ['chrome', 'chrome'] }, { apps: ['shell'] }, { categories: [] }, { pageLimit: 51 }, { movingWindows: 5 }, { interval: .01 }, { steps: 10000 }, { steps: 2.5 }, { movement: NaN }, { seed: '1; open -a Terminal' }, { order: 'anything' }]) assert.throws(() => validateSettings({ ...defaults, ...change }));
});
test('window limit is bounded', () => {
  assert.throws(() => validateSettings({ ...defaults, windowCount: 51 }));
});
