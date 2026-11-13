import { spawn } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';

// Process plumbing for a runner launched by the control server. The runner
// reports progress to the server as newline-delimited JSON on stdout.

export const emit = data => console.log(JSON.stringify(data));

/**
 * One native session per run: SIGINT/SIGTERM abort the score and kill the
 * in-flight command; commands never overlap.
 */
export function createNativeSession({ commandTimeoutMs, appleTimeoutSeconds, timeoutMessage }) {
  const abort = new AbortController();
  const { signal } = abort;
  let child;
  const stop = () => { abort.abort(); child?.kill('SIGTERM'); process.exitCode = 130; };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);

  function execute(command, args) {
    signal.throwIfAborted();
    return new Promise((resolve, reject) => {
      const task = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      child = task;
      let output = '', error = '';
      const timer = setTimeout(() => task.kill('SIGTERM'), commandTimeoutMs);
      task.stdout.on('data', chunk => { output += chunk; });
      task.stderr.on('data', chunk => { error += chunk; });
      task.on('error', reason => { clearTimeout(timer); reject(reason); });
      task.on('close', code => {
        clearTimeout(timer);
        if (child === task) child = undefined;
        if (code === 0) resolve(output.trim()); else reject(new Error(error.trim() || timeoutMessage));
      });
    });
  }

  const apple = script => execute('/usr/bin/osascript', ['-e', `with timeout of ${appleTimeoutSeconds} seconds\n${script}\nend timeout`]);
  const wait = ms => pause(ms, undefined, { signal });

  /** Reports a recoverable failure unless the whole run was stopped. */
  function report(app, error, prefix = '') {
    signal.throwIfAborted();
    emit({ phase: 'error', app, error: `${prefix}${error.message}` });
  }

  async function countdown(seconds) {
    emit({ phase: 'countdown', message: `${seconds}초 후 준비 시작` });
    await wait(seconds * 1000);
  }

  return { signal, execute, apple, wait, report, countdown };
}

/** Runs a score body that resolves to its failure count, then reports the outcome. */
export async function runScore(session, body) {
  try {
    if (process.platform !== 'darwin') throw new Error('macOS에서 실행해주세요.');
    const failures = await body();
    emit({ phase: 'done', failures });
    if (failures) process.exitCode = 1;
  } catch (error) {
    if (session.signal.aborted) emit({ phase: 'stopped' });
    else { emit({ phase: 'error', error: error.message }); process.exitCode = 1; }
  }
}

/** Prepares each selected app once; apps that fail are skipped for the run. */
export async function prepareApps(session, apps, setup) {
  const unavailable = new Set();
  let failures = 0;
  for (const app of apps) {
    try { emit({ phase: 'preparing', app }); await setup(app); }
    catch (error) { session.report(app, error); unavailable.add(app); failures++; }
  }
  return { unavailable, failures };
}
