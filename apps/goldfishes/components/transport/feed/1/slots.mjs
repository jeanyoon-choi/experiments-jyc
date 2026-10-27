// The phone slots of feed/1, pure (every function takes `now`). The main
// screen runs this beside its fish and sends only what changed; the relay
// forwards, pcs draw. Every timing is here, in the browser, so tuning is a
// reload, never a relay restart (user, 2026-10-27).
//
// Every goldfish feeds a phone: the whole school (380) is spread over the
// slots by serial, so each slot is fed by several fish and never runs dry —
// no phone goes dark or waits on one fish (user, 2026-10-27: "380 fish …
// 빠르게 업데이트 되고 죽지 않고 계속 피드가 업데이트"; an earlier pass gave
// each slot one fish and darkened it whenever that fish let go). Each touch
// is queued on its slot; a slot puts out its next item once the last has
// shown for `dwellMs`, so bursts arrive as a rapid run instead of being lost.
// Detaching and dying no longer change a slot; the screen may still say so.

export const TUNING = Object.freeze({
  /** Phone slots; a pc shows the first n it has room for. */
  slots: 64,
  /** Items kept per slot, sent to a pc that joins late. */
  history: 8,
  /** A slot puts out an item at most this often: one insertion on the pc. */
  dwellMs: 150,
  /** Touches waiting on a slot; beyond this the oldest waiting one is dropped. */
  queue: 4,
  /** The screen steps the slots and sends what changed this often. */
  sendIntervalMs: 33,
});

/** A 32-bit mix: item seeds, and which slot a fish feeds. */
function mix(value) {
  value = Math.imul(value ^ 0x5bd1e995, 0x27d4eb2d) >>> 0;
  value = Math.imul(value ^ (value >>> 15), 0x165667b1) >>> 0;
  return (value ^ (value >>> 13)) >>> 0;
}

export function createSlots({ slots = TUNING.slots } = {}) {
  return {
    slots: Array.from({ length: slots }, (_, slot) => ({ slot, fish: null, attached: false, lastAt: -Infinity, queue: [], history: [] })),
    serial: 0,
  };
}

/** The slot a fish feeds: fixed for its life, spread evenly over the slots. */
export function slotOf(runtime, fish) {
  return mix(fish) % runtime.slots.length;
}

/**
 * Takes what the screen saw: `contacts` [{fish, page, keyword, rank}], each a
 * fish that has just reached a bubble. `detached` and `departures` are
 * accepted and ignored: a slot never goes dark.
 * @param {ReturnType<typeof createSlots>} runtime
 * @param {{ contacts?: { fish: number; page: number; keyword: string; rank: number }[]; detached?: number[]; departures?: number[] }} seen
 */
export function ingest(runtime, seen) {
  for (const contact of seen.contacts ?? []) {
    const slot = runtime.slots[slotOf(runtime, contact.fish)];
    slot.queue.push(contact);
    if (slot.queue.length > TUNING.queue) slot.queue.shift();
  }
}

/** Moves slots on. Returns `{ items, released, idle }` (the last two always empty now). */
export function tick(runtime, now) {
  const items = [];
  for (const slot of runtime.slots) {
    if (slot.queue.length === 0 || now - slot.lastAt < TUNING.dwellMs) continue;
    const { fish, page, keyword, rank } = slot.queue.shift();
    runtime.serial += 1;
    const item = { id: runtime.serial, slot: slot.slot, fish, page, keyword, rank, seed: mix(runtime.serial), at: now };
    slot.fish = fish;
    slot.attached = true;
    slot.lastAt = now;
    slot.history.push(item);
    if (slot.history.length > TUNING.history) slot.history.shift();
    items.push(item);
  }
  return { items, released: [], idle: [] };
}

/** Every slot as a pc keeps it: sent to a pc that joins. */
export function snapshotSlots(runtime) {
  return runtime.slots.map(({ slot, fish, attached, history }) => ({ slot, fish, attached, history: [...history] }));
}
