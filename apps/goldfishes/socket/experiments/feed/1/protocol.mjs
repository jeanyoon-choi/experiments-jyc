// Goldfishes feed protocol, version 1: the main screen (bubble/N) keeps the
// phone slots — which goldfish each phone follows and what it now shows —
// and sends what changed; the relay forwards it to every pc (pc/mobiles/N)
// at once. The relay holds no state and no clock, so no timing lives here:
// slots, dwell and history are the screen's
// (components/transport/feed/1/slots.mjs), changed by a reload, never a
// relay restart (user, 2026-10-27).
//
// This file is pure and shared: the relay handler and the browser clients
// import the same names, so they never drift. A screen or pc version picks the
// protocol by its import path (`@/socket/experiments/feed/1/protocol.mjs`);
// version 2 is a whole copy of this folder, nothing shared.
//
// Keywords are not an enum. A screen announces its own vocabulary and sends
// keyword ids; the relay checks their form only, and a pc that has nothing
// for an id falls back to its label. Contract: apps/goldfishes/docs/socket/feed/1.md

export const familyId = "goldfishes-feed";
export const version = "1";
export const id = `${familyId}:${version}`;
export const room = `experiment:${familyId}:${version}`;
export const screenRoom = `${room}:screen`;
export const pcRoom = `${room}:pc`;

const prefix = `${familyId}-${version}:`;

export const events = Object.freeze({
  join: `${prefix}join`,
  presence: `${prefix}presence`,
  /** screen → relay: a change to its slots, `{items, released, idle}`. */
  pushIn: `${prefix}push:in`,
  /** relay → pcs: the same, with `screen` (its connection id). */
  pushOut: `${prefix}push:out`,
  /** screen → relay: everything, `{vocabulary, slots}`; on join and when asked. */
  snapshotIn: `${prefix}snapshot:in`,
  /** relay → pcs: the same, with `screen`. */
  snapshotOut: `${prefix}snapshot:out`,
  /** relay → screens: a pc has joined and needs a snapshot. */
  snapshotRequest: `${prefix}snapshot:request`,
  /** relay → pcs: `{screen}` has gone; its phones go dark. */
  screenGone: `${prefix}screen:gone`,
});

export const roles = Object.freeze(["screen", "pc"]);

/** Form limits only: what the relay will forward. */
export const limits = Object.freeze({
  slots: 256,
  history: 64,
  itemsPerPush: 512,
  vocabulary: 256,
  keywordLength: 64,
  labelLength: 80,
});

const KEYWORD_ID = /^[a-z0-9][a-z0-9._-]*$/i;

/** A keyword id, or null when it is not one. */
export function normalizeKeywordId(value) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > limits.keywordLength || !KEYWORD_ID.test(trimmed)) return null;
  return trimmed;
}

function text(value, fallback, max) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, max) : fallback;
}

/** `{ id, label, set }`, or null. Label falls back to the id, set to "". */
export function normalizeKeyword(value) {
  const keywordId = normalizeKeywordId(value?.id);
  if (!keywordId) return null;
  return {
    id: keywordId,
    label: text(value.label, keywordId, limits.labelLength),
    set: text(value.set, "", limits.keywordLength),
  };
}

/** A vocabulary: valid keywords, unique by id, at most `limits.vocabulary`. */
export function normalizeVocabulary(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const out = [];
  for (const entry of value) {
    const keyword = normalizeKeyword(entry);
    if (!keyword || seen.has(keyword.id)) continue;
    seen.add(keyword.id);
    out.push(keyword);
    if (out.length >= limits.vocabulary) break;
  }
  return out;
}

const integer = (value) => (Number.isSafeInteger(value) && value >= 0 ? value : null);
const unitInterval = (value) => (Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0);

/** A feed item `{id, slot, fish, page, keyword, rank, seed, at}`, or null. */
export function normalizeItem(value) {
  const itemId = integer(value?.id);
  const slot = integer(value?.slot);
  const fish = integer(value?.fish);
  const page = integer(value?.page);
  const keyword = normalizeKeywordId(value?.keyword);
  const seed = integer(value?.seed);
  if (itemId === null || slot === null || slot >= limits.slots || fish === null || page === null || !keyword || seed === null) return null;
  return { id: itemId, slot, fish, page, keyword, rank: unitInterval(value.rank), seed, at: Number.isFinite(value.at) ? value.at : 0 };
}

function slotList(value) {
  const out = [];
  for (const entry of Array.isArray(value) ? value.slice(0, limits.slots) : []) {
    const slot = integer(entry);
    if (slot !== null && slot < limits.slots) out.push(slot);
  }
  return out;
}

/** A screen's change: `{items, released, idle}`, invalid entries dropped. */
export function normalizePush(value) {
  const items = [];
  for (const entry of Array.isArray(value?.items) ? value.items.slice(0, limits.itemsPerPush) : []) {
    const item = normalizeItem(entry);
    if (item) items.push(item);
  }
  return { items, released: slotList(value?.released), idle: slotList(value?.idle) };
}

/** A screen's whole state: `{vocabulary, slots: [{slot, fish, attached, history}]}`. */
export function normalizeSnapshot(value) {
  const slots = [];
  for (const entry of Array.isArray(value?.slots) ? value.slots.slice(0, limits.slots) : []) {
    const slot = integer(entry?.slot);
    if (slot === null || slot >= limits.slots) continue;
    const history = [];
    for (const item of Array.isArray(entry.history) ? entry.history.slice(-limits.history) : []) {
      const normal = normalizeItem(item);
      if (normal) history.push(normal);
    }
    slots.push({ slot, fish: integer(entry.fish), attached: entry.attached === true, history });
  }
  return { vocabulary: normalizeVocabulary(value?.vocabulary), slots };
}
