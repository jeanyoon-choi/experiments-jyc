import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

// Local start/stop control for a native-windows runner. Every version shares one
// process slot (the desktop can host one score at a time) and one admission
// policy: development on macOS, an approved local host, same-origin HTTPS, JSON.

type RunSettings = { steps: number; interval: number; countdown: number };
type RunnerEvent = { phase?: string; app?: string; error?: unknown; index?: number; elapsedMs?: number; targetMs?: number; [key: string]: unknown };
export type DesktopState = {
  child: ChildProcess | null;
  message: string;
  timeout?: ReturnType<typeof setTimeout>;
  settings?: RunSettings;
  progress?: number;
  errors?: { id: number; text: string }[];
  lastAction?: string;
  elapsedMs?: number;
  targetMs?: number;
  [extra: string]: unknown;
};

type Options<S extends RunSettings> = {
  /** Runner path relative to the Goldfishes app root. */
  runner: string;
  validate: (input: unknown) => S;
  /** Extra runner arguments after the settings JSON. */
  args?: (state: DesktopState) => string[];
  /** Version-specific status fields added to every reply. */
  report?: readonly string[];
  onStart?: (state: DesktopState) => void;
  /** Sees every runner event before stop handling. */
  onEvent?: (event: RunnerEvent, state: DesktopState) => void;
  onRunning?: (event: RunnerEvent, state: DesktopState) => void;
};

const STOPPING = '중단 중…';
const hosts = ['localhost', '127.0.0.1', '[::1]', 'macbook-air-5.local'];
// Survives dev-server module reloads so an in-flight score stays controllable.
const shared = globalThis as typeof globalThis & { goldfishesDesktop?: DesktopState };
const state = shared.goldfishesDesktop ??= { child: null, message: '준비' };
const enabled = () => process.platform === 'darwin' && process.env.NODE_ENV === 'development';

function local(request: Request) {
  try {
    return hosts.includes(new URL(`https://${request.headers.get('host')}`).hostname);
  } catch { return false; }
}

function admitted(request: Request) {
  return enabled()
    && local(request)
    && request.headers.get('origin') === `https://${request.headers.get('host')}`
    && request.headers.get('sec-fetch-site') === 'same-origin'
    && request.headers.get('content-type') === 'application/json';
}

export function createDesktopControl<S extends RunSettings>(options: Options<S>) {
  function reply(status = 200) {
    const extra = Object.fromEntries((options.report ?? []).map(key => [key, state[key]]));
    return Response.json({ enabled: enabled(), running: !!state.child, message: state.message, settings: state.settings, progress: state.progress ?? 0, errors: state.errors ?? [], lastAction: state.lastAction, elapsedMs: state.elapsedMs, targetMs: state.targetMs, ...extra }, { status, headers: { 'Cache-Control': 'no-store' } });
  }

  function start(settings: S) {
    const script = [path.resolve(process.cwd(), options.runner), path.resolve(process.cwd(), 'apps/goldfishes', options.runner)].find(existsSync);
    if (!script) return Response.json({ message: '로컬 실행 파일을 찾지 못했습니다.' }, { status: 503 });
    const child = spawn(process.execPath, ['--experimental-strip-types', script, JSON.stringify(settings), ...(options.args?.(state) ?? [])], { stdio: ['ignore', 'pipe', 'pipe'] });
    Object.assign(state, { child, settings, progress: 0, errors: [], lastAction: undefined, elapsedMs: undefined, targetMs: undefined });
    options.onStart?.(state);
    state.message = `${settings.countdown}초 후 준비 시작`;
    let failed = false;
    let stopped = false;
    let buffer = '';
    let errorId = 0;
    const handle = (event: RunnerEvent) => {
      options.onEvent?.(event, state);
      if (event.phase === 'error') { failed = true; state.errors = [...(state.errors ?? []), { id: errorId++, text: `${event.app ?? '실행'}: ${String(event.error).slice(0, 500)}` }].slice(-12); }
      if (state.message === STOPPING) return;
      if (event.phase === 'preparing') state.message = `${event.app} 준비 중`;
      if (event.phase === 'running') {
        Object.assign(state, { message: '실행 중', progress: event.index, lastAction: event.app, elapsedMs: event.elapsedMs, targetMs: event.targetMs });
        options.onRunning?.(event, state);
      }
    };
    // The runner speaks newline-delimited JSON on stdout.
    child.stdout?.on('data', chunk => {
      buffer += chunk.toString();
      const lines = buffer.split('\n'); buffer = lines.pop() ?? '';
      for (const line of lines) {
        try { handle(JSON.parse(line)); } catch { /* Ignore non-protocol output. */ }
      }
    });
    child.stderr?.on('data', chunk => { console.error('[goldfishes desktop]', chunk.toString().slice(0, 1000)); });
    child.on('error', error => { failed = true; state.errors?.push({ id: errorId++, text: error.message }); });
    // Watchdog: a score can never outlive its planned length by much.
    state.timeout = setTimeout(() => { stopped = true; child.kill('SIGTERM'); }, Math.min(900000, 90000 + settings.steps * settings.interval * 2000));
    child.on('close', code => {
      if (state.child !== child) return;
      clearTimeout(state.timeout);
      const requestedStop = state.message === STOPPING;
      state.child = null;
      state.message = requestedStop || stopped ? '중단됨 · 창은 남아 있습니다.' : failed || code !== 0 ? '오류와 함께 종료됨' : '완료 · 창은 남아 있습니다.';
    });
    return reply(202);
  }

  function GET(request: Request) {
    if (!local(request)) return Response.json({ message: 'macbook-air-5.local 또는 localhost에서 열어주세요.' }, { status: 403 });
    return reply();
  }

  async function POST(request: Request) {
    if (!admitted(request)) return Response.json({ message: '로컬 HTTPS 실행 권한이 필요합니다.' }, { status: 403 });
    let action: unknown;
    let input: unknown;
    try { const body = await request.json(); action = body.action; input = body.settings; } catch { return new Response(null, { status: 400 }); }
    if (action === 'stop') {
      if (state.child) {
        state.message = STOPPING;
        state.child.kill('SIGTERM');
      }
      return reply();
    }
    if (action !== 'start') return new Response(null, { status: 400 });
    if (state.child) return reply(409);
    let settings: S;
    try { settings = options.validate(input); } catch (error) { return Response.json({ message: (error as Error).message }, { status: 400 }); }
    return start(settings);
  }

  return { GET, POST };
}
