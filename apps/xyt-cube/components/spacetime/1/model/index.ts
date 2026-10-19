// Client-side mirror of the spacetime/1 domain snapshot, plus the shared
// physics and tilt mapping the relay also uses.
export {
  LENS_GAIN,
  LIGHT_SPEED,
  MASS_MAX,
  MASS_SOFTENING,
  MAX_BETA,
  MAX_MASSES,
  MIN_CLOCK_RATE,
  MIN_COMPACT_SCALE,
  compactScale,
  integrateLag,
  observerToRestMatrix,
} from "@/socket/experiments/spacetime/1/physics.mjs";
export { tiltToBeta } from "@/socket/experiments/spacetime/1/orientation.mjs";

export type SpacetimeObserver = {
  id: string;
  /** Velocity, fraction of C, in scene axes (x right, y down). */
  bx: number;
  by: number;
};

export type SpacetimeMass = {
  id: string;
  /** Position as a fraction of the frame (0–1 across, 0–1 down). */
  u: number;
  v: number;
  /** Gravitational radius, frame heights. */
  mu: number;
  holding: boolean;
};

export type SpacetimeSnapshot = {
  /** O1: 0 = the clip's own loop, 1 = the shortest time circle. */
  compactness: number;
  /** O2: in joining order; observer k moves relative to observer k-1. */
  observers: SpacetimeObserver[];
  /** O3: persists until the screen resets it. */
  masses: SpacetimeMass[];
  serverTime: number;
};

export type SpacetimeOperationId = "compact" | "boost" | "mass";
