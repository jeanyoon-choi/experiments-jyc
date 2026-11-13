import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { setTimeout as pause } from 'node:timers/promises';
import { preparePreview, slackChannelUrl } from '../shared/native-apps.mjs';

// Native-app material trial. No server, dependencies or generated shell commands.
const atlas = fileURLToPath(new URL('../../../public/images/0908/tech-keyword-atlas/tech-keyword-atlas-v1.png', import.meta.url));
const cancellation = new AbortController();
const fast = process.argv.includes('--fast');
let activeChild;
const stop = () => {
  cancellation.abort();
  activeChild?.kill('SIGTERM');
  process.exitCode = 130;
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);

function apple(script, args = []) {
  cancellation.signal.throwIfAborted();
  return new Promise((resolve, reject) => {
    const child = spawn('/usr/bin/osascript', ['-e', `on run argv\nwith timeout of 20 seconds\n${script}\nend timeout\nend run`, ...args]);
    activeChild = child;
    let output = '';
    let error = '';
    const timeout = setTimeout(() => child.kill('SIGTERM'), 22000);
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { error += chunk; });
    child.on('error', reject);
    child.on('close', code => {
      clearTimeout(timeout);
      if (activeChild === child) activeChild = undefined;
      if (code === 0) resolve(output.trim());
      else reject(new Error(error.trim() || 'Apple event interrupted or timed out'));
    });
  });
}

let chromeId;
let terminalId;
let failures = 0;
const numericId = value => {
  if (!/^\d+$/.test(value)) throw new Error('Application returned no numeric window ID');
  return value;
};
const chrome = (tab, bounds) => {
  if (!chromeId) throw new Error('Trial Chrome window unavailable');
  return apple(`tell application "Google Chrome"
    set w to window id ${chromeId}
    set active tab index of w to ${tab}
    set bounds of w to {${bounds.join(', ')}}
    set index of w to 1
    activate
  end tell`);
};
const terminal = bounds => {
  if (!terminalId) throw new Error('Trial Terminal window unavailable');
  return apple(`tell application "Terminal"
    set w to window id ${terminalId}
    set bounds of w to {${bounds.join(', ')}}
    set index of w to 1
    activate
  end tell`);
};
const preview = async () => {
  const staged = await preparePreview();
  await new Promise((resolve, reject) => {
    const task = spawn('/usr/bin/open', ['-a', 'Preview', staged]);
    task.on('error', reject);
    task.on('close', code => code === 0 ? resolve() : reject(new Error('Preview 파일 열기 실패')));
  });
};
const slack = () => apple(`open location "${slackChannelUrl}"`);

const score = [
  ['open Chrome', 2200, async () => {
    chromeId = numericId(await apple(`tell application "Google Chrome"
      set w to make new window
      set URL of active tab of w to "https://en.wikipedia.org/wiki/Artificial_intelligence"
      tell w
        make new tab with properties {URL:"https://en.wikipedia.org/wiki/Quantum_computing"}
        make new tab with properties {URL:"https://en.wikipedia.org/wiki/Attention_economy"}
      end tell
      set active tab index of w to 1
      set bounds of w to {50, 60, 950, 700}
      activate
      return id of w
    end tell`));
  }],
  ['open Terminal', 1800, async () => {
    terminalId = numericId(await apple(`tell application "Terminal"
      set t to do script "uname -sm; uptime"
      set w to front window
      set bounds of w to {330, 180, 1050, 640}
      activate
      return id of w
    end tell`));
  }],
  ['open atlas', 2000, preview],
  ['C-VAL Slack', 2000, slack],
  ['quantum', 1800, () => chrome(2, [220, 80, 1120, 720])],
  ['terminal', 1200, () => terminal([70, 220, 790, 680])],
  ['attention', 1500, () => chrome(3, [80, 140, 980, 740])],
  ['C-VAL Slack', 1300, slack],
  ['AI', 1100, () => chrome(1, [300, 60, 1200, 700])],
  ['terminal', 900, () => terminal([200, 100, 920, 560])],
  ['quantum', 800, () => chrome(2, [100, 180, 1000, 780])],
  ['C-VAL Slack', 800, slack],
  ['attention', 1600, () => chrome(3, [260, 100, 1160, 740])],
  ['terminal', 1200, () => terminal([80, 240, 800, 700])],
  ['AI', 0, () => chrome(1, [200, 80, 1100, 720])],
];

try {
  if (process.platform !== 'darwin') throw new Error('Desktop A requires macOS');
  await access(atlas);
  console.log('Desktop A starts in 3 seconds. Ctrl-C here stops the score; created windows remain.');
  await pause(3000, undefined, { signal: cancellation.signal });
  for (const [label, delay, action] of score) {
    cancellation.signal.throwIfAborted();
    const started = performance.now();
    try {
      await action();
      console.log(`OK ${label}`);
    } catch (error) {
      cancellation.signal.throwIfAborted();
      failures++;
      console.error(`FAILED ${label}: ${error.message}`);
    }
    // Fast mode targets 500 ms between action starts; slow OS calls never overlap.
    const wait = fast ? Math.max(0, 500 - (performance.now() - started)) : delay;
    await pause(wait, undefined, { signal: cancellation.signal });
  }
  console.log(`Score ended; ${failures} failed actions. Windows left in place.`);
  if (failures) process.exitCode = 1;
} catch (error) {
  if (cancellation.signal.aborted) console.log('Score stopped. Windows left in place.');
  else { console.error(error.message); process.exitCode = 1; }
}
