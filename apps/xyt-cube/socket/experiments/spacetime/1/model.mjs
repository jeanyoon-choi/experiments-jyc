// Spacetime 1 relay runtime: the abstract domain state. Pure; the caller supplies time.
// The relay owns operations and time; browsers derive every visual from the
// snapshot. Contract: apps/xyt-cube/docs/spacetime/1.md

import {
  MASS_GROWTH_PER_SECOND,
  MASS_MAX,
  MAX_MASSES,
  clampBeta,
} from "./physics.mjs";

export const spacetimeModelTiming = Object.freeze({
  broadcastIntervalMs: 33,
  /** An observer that sends nothing for this long has left its frame. */
  observerStaleMs: 1500,
});

function unit(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(Math.max(n, 0), 1) : null;
}

export function createSpacetimeRuntime() {
  return {
    compactness: 0,
    observers: new Map(),
    masses: [],
    massSerial: 0,
  };
}

export function resetSpacetime(state) {
  state.compactness = 0;
  state.masses = [];
  // Observers are live phones, not accumulated history: they stay.
}

/** O1: one shared time circle, last writer wins, persists after leaving. */
export function setCompactness(state, value) {
  const next = unit(value);
  if (next === null || next === state.compactness) return false;
  state.compactness = next;
  return true;
}

/** O2: each phone is one observer; joining order fixes the boost chain. */
export function setObserver(state, id, bx, by, now) {
  const [x, y] = clampBeta(Number(bx), Number(by));
  const current = state.observers.get(id);
  if (current) {
    current.bx = x;
    current.by = y;
    current.updatedAt = now;
  } else {
    state.observers.set(id, { id, bx: x, by: y, joinedAt: now, updatedAt: now });
  }
  return true;
}

export function removeObserver(state, id) {
  return state.observers.delete(id);
}

/** O3: pressing places a new mass; it grows while held and then stays. */
export function pressMass(state, owner, u, v, now) {
  const x = unit(u);
  const y = unit(v);
  if (x === null || y === null) return false;
  releaseMass(state, owner);
  state.massSerial += 1;
  state.masses.push({
    id: `m${state.massSerial}`,
    owner,
    u: x,
    v: y,
    mu: 0,
    holding: true,
    createdAt: now,
  });
  while (state.masses.length > MAX_MASSES) {
    const oldest = state.masses.findIndex((mass) => !mass.holding);
    state.masses.splice(oldest === -1 ? 0 : oldest, 1);
  }
  return true;
}

export function moveMass(state, owner, u, v) {
  const x = unit(u);
  const y = unit(v);
  const mass = state.masses.find((item) => item.owner === owner && item.holding);
  if (!mass || x === null || y === null) return false;
  mass.u = x;
  mass.v = y;
  return true;
}

export function releaseMass(state, owner) {
  let changed = false;
  for (const mass of state.masses) {
    if (mass.owner === owner && mass.holding) {
      mass.holding = false;
      changed = true;
    }
  }
  return changed;
}

/** Advance time. Returns true when the snapshot changed. */
export function stepSpacetime(state, now, dt) {
  let changed = false;
  for (const mass of state.masses) {
    if (mass.holding && mass.mu < MASS_MAX) {
      mass.mu = Math.min(MASS_MAX, mass.mu + MASS_GROWTH_PER_SECOND * dt);
      changed = true;
    }
  }
  for (const [id, observer] of state.observers) {
    if (now - observer.updatedAt > spacetimeModelTiming.observerStaleMs) {
      state.observers.delete(id);
      changed = true;
    }
  }
  return changed;
}

export function snapshotSpacetime(state, now) {
  return {
    compactness: state.compactness,
    observers: [...state.observers.values()]
      .sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id))
      .map(({ id, bx, by }) => ({ id, bx, by })),
    masses: state.masses.map(({ id, u, v, mu, holding }) => ({ id, u, v, mu, holding })),
    serverTime: now,
  };
}
