import { validateSettings, createPlan } from './settings.ts';
import { createNativeSession, emit, prepareApps, runScore } from '../shared/native-session.mjs';
import { openPreview, openSlack, openTrialTerminal, windowId } from '../shared/native-apps.mjs';

// Version 1: one trial Chrome window (three tabs) and one Terminal window jump
// between seeded bounds; Preview and Slack are brought forward.
const session = createNativeSession({ commandTimeoutMs: 22000, appleTimeoutSeconds: 20, timeoutMessage: '작업 시간 초과 또는 중단' });
const ids = {};

async function setup(app) {
  if (app === 'chrome') ids.chrome = windowId(await session.apple(`tell application "Google Chrome"
    set w to make new window
    set URL of active tab of w to "https://en.wikipedia.org/wiki/Artificial_intelligence"
    tell w
      make new tab with properties {URL:"https://en.wikipedia.org/wiki/Quantum_computing"}
      make new tab with properties {URL:"https://en.wikipedia.org/wiki/Attention_economy"}
    end tell
    return id of w
  end tell`));
  if (app === 'terminal') ids.terminal = await openTrialTerminal(session);
  if (app === 'preview') await openPreview(session);
  if (app === 'slack') await openSlack(session);
}

async function perform(step) {
  if (step.app === 'chrome' || step.app === 'terminal') {
    const name = step.app === 'chrome' ? 'Google Chrome' : 'Terminal';
    await session.apple(`tell application "${name}"
      set w to window id ${ids[step.app]}
      ${step.app === 'chrome' ? `set active tab index of w to ${step.tab}` : ''}
      set bounds of w to {${step.bounds.join(', ')}}
      set index of w to 1
      activate
    end tell`);
  } else await session.apple(`tell application "${step.app === 'preview' ? 'Preview' : 'Slack'}" to activate`);
}

await runScore(session, async () => {
  const settings = validateSettings(JSON.parse(process.argv[2] || '{}'));
  const plan = createPlan(settings);
  await session.countdown(settings.countdown);
  let { unavailable, failures } = await prepareApps(session, settings.apps, setup);
  for (const step of plan) {
    session.signal.throwIfAborted();
    const started = performance.now();
    let outcome = 'ok';
    try { if (unavailable.has(step.app)) throw new Error('준비 실패로 건너뜀'); await perform(step); }
    catch (error) { session.report(step.app, error); outcome = 'error'; failures++; }
    emit({ phase: 'running', index: step.id + 1, app: step.app, outcome, elapsedMs: Math.round(performance.now() - started), targetMs: step.intervalMs });
    if (step.id < plan.length - 1) await session.wait(Math.max(0, step.intervalMs - (performance.now() - started)));
  }
  return failures;
});
