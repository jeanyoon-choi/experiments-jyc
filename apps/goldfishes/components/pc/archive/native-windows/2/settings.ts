import { createRandom, jitteredInterval, jumpBounds, readSettingsInput, snapshot, validateApps, validateOrder, validateRanges, type Order } from '../shared/settings.ts';

export const apps = ['chrome', 'terminal', 'preview', 'slack'] as const;
export type App = typeof apps[number];
export const appNames: Record<App, string> = { chrome: 'Chrome', terminal: 'Terminal', preview: 'Preview', slack: 'C-VAL Slack' };
export type Settings = { interval: number; steps: number; countdown: number; jitter: number; movement: number; size: number; seed: number; order: Order; apps: App[]; windowCount: number; period: number; birth: number; spread: number; breath: number; displayWidth: number; displayHeight: number };
export const defaults: Settings = { interval: .5, steps: 60, countdown: 3, jitter: 75, movement: 85, size: 75, seed: 1, order: 'random', apps: [...apps], windowCount: 5, period: 9, birth: 70, spread: 90, breath: 40, displayWidth: 1440, displayHeight: 900 };
export const ranges = { interval: [.2, 5, .1], steps: [1, 120, 1], countdown: [0, 10, 1], jitter: [0, 100, 1], movement: [0, 100, 1], size: [40, 100, 1], seed: [1, 999999, 1], windowCount: [1, 8, 1], period: [2, 30, 1], birth: [0, 100, 1], spread: [0, 100, 1], breath: [0, 100, 1], displayWidth: [640, 7680, 1], displayHeight: [480, 4320, 1] } as const;

export function validateSettings(value: unknown): Settings {
  const input = readSettingsInput(value);
  validateRanges(input, ranges);
  validateOrder(input);
  validateApps(input, apps);
  return snapshot<Settings>(input, [...Object.keys(ranges), 'order', 'apps'], ['apps']);
}

/** Version 1's app order plus Chrome window births (`birth`) and a focus channel. */
export function createPlan(settings: Settings) {
  const random = createRandom(settings.seed);
  let previous: App | undefined;
  return Array.from({ length: settings.steps }, (_, i) => {
    const available = settings.apps.length > 1 ? settings.apps.filter(app => app !== previous) : settings.apps;
    const app = settings.order === 'cycle' ? settings.apps[i % settings.apps.length] : available[Math.floor(random() * available.length)];
    previous = app;
    const intervalMs = jitteredInterval(settings, random);
    const bounds = jumpBounds(settings, random);
    return { id: i, app, intervalMs: Math.max(125, intervalMs), tab: 1 + Math.floor(random() * 3), bounds, birth: random() * 100 < settings.birth, channel: Math.floor(random() * settings.windowCount) };
  });
}
