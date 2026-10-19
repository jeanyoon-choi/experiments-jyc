// Pure screen-side derivation for spacetime/1: relay snapshot + elapsed time
// → one render frame. Smoothing happens here once (phones send raw values).
//
// The O3 lag field is the one piece of history the screen integrates itself:
// ∫ (1 − rate) dt from the masses it has seen. It survives as long as the
// screen page stays open and is zeroed when the relay reports that every
// mass has been reset.

import type { SpacetimeSnapshot } from "../model/index.ts";
import type { SpacetimeRenderFrame } from "../render/renderer.ts";
import type { SpacetimeOperations } from "./settings.ts";
import {
  LENS_GAIN,
  LIGHT_SPEED,
  MASS_SOFTENING,
  compactScale,
  integrateLag,
  observerToRestMatrix,
} from "../../../../socket/experiments/spacetime/1/physics.mjs";

/** Exponential approach rate toward relay values, per second. */
export const SCREEN_SMOOTHING_PER_SECOND = 6;
/** Lag-field columns across the scene; rows follow the clip's aspect. */
export const LAG_GRID_WIDTH = 128;
/** A departed observer is dropped once its speed has decayed below this. */
const DEPARTED_BETA = 0.002;

type ChainLink = { id: string; bx: number; by: number; present: boolean };
type ScreenMass = { x: number; y: number; mu: number };

export type SpacetimePresenter = {
  time: number;
  compactness: number;
  chain: ChainLink[];
  masses: Map<string, ScreenMass>;
  lag: Float32Array;
  lagWidth: number;
  lagHeight: number;
  lagAspect: number;
  hadMasses: boolean;
};

export function createSpacetimePresenter(): SpacetimePresenter {
  return {
    time: 0,
    compactness: 0,
    chain: [],
    masses: new Map(),
    lag: new Float32Array(1),
    lagWidth: 1,
    lagHeight: 1,
    lagAspect: 0,
    hadMasses: false,
  };
}

export type SpacetimeClipShape = { aspect: number; duration: number };

export function advanceSpacetimePresenter(
  presenter: SpacetimePresenter,
  snapshot: SpacetimeSnapshot | null,
  dt: number,
  clip: SpacetimeClipShape,
  operations: SpacetimeOperations,
): { frame: SpacetimeRenderFrame; lagChanged: boolean } {
  const step = Math.max(0, dt);
  const k = 1 - Math.exp(-SCREEN_SMOOTHING_PER_SECOND * step);
  presenter.time += step;
  let lagChanged = false;

  if (presenter.lagAspect !== clip.aspect) {
    presenter.lagWidth = LAG_GRID_WIDTH;
    presenter.lagHeight = Math.max(1, Math.round(LAG_GRID_WIDTH / clip.aspect));
    presenter.lag = new Float32Array(presenter.lagWidth * presenter.lagHeight);
    presenter.lagAspect = clip.aspect;
    lagChanged = true;
  }

  // O1
  presenter.compactness += ((snapshot?.compactness ?? 0) - presenter.compactness) * k;

  // O2: keep joining order; a departed observer decays to rest, then leaves.
  const observers = snapshot?.observers ?? [];
  const targets = new Map(observers.map((observer) => [observer.id, observer]));
  for (const link of presenter.chain) link.present = targets.has(link.id);
  for (const observer of observers) {
    if (!presenter.chain.some((link) => link.id === observer.id)) {
      presenter.chain.push({ id: observer.id, bx: 0, by: 0, present: true });
    }
  }
  for (const link of presenter.chain) {
    const target = targets.get(link.id);
    link.bx += ((target?.bx ?? 0) - link.bx) * k;
    link.by += ((target?.by ?? 0) - link.by) * k;
  }
  presenter.chain = presenter.chain.filter(
    (link) => link.present || Math.hypot(link.bx, link.by) > DEPARTED_BETA,
  );

  // O3: masses in scene units; reset (none left after some) clears the lag.
  const masses = snapshot?.masses ?? [];
  const seen = new Set<string>();
  for (const mass of masses) {
    seen.add(mass.id);
    const x = mass.u * clip.aspect;
    const y = mass.v;
    const current = presenter.masses.get(mass.id);
    if (!current) {
      presenter.masses.set(mass.id, { x, y, mu: 0 });
      continue;
    }
    current.x += (x - current.x) * k;
    current.y += (y - current.y) * k;
    current.mu += (mass.mu - current.mu) * k;
  }
  for (const id of presenter.masses.keys()) {
    if (!seen.has(id)) presenter.masses.delete(id);
  }
  if (snapshot && masses.length === 0 && presenter.hadMasses) {
    presenter.lag.fill(0);
    lagChanged = true;
  }
  if (snapshot) presenter.hadMasses = masses.length > 0;

  const screenMasses = [...presenter.masses.values()];
  if (operations.mass && screenMasses.length > 0 && step > 0) {
    integrateLag(
      presenter.lag,
      presenter.lagWidth,
      presenter.lagHeight,
      clip.aspect,
      screenMasses,
      step,
    );
    lagChanged = true;
  }

  const matrix = operations.boost
    ? observerToRestMatrix(presenter.chain.map((link) => [link.bx, link.by]))
    : [1, 0, 0, 0, 1, 0, 0, 0, 1];

  return {
    frame: {
      timeNow: presenter.time,
      period: clip.duration,
      compactScale: operations.compact ? compactScale(presenter.compactness) : 1,
      restX: [matrix[1], matrix[4], matrix[7]],
      restY: [matrix[2], matrix[5], matrix[8]],
      lightSpeed: LIGHT_SPEED,
      masses: operations.mass ? screenMasses : [],
      lensGain: operations.mass && operations.lens ? LENS_GAIN : 0,
      softening: MASS_SOFTENING,
      lagOn: operations.mass,
    },
    lagChanged,
  };
}
