'use client';

import { useEffect, useRef, useState } from 'react';

export type DesktopStatus<Settings, App> = {
  enabled: boolean;
  running: boolean;
  message: string;
  settings?: Settings;
  progress: number;
  errors: { id: number; text: string }[];
  lastAction?: App;
  elapsedMs?: number;
  targetMs?: number;
};

/**
 * Polls a version's control endpoint every 500 ms and sends start/stop with a
 * frozen settings snapshot. Polling pauses while a request is in flight.
 */
export function useDesktopControl<Status extends DesktopStatus<unknown, unknown>>(endpoint: string) {
  const [status, setStatus] = useState<Status>({ enabled: false, running: false, message: '연결 중…', progress: 0, errors: [] } as unknown as Status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const requestActive = useRef(false);

  useEffect(() => {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        if (requestActive.current) return;
        const response = await fetch(endpoint, { cache: 'no-store', signal: abort.signal });
        const next = await response.json();
        if (!response.ok) throw new Error(next.message);
        if (!requestActive.current) setStatus(next);
      } catch (reason) {
        if (!abort.signal.aborted) setError(reason instanceof Error ? reason.message : '연결할 수 없습니다.');
      } finally { if (!abort.signal.aborted) timer = setTimeout(poll, 500); }
    }
    void poll();
    return () => { abort.abort(); clearTimeout(timer); };
  }, [endpoint]);

  async function act(action: 'start' | 'stop', settings: unknown) {
    if (requestActive.current) return;
    requestActive.current = true; setBusy(true); setError('');
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, settings }) });
      const next = await response.json();
      if (!response.ok && response.status !== 409) throw new Error(next.message || '실행할 수 없습니다.');
      setStatus(next);
    } catch (reason) { setError(reason instanceof Error ? reason.message : '실행할 수 없습니다.'); }
    finally { requestActive.current = false; setBusy(false); }
  }

  return { status, busy, error, act };
}

/** The display a run should target, clamped to the validated range. */
export function displaySize() {
  return { displayWidth: Math.max(640, Math.min(7680, window.screen.availWidth)), displayHeight: Math.max(480, Math.min(4320, window.screen.availHeight)) };
}
