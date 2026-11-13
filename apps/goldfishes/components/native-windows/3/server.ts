import { createDesktopControl } from '../shared/control-server.ts';
import { validateSettings } from './settings.ts';

type Ownership = { browserIdentity: string; pages: { windowId: number; tabId: number; slot: number }[] };

// The server remembers which Chrome tabs this version created, so the next run
// (same Chrome process) can keep retiring only its own tabs.
export const { GET, POST } = createDesktopControl({
  runner: 'components/native-windows/3/runner.mjs',
  validate: validateSettings,
  args: state => [JSON.stringify(state.ownership4 ?? {})],
  report: ['pageCount', 'windowCount', 'title', 'kind'],
  onStart: state => { state.title = undefined; state.kind = undefined; },
  onEvent: (event, state) => {
    if (event.phase !== 'ownership') return;
    const ownership = event.ownership as Ownership;
    state.ownership4 = ownership;
    state.pageCount = ownership.pages.length;
    state.windowCount = new Set(ownership.pages.map(page => page.windowId)).size;
  },
  onRunning: (event, state) => { Object.assign(state, { pageCount: event.pageCount, windowCount: event.windowCount, title: event.title, kind: event.kind }); },
});
