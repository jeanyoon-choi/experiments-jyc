import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcile, closeScript, creationScript, scrollScript, cadence, chooseRevisit, focusScript } from './browser.mjs';

test('revisit excludes last tab, handles empty pool, and only activates an exact ID', () => {
  const pages = [{ windowId: 1, tabId: 10 }, { windowId: 2, tabId: 20 }, { windowId: 2, tabId: 30 }];
  assert.equal(chooseRevisit(pages, 10, 0).tabId, 20);
  assert.equal(chooseRevisit(pages, 10, .99).tabId, 30);
  assert.equal(chooseRevisit([pages[0]], 10, .5), undefined);
  assert.equal(chooseRevisit([], 10, .5), undefined);
  const script = focusScript(pages[1]);
  assert.match(script, /window id 2/);
  assert.match(script, /is 20 then/);
  assert.doesNotMatch(script, /make new|set URL|close/);
});

test('ownership never expands to foreign tabs; moved or closed tabs are relinquished', () => {
  const owned = [{ windowId: 1, tabId: 10, slot: 0 }, { windowId: 2, tabId: 20, slot: 1 }];
  assert.deepEqual(reconcile(owned, [{ windowId: 1, tabId: 10 }, { windowId: 1, tabId: 99 }, { windowId: 3, tabId: 20 }]), [owned[0]]);
  assert.equal(reconcile(owned, []).length, 0);
});
test('both modes create a new page; retirement closes only an exact owned tab', () => {
  assert.match(creationScript('https://example.com/', null), /make new window/);
  assert.match(creationScript('https://example.com/', 42), /make new tab/);
  const close = closeScript({ windowId: 42, tabId: 99 });
  assert.match(close, /id of t is 99/);
  assert.doesNotMatch(close, /close w|close every|quit/);
  assert.throws(() => creationScript('file:///private/etc/passwd', null));
  assert.throws(() => closeScript({ windowId: '1\nquit', tabId: 3 }));
});
test('scroll checks active app, exact window and tab without clicks or submission', () => {
  const script = scrollScript({ windowId: 42, tabId: 99 });
  assert.match(script, /if not frontmost/);
  assert.match(script, /front window is not 42/);
  assert.match(script, /active tab of front window is not 99/);
  assert.match(script, /key code 121/);
  assert.doesNotMatch(script, /keystroke|click|JavaScript/);
});
test('slow commands and large page counts add backpressure', () => {
  assert.equal(cadence(500, 100, 16), 500);
  assert.equal(cadence(500, 1000, 16), 1300);
  assert.equal(cadence(500, 100, 50), 1000);
});
