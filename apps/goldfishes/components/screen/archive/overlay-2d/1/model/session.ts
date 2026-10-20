import type { SocialStorySystem } from "./types";

type StoredSocialStorySystem = Readonly<{
  version: 1;
  time: number;
  system: SocialStorySystem;
}>;

function isStoredSystem(value: unknown): value is StoredSocialStorySystem {
  if (!value || typeof value !== "object") return false;
  const stored = value as Partial<StoredSocialStorySystem>;
  const system = stored.system;
  if (stored.version !== 1 || !Number.isFinite(stored.time) || !system || !Number.isInteger(system.columns) || !Number.isInteger(system.rows) || system.columns < 1 || system.rows < 1) return false;
  const count = system.columns * system.rows;
  return Array.isArray(system.nodes) && Array.isArray(system.states) && Array.isArray(system.incomingTies) && Array.isArray(system.outgoingTies) && Array.isArray(system.influences) && system.nodes.length === count && system.states.length === count && system.incomingTies.length === count && system.outgoingTies.length === count && Number.isFinite(system.randomSeed);
}

export function loadSocialStorySystem(key: string): StoredSocialStorySystem | null {
  try { const serialized = window.sessionStorage.getItem(key); if (!serialized) return null; const stored: unknown = JSON.parse(serialized); return isStoredSystem(stored) ? stored : null; } catch { return null; }
}

export function saveSocialStorySystem(key: string, time: number, system: SocialStorySystem) {
  try { window.sessionStorage.setItem(key, JSON.stringify({ version: 1, time, system })); } catch { /* Storage is optional. */ }
}
