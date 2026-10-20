import type { StoryCellState } from "./types";

export type AggregatedStorySnapshot = Readonly<{
  version: 1;
  time: number;
  randomSeed: number;
  states: readonly StoryCellState[];
}>;

const STATUSES = new Set(["empty", "new", "viewing", "leaving"]);

function isTime(value: unknown): value is number | null {
  return value === null || Number.isFinite(value);
}

function isStoryState(value: unknown): value is StoryCellState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<StoryCellState>;
  return (
    typeof state.status === "string"
    && STATUSES.has(state.status)
    && isTime(state.viewAt)
    && isTime(state.viewingUntil)
    && isTime(state.leavingUntil)
    && Number.isFinite(state.availableAt)
    && isTime(state.transmitAt)
    && Number.isFinite(state.transmissionsRemaining)
    && isTime(state.transmittedAt)
  );
}

function isSnapshot(value: unknown): value is AggregatedStorySnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as Partial<AggregatedStorySnapshot>;
  return (
    snapshot.version === 1
    && Number.isFinite(snapshot.time)
    && Number.isFinite(snapshot.randomSeed)
    && Array.isArray(snapshot.states)
    && snapshot.states.every(isStoryState)
  );
}

export function loadAggregatedStorySnapshot(key: string): AggregatedStorySnapshot | null {
  try {
    const serialized = window.sessionStorage.getItem(key);
    if (!serialized) return null;
    const snapshot: unknown = JSON.parse(serialized);
    return isSnapshot(snapshot) ? snapshot : null;
  } catch {
    return null;
  }
}

export function saveAggregatedStorySnapshot(
  key: string,
  time: number,
  randomSeed: number,
  states: readonly StoryCellState[],
) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify({ version: 1, time, randomSeed, states }));
  } catch {
    // Storage is optional; avoid adding another failure path to the renderer.
  }
}
