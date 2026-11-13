import { validateSettings, createPlan } from './settings.ts';
import { frameFor, eventSpacing } from '../shared/motion.ts';
import { createNativeSession, emit, runScore } from '../shared/native-session.mjs';
import { openSlack } from '../shared/native-apps.mjs';
import { closeScript, creationScript, scrollScript, reconcile, cadence, chooseRevisit, focusScript, inventoryScript, parseInventory } from './browser.mjs';

// Version 3: new pages open as windows or tabs, earlier tabs are revisited, the
// oldest owned tabs retire past `pageLimit`, and recent windows drift. Slack,
// Terminal and scrolling interrupt independently.
const session = createNativeSession({ commandTimeoutMs: 10000, appleTimeoutSeconds: 8, timeoutMessage: '명령 시간 초과 또는 중단' });
const CHROME_BINARY = '/Google Chrome.app/Contents/MacOS/Google Chrome';
let pages = [], browserIdentity = '', failures = 0;
const windowsOf = list => [...new Set(list.map(page => page.windowId))];
const ownership = () => emit({ phase: 'ownership', ownership: { browserIdentity, pages } });
const inventory = async () => parseInventory(await session.apple(inventoryScript));

/** Closes the oldest owned tab and confirms it is gone before continuing. */
async function retire() {
  const oldest = pages[0];
  if (!oldest) return;
  await session.apple(closeScript(oldest));
  const live = await inventory();
  if (live.some(p => p.tabId === oldest.tabId && p.windowId === oldest.windowId)) throw new Error('오래된 탭을 닫지 못해 생성을 중단합니다.');
  pages = reconcile(pages, live);
  ownership();
}

/** Identifies the running Chrome process so tab ownership never carries across restarts. */
async function identifyBrowser() {
  await session.apple('tell application "Google Chrome" to launch');
  const processes = await session.execute('/bin/ps', ['-axo', 'pid=,lstart=,comm=']);
  const identity = processes.split('\n').find(line => line.trim().endsWith(CHROME_BINARY))?.trim() || '';
  if (!identity) throw new Error('Chrome 실행 식별자를 확인하지 못했습니다. 안전한 탭 관리를 위해 중단합니다.');
  return identity;
}

/** Opens the step's page as a new window or a tab in the newest window. */
async function openPage(step, settings, origin) {
  while (pages.length >= settings.pageLimit) await retire();
  let windows = windowsOf(pages);
  if (step.birth) {
    while (windows.length >= Math.min(settings.windowCount, settings.pageLimit) && pages.length) {
      await retire();
      windows = windowsOf(pages);
    }
  }
  const targetWindow = !step.birth && windows.length ? windows.at(-1) : null;
  const [windowId, tabId] = (await session.apple(creationScript(step.page.url, targetWindow))).split(':').map(Number);
  if (![windowId, tabId].every(n => Number.isSafeInteger(n) && n > 0)) throw new Error('새 탭 ID 확인 실패. 추가 생성을 중단합니다.');
  const page = { windowId, tabId, slot: step.id, title: step.page.title };
  pages.push(page);
  ownership();
  await session.apple(`tell application "Google Chrome" to set bounds of window id ${windowId} to {${frameFor(step.id, (performance.now() - origin) / 1000, settings).join(', ')}}`);
  return { page, kind: targetWindow ? 'tab' : 'window' };
}

await runScore(session, async () => {
  const settings = validateSettings(JSON.parse(process.argv[2] || '{}'));
  const previous = JSON.parse(process.argv[3] || '{}');
  await session.countdown(settings.countdown);
  browserIdentity = await identifyBrowser();
  if (previous.browserIdentity === browserIdentity && Array.isArray(previous.pages)) pages = reconcile(previous.pages, await inventory());
  ownership();
  while (pages.length > settings.pageLimit) await retire();
  const plan = createPlan(settings);
  const origin = performance.now();
  let average = 0, slow = 0, scrolling = true, moving = true, previousTabId;
  for (const step of plan) {
    session.signal.throwIfAborted();
    const started = performance.now();
    pages = reconcile(pages, await inventory());
    let current = step.revisit ? chooseRevisit(pages, previousTabId, step.pick) : undefined;
    let kind = 'revisit';
    if (current && await session.apple(focusScript(current)) !== 'focused') current = undefined;
    if (!current) ({ page: current, kind } = await openPage(step, settings, origin));
    previousTabId = current.tabId;
    if (step.scroll && scrolling) {
      try { await session.apple(scrollScript(current, step.upward)); }
      catch (error) { session.report('scroll', error, '스크롤 중지: '); scrolling = false; failures++; }
    }
    if (step.slack) {
      try { await openSlack(session); }
      catch (error) { session.report('slack', error); failures++; }
    }
    if (step.terminal) {
      try { await session.execute('/usr/bin/open', ['-a', 'Terminal']); }
      catch (error) { session.report('terminal', error); failures++; }
    }
    // Backpressure: slow native commands and many pages stretch the cadence.
    const elapsed = performance.now() - started;
    average = average ? average * .7 + elapsed * .3 : elapsed;
    slow = elapsed > 4000 ? slow + 1 : 0;
    const targetMs = cadence(eventSpacing(step.intervalMs, (started - origin) / 1000, settings.jitter), average, pages.length);
    emit({ phase: 'running', index: step.id + 1, app: 'chrome', elapsedMs: Math.round(elapsed), targetMs, pageCount: pages.length, windowCount: windowsOf(pages).length, title: current.title ?? '이전에 열린 탭', kind });
    if (slow >= 3) throw new Error('3회 연속 명령 처리가 4초를 넘어 생성을 중단했습니다. 페이지 상한을 낮춰주세요.');
    if (step.id === plan.length - 1) break;
    if (moving && settings.movingWindows && average < 1000 && targetMs - elapsed > 250) {
      const recent = [...new Map(pages.map(p => [p.windowId, p])).values()].slice(-settings.movingWindows);
      try {
        await session.apple(`tell application "Google Chrome"\n${recent.map(p => `if exists window id ${p.windowId} then set bounds of window id ${p.windowId} to {${frameFor(p.slot, (performance.now() - origin) / 1000, settings).join(', ')}}`).join('\n')}\nend tell`);
      } catch (error) { session.report('motion', error); moving = false; failures++; }
    }
    await session.wait(Math.max(0, targetMs - (performance.now() - started)));
  }
  return failures;
});
