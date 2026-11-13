import test from 'node:test';
import assert from 'node:assert/strict';
import { catalog, categories, createDeck } from './catalog.ts';

test('curated catalog is HTTPS, varied, and has stable unique ids and URLs', () => {
  assert.ok(catalog.length >= 50);
  assert.deepEqual(new Set(catalog.map(entry => entry.category)), new Set(categories));
  assert.equal(new Set(catalog.map(entry => entry.id)).size, catalog.length);
  assert.equal(new Set(catalog.map(entry => entry.url)).size, catalog.length);
  assert.ok(catalog.every(entry => entry.url.startsWith('https://')));
});

test('deck is deterministic and does not repeat URLs through the supported maximum', () => {
  const first = createDeck([...categories], 913, 120);
  assert.deepEqual(first, createDeck([...categories], 913, 120));
  assert.equal(new Set(first.map(entry => entry.url)).size, first.length);
  assert.notDeepEqual(first, createDeck([...categories], 914, 120));
});

test('category selection constrains both curated and fallback search entries', () => {
  const deck = createDeck(['multilingual-wiki'], 4, 30);
  assert.equal(deck.length, 30);
  assert.ok(deck.every(entry => entry.category === 'multilingual-wiki'));
  assert.ok(deck.slice(catalog.filter(entry => entry.category === 'multilingual-wiki').length).every(entry => entry.url.startsWith('https://www.google.com/search?')));
});
