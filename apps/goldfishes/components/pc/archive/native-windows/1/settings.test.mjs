import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, validateSettings, createPlan } from './settings.ts';

test('execution uses an isolated validated snapshot', () => {
  const draft = { ...defaults, apps: ['chrome', 'slack'], interval: .7, steps: 12 };
  const snapshot = validateSettings(draft);
  draft.apps.pop(); draft.interval = 4;
  assert.deepEqual(snapshot.apps, ['chrome', 'slack']);
  assert.equal(snapshot.interval, .7);
  const plan = createPlan(snapshot);
  assert.equal(plan.length, 12);
  assert.ok(plan.every(step => step.intervalMs === 700 && snapshot.apps.includes(step.app)));
});
test('seed replays the same plan and random transitions do not repeat an app', () => {
  const settings = validateSettings({ ...defaults, jitter: 80, steps: 120 });
  const a = createPlan(settings);
  assert.deepEqual(a, createPlan(settings));
  assert.notDeepEqual(a, createPlan({ ...settings, seed: 2 }));
  assert.ok(a.every((step, index) => index === 0 || step.app !== a[index - 1].app));
  assert.ok(a.every(step => step.intervalMs >= 100 && step.intervalMs <= 900));
});
test('cycle order, fixed bounds and single-app execution work', () => {
  const settings = validateSettings({ ...defaults, order: 'cycle', apps: ['slack', 'chrome'], movement: 0, size: 40, steps: 4 });
  assert.deepEqual(createPlan(settings).map(step => step.app), ['slack', 'chrome', 'slack', 'chrome']);
  assert.ok(createPlan(settings).every(step => step.bounds.join(',') === '70,60,510,348'));
  assert.ok(createPlan({ ...settings, apps: ['preview'] }).every(step => step.app === 'preview'));
});
test('malformed, excessive, and command-like settings are rejected', () => {
  for (const change of [{ apps: [] }, { apps: ['chrome', 'chrome'] }, { apps: ['shell'] }, { interval: .01 }, { steps: 10000 }, { steps: 2.5 }, { movement: NaN }, { seed: '1; open -a Terminal' }, { order: 'anything' }]) assert.throws(() => validateSettings({ ...defaults, ...change }));
});
