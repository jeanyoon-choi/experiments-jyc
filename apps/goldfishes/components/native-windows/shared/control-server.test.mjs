import assert from 'node:assert/strict';
import test from 'node:test';
import { createDesktopControl } from './control-server.ts';

const { GET, POST } = createDesktopControl({ runner: 'missing-runner.mjs', validate: () => { throw new Error('never started'); } });

// Exercises admission only: never submit a start action or launch an application.
test('desktop control rejects remote hosts and cross-origin requests', async () => {
  const previous = { mode: process.env.NODE_ENV, enabled: process.env.GOLDFISHES_DESKTOP };
  process.env.NODE_ENV = 'development';
  delete process.env.GOLDFISHES_DESKTOP;
  const make = (overrides = {}) => new Request('https://localhost:2001/api/desktop', {
    method: 'POST', headers: { host: 'localhost:2001', origin: 'https://localhost:2001', 'sec-fetch-site': 'same-origin', 'content-type': 'application/json', ...overrides },
    body: JSON.stringify({ action: 'stop' }),
  });
  try {
    assert.equal(GET(new Request('https://example.com/api/desktop', { headers: { host: 'example.com' } })).status, 403);
    assert.equal((await POST(make({ origin: 'https://example.com' }))).status, 403);
    assert.equal((await POST(make({ 'sec-fetch-site': 'cross-site' }))).status, 403);
    assert.equal((await POST(make({ 'content-type': 'text/plain' }))).status, 403);
    assert.equal((await POST(make())).status, process.platform === 'darwin' ? 200 : 403);
    assert.equal(GET(new Request('https://macbook-air-5.local:2001/api/desktop', { headers: { host: 'macbook-air-5.local:2001' } })).status, 200);
    assert.equal((await POST(make({ host: 'macbook-air-5.local:2001', origin: 'https://macbook-air-5.local:2001' }))).status, process.platform === 'darwin' ? 200 : 403);
    assert.equal((await POST(make({ host: 'macbook-air-5.local:2001', origin: 'https://example.com' }))).status, 403);
    assert.equal((await POST(make({ host: 'macbook-air-5.local.attacker.example:2001', origin: 'https://macbook-air-5.local.attacker.example:2001' }))).status, 403);
    const status = await GET(new Request('https://macbook-air-5.local:2001/api/desktop', { headers: { host: 'macbook-air-5.local:2001' } })).json();
    assert.equal(status.enabled, process.platform === 'darwin');
    process.env.NODE_ENV = 'production';
    assert.equal((await POST(make())).status, 403);
  } finally {
    if (previous.mode === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous.mode;
    if (previous.enabled === undefined) delete process.env.GOLDFISHES_DESKTOP; else process.env.GOLDFISHES_DESKTOP = previous.enabled;
  }
});
