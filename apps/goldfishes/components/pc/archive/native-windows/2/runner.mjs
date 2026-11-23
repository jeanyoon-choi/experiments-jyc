import { validateSettings, createPlan } from './settings.ts';
import { frameFor, eventSpacing } from '../shared/motion.ts';
import { createNativeSession, emit, prepareApps, runScore } from '../shared/native-session.mjs';
import { openPreview, openSlack, openTrialTerminal, windowId } from '../shared/native-apps.mjs';

// Version 2: Chrome windows are born up to `windowCount`, overlap, and drift
// continuously between events together with the trial Terminal.
const session = createNativeSession({ commandTimeoutMs: 22000, appleTimeoutSeconds: 20, timeoutMessage: '작업 시간 초과 또는 중단' });
const pages = ['https://en.wikipedia.org/wiki/Artificial_intelligence', 'https://news.ycombinator.com/', 'https://arxiv.org/list/cs.AI/recent', 'https://en.wikipedia.org/wiki/Quantum_computing', 'https://github.com/trending', 'https://en.wikipedia.org/wiki/Attention_economy', 'https://en.wikipedia.org/wiki/Metaverse', 'https://en.wikipedia.org/wiki/Algorithm'];
const TERMINAL_SLOT = 8;
const windows = [];
let terminalId;
let settings;
let created = 0;
let origin = 0;
const elapsed = () => (performance.now() - origin) / 1000;

async function setup(app) {
  if (app === 'chrome') await createWindow();
  if (app === 'terminal') terminalId = await openTrialTerminal(session);
  if (app === 'preview') await openPreview(session);
  if (app === 'slack') await openSlack(session);
}

async function createWindow() {
  if (created >= settings.windowCount) return;
  const slot = created;
  const bounds = frameFor(slot, origin ? elapsed() : 0, settings);
  const id = windowId(await session.apple(`tell application "Google Chrome"
    set w to make new window
    set URL of active tab of w to "${pages[slot]}"
    set bounds of w to {${bounds.join(', ')}}
    return id of w
  end tell`));
  windows.push({ id, slot });
  created++;
}

async function perform(step) {
  if (step.app === 'chrome') {
    if (step.birth) await createWindow();
    if (!windows.length) return;
    const chosen = step.birth ? windows.at(-1) : windows[step.channel % windows.length];
    await session.apple(`tell application "Google Chrome"
      set w to window id ${chosen.id}
      set index of w to 1
      activate
    end tell`);
  } else if (step.app === 'terminal') {
    if (!terminalId) return;
    await session.apple(`tell application "Terminal"
      set index of window id ${terminalId} to 1
      activate
    end tell`);
  } else await session.apple(`tell application "${step.app === 'preview' ? 'Preview' : 'Slack'}" to activate`);
}

/** Moves every tracked window two frames in one native call; forgets closed windows. */
async function drift() {
  const commands = ['set withdrawn to ""'];
  // Two frames per native call reduce process overhead; no overlapping calls.
  for (let frame = 0; frame < 2; frame++) {
    const t = elapsed() + frame * .125;
    const tracked = [...windows.map(w => ({ ...w, app: 'Google Chrome', kind: 'chrome' })), ...(terminalId ? [{ id: terminalId, slot: TERMINAL_SLOT, app: 'Terminal', kind: 'terminal' }] : [])];
    for (const w of tracked) {
      commands.push(`tell application "${w.app}"
        if exists window id ${w.id} then
          set bounds of window id ${w.id} to {${frameFor(w.slot, t, settings).join(', ')}}
        else
          set withdrawn to withdrawn & "${w.kind}:${w.id},"
        end if
      end tell`);
    }
    if (frame === 0) commands.push('delay 0.125');
  }
  commands.push('return withdrawn');
  const withdrawn = await session.apple(commands.join('\n'));
  for (const token of withdrawn.split(',')) {
    const [kind, id] = token.split(':');
    if (kind === 'chrome') { const index = windows.findIndex(w => w.id === id); if (index >= 0) windows.splice(index, 1); }
    if (kind === 'terminal' && terminalId === id) terminalId = undefined;
  }
}

await runScore(session, async () => {
  settings = validateSettings(JSON.parse(process.argv[2] || '{}'));
  const plan = createPlan(settings);
  await session.countdown(settings.countdown);
  let { unavailable, failures } = await prepareApps(session, settings.apps, setup);
  origin = performance.now();
  let motionFailed = false;
  for (const step of plan) {
    session.signal.throwIfAborted();
    const started = performance.now();
    let outcome = 'ok';
    try { if (unavailable.has(step.app)) throw new Error('준비 실패로 건너뜀'); await perform(step); }
    catch (error) { session.report(step.app, error); outcome = 'error'; failures++; }
    const targetMs = eventSpacing(step.intervalMs, (started - origin) / 1000, settings.jitter);
    emit({ phase: 'running', index: step.id + 1, app: step.app, outcome, elapsedMs: Math.round(performance.now() - started), targetMs });
    if (step.id === plan.length - 1) continue;
    // Drift at about 8 frames/second until the next event is due.
    while (performance.now() - started < targetMs && !motionFailed && (windows.length || terminalId)) {
      const frameStart = performance.now();
      try { await drift(); } catch (error) { session.report('motion', error); motionFailed = true; failures++; }
      await session.wait(Math.max(0, 250 - (performance.now() - frameStart)));
    }
    await session.wait(Math.max(0, targetMs - (performance.now() - started)));
  }
  return failures;
});
