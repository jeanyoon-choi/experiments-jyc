// The school's data: a fish, its settings, what the school is given of the web
// and the scene, and the sizes everything in fish/ agrees on. No behaviour
// (school.ts composes that from obstacles.ts and attention.ts).

import type { Life, LifeParameters, Rgb } from "./lifecycle.ts";

/** What the school needs from the scene to live: its lifecycle settings, and the colour of a drawn bubble (by index). */
export type LifeContext = { parameters: LifeParameters; colourOf: (bubble: number, out: Rgb) => void };

/** Raised from 400 to 1,000 (user, 2026-11-03); the school steps off the main thread (school-thread.ts). */
export const MAX_FISH = 1_000;

/**
 * The most pages the school keeps anything for (the web's own cap, web/model.ts MAX_PAGES). Also the stride of a
 * fish's memory key (attention.ts: fish id × MAX_PAGES + page).
 */
export const MAX_PAGES = 1_000;

/** A school's size from a setting: whole, 0 … MAX_FISH. */
export function clampCount(count: number) {
  return Math.max(0, Math.min(MAX_FISH, Math.round(count)));
}

/** What the school reads of the web: each page's outgoing links (a RankedWeb, or the worker's copy of it). */
export type SchoolWeb = { readonly out: readonly (readonly { readonly target: number; readonly weight: number }[])[] };

/**
 * The same links flat, as they cross to the worker (school-core.ts SchoolFrame): page p's run
 * [linkStart[p], linkStart[p + 1]) of linkTarget and linkWeight, in the order of the page's list.
 */
export type FlatLinks = { readonly linkStart: Int32Array; readonly linkTarget: Int32Array; readonly linkWeight: Float64Array };

export type FishParameters = {
  /** Body scale; 1 is Goldfishes' glyph (about 19 px long); 0.7 is tech-eyes/1's current size. */
  scale: number;
  /** Multiplies cruise, approach and patrol speeds. */
  speed: number;
  /** Probability of following one of the page's links when attention lapses. */
  follow: number;
  /** Pull of newly arrived pages. */
  novelty: number;
  /** How fast attention to a watched page wears off. */
  habituation: number;
  /** Mean seconds before a fish reconsiders its page. */
  span: number;
  /** Alignment and cohesion with nearby fish. */
  schooling: number;
  /** Back-and-forth movement along the bubble's edge. */
  patrol: number;
};

export const FISH_DEFAULTS: FishParameters = {
  scale: 0.7,
  speed: 1,
  follow: 0.6,
  novelty: 1,
  habituation: 1,
  span: 2.8,
  schooling: 1,
  patrol: 1,
};

export type Fish = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  facing: number;
  /** Page being attended, or -1. */
  target: number;
  /** Angle around the target's centre at which the fish holds. */
  angle: number;
  /** ±1: which way it patrols along the edge. */
  turn: number;
  reconsiderAt: number;
  /** Seconds spent far from its goal without getting closer. */
  stuck: number;
  /** Consecutive checks (one a second) that found the fish shut in a cavity of the raft. */
  trapped: number;
  enclosureCheckAt: number;
  seed: number;
  /** Was its mouth at its page's edge last step: the step it gets there is a touch. */
  touching: boolean;
  /** Its lifecycle (lifecycle.ts): strength, the colour it has taken on, and whether it is sinking. */
  life: Life;
};

// Goldfishes' measured glyph reach at scale 1 (mouth, tail, side), CSS px.
export const MOUTH = 6.15;
export const TAIL = 13.08;
export const SIDE = 6.15;
export const EDGE_GAP = 1.5;
