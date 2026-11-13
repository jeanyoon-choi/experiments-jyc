import { categories, createDeck, type Category } from './catalog.ts';
import { createRandom, jitteredInterval, jumpBounds, readSettingsInput, snapshot, validateApps, validateOrder, validateRanges, type Order } from '../shared/settings.ts';

export const apps = ['chrome', 'slack'] as const;
export type App = typeof apps[number];
export const appNames: Record<App, string> = { chrome: 'Chrome', slack: 'C-VAL Slack' };
export type Settings = { revisit: number; interval: number; steps: number; countdown: number; jitter: number; movement: number; size: number; seed: number; order: Order; apps: App[]; categories: Category[]; pageLimit: number; windowCount: number; period: number; birth: number; spread: number; breath: number; movingWindows: number; scroll: number; slack: number; displayWidth: number; displayHeight: number };
export const defaults: Settings = { revisit: 40, interval: .3, steps: 60, countdown: 3, jitter: 60, movement: 85, size: 75, seed: 1, order: 'random', apps: ['chrome'], categories: [...categories], pageLimit: 16, windowCount: 8, period: 9, birth: 60, spread: 90, breath: 40, movingWindows: 3, scroll: 35, slack: 10, displayWidth: 1440, displayHeight: 900 };
export const ranges = { revisit: [0, 100, 1], interval: [.2, 5, .1], steps: [1, 120, 1], countdown: [0, 10, 1], jitter: [0, 100, 1], movement: [0, 100, 1], size: [40, 100, 1], seed: [1, 999999, 1], pageLimit: [1, 50, 1], windowCount: [1, 50, 1], period: [2, 30, 1], birth: [0, 100, 1], spread: [0, 100, 1], breath: [0, 100, 1], movingWindows: [0, 4, 1], scroll: [0, 100, 1], slack: [0, 100, 1], displayWidth: [640, 7680, 1], displayHeight: [480, 4320, 1] } as const;

export function validateSettings(value: unknown): Settings {
  const input = readSettingsInput(value);
  validateRanges(input, ranges);
  validateOrder(input);
  validateApps(input, apps);
  if (!(input.apps as string[]).includes('chrome')) throw new Error('3버전은 Chrome을 사용합니다.');
  if (!Array.isArray(input.categories) || !input.categories.length || new Set(input.categories).size !== input.categories.length || input.categories.some(category => !categories.includes(category as Category))) throw new Error('웹사이트 종류를 선택해주세요.');
  return snapshot<Settings>(input, [...Object.keys(ranges), 'order', 'apps', 'categories'], ['apps', 'categories']);
}

/**
 * Every step is a Chrome event: a new page from the seeded deck, or (after the
 * first three) a revisit of an earlier tab. Scroll, Slack and Terminal are
 * independent interruptions drawn per step.
 */
export function createPlan(settings: Settings) {
  const random = createRandom(settings.seed);
  const deck = createDeck(settings.categories, settings.seed, settings.steps);
  return Array.from({ length: settings.steps }, (_, i) => {
    const intervalMs = jitteredInterval(settings, random);
    const bounds = jumpBounds(settings, random);
    return { revisit: i >= 3 && random() * 100 < settings.revisit, pick: random(), id: i, app: 'chrome' as App, page: deck[i], intervalMs: Math.max(125, intervalMs), bounds, birth: i === 0 || random() * 100 < settings.birth, scroll: random() * 100 < settings.scroll, upward: random() < .2, slack: settings.apps.includes('slack') && random() * 100 < settings.slack, terminal: random() < .1 };
  });
}
