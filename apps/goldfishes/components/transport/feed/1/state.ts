// Pure updates of a pc's copy of the feed. Slots untouched by a push keep
// their identity, so phones that did not change do not re-render.

import { TUNING } from "./slots.mjs";
import type { FeedPush, FeedState } from "./types";

export const EMPTY_FEED: FeedState = { vocabulary: [], slots: [] };

export function applyPush(state: FeedState, { items, released, idle = [] }: FeedPush): FeedState {
  if (items.length === 0 && released.length === 0 && idle.length === 0) return state;
  const slots = [...state.slots];
  for (const slot of released) {
    const current = slots[slot];
    if (current) slots[slot] = { ...current, fish: null, attached: false };
  }
  for (const slot of idle) {
    const current = slots[slot];
    if (current?.attached) slots[slot] = { ...current, attached: false };
  }
  for (const item of items) {
    const current = slots[item.slot] ?? { slot: item.slot, fish: null, attached: false, history: [] };
    const history = [...current.history, item].slice(-TUNING.history);
    slots[item.slot] = { slot: item.slot, fish: item.fish, attached: true, history };
  }
  return { ...state, slots };
}
