// Which image each page shows, and why it changes. Three regimes:
//
//   fixed  — a page keeps the one image it was born with;
//   churn  — every page swaps on its own clock, as the cells of Goldfishes'
//            pillars and media grid do: interval 1 / (rate · (1 ± 0.72 r)),
//            always to a different image, each change a short cross-fade;
//   trend  — the web drives it. Each group's leading page takes up a new
//            image every so often (a new keyword); whenever a page's portion
//            of rank arrives at the page it links to, the sender copies, with
//            some probability, what the receiver is turning into — followers
//            imitate the pages they attend to, so a trend runs outward from
//            hubs along links and each echo chamber chases its own (the
//            default). A page that has stared at one image too long (boredom)
//            looks elsewhere.
//
// Positions and rendering are not here; the field is indexed by page.

import type { RankedWeb } from "../web/model.ts";

export type MediaMode = "fixed" | "churn" | "trend";

export type MediaParameters = {
  mode: MediaMode;
  /** churn: changes per second per page, before jitter. */
  churnRate: number;
  /** trend: seconds between a group's leader taking up a new image. */
  trendInterval: number;
  /** trend: probability a sender copies its receiver when its portion arrives. */
  follow: number;
  /** trend: seconds a page tolerates one image before it looks elsewhere; 0 never. */
  boredom: number;
  /** seconds a change takes to cross-fade. */
  fade: number;
};

/** 유행 따라가기 from the start (user, 2026-10-11). */
export const MEDIA_DEFAULTS: MediaParameters = { mode: "trend", churnRate: 2, trendInterval: 6, follow: 0.6, boredom: 0, fade: 0.15 };

export const CHURN_RANGE = [0.2, 24] as const;
export const TREND_INTERVAL_RANGE = [1, 30] as const;
export const BOREDOM_RANGE = [0, 30] as const;
export const FADE_RANGE = [0, 2] as const;

const MAX_GROUPS = 4;
/** Jitter on churn intervals, as in the pillars' media playback. */
const CHURN_JITTER = 0.72;

export type MediaField = {
  /** Layer each page shows (or fades from). */
  readonly layer: Float32Array;
  /** Layer each page fades to; equal to `layer` when it is not changing. */
  readonly next: Float32Array;
  /** Cross-fade progress 0–1. */
  readonly blend: Float32Array;
  /** When the page last began a change (seconds). */
  readonly since: Float64Array;
  /** churn: when the page next changes. */
  readonly due: Float64Array;
  /** A stable value in [0, 1) per page: crop window, drift phase. */
  readonly phase: Float32Array;
  /** trend: when each group's leader next takes up a new image. */
  readonly nextTrend: Float64Array;
  /** Layers in the media texture; 0 means no media. */
  layers: number;
  /** Changes begun so far. */
  changes: number;
};

export function createMediaField(maxPages: number): MediaField {
  return {
    layer: new Float32Array(maxPages),
    next: new Float32Array(maxPages),
    blend: new Float32Array(maxPages),
    since: new Float64Array(maxPages),
    due: new Float64Array(maxPages),
    phase: new Float32Array(maxPages),
    nextTrend: new Float64Array(MAX_GROUPS),
    layers: 0,
    changes: 0,
  };
}

/** A stable value in [0, 1) per (page, salt). */
function hashOf(a: number, b: number) {
  const value = Math.sin(a * 12.9898 + b * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

function churnInterval(rate: number, random: () => number) {
  const jitter = 1 + (random() * 2 - 1) * CHURN_JITTER;
  return Math.max(0.03, 1 / Math.max(1e-3, rate * jitter));
}

/** A layer other than `current` (the same when only one exists). */
export function otherLayer(current: number, layers: number, random: () => number) {
  if (layers <= 1) return 0;
  const pick = Math.floor(random() * (layers - 1));
  return pick >= current ? pick + 1 : pick;
}

/** The page's own image: the one it was born with, from its index. */
export function bornLayer(page: number, layers: number) {
  return layers <= 0 ? 0 : Math.floor(hashOf(page, 3) * layers) % layers;
}

/** Gives a page the image it was born with; no fade. */
export function assignPage(field: MediaField, page: number, time: number, parameters: MediaParameters, random: () => number) {
  const layer = bornLayer(page, field.layers);
  field.layer[page] = layer;
  field.next[page] = layer;
  field.blend[page] = 0;
  field.since[page] = time;
  field.due[page] = time + churnInterval(parameters.churnRate, random);
  field.phase[page] = hashOf(page, 11);
}

/** A new surface: every page takes its born image from the new layer count. */
export function resetField(field: MediaField, pages: number, layers: number, time: number, parameters: MediaParameters, random: () => number) {
  field.layers = layers;
  for (let page = 0; page < pages; page += 1) assignPage(field, page, time, parameters, random);
  field.nextTrend.fill(time + parameters.trendInterval * 0.5);
}

/** Starts a change to `layer`; a change already under way is completed first. */
export function beginChange(field: MediaField, page: number, layer: number, time: number) {
  if (field.next[page] === layer) return false;
  if (field.next[page] !== field.layer[page]) field.layer[page] = field.next[page]!;
  field.next[page] = layer;
  field.blend[page] = 0;
  field.since[page] = time;
  field.changes += 1;
  return true;
}

/**
 * trend: the sender's portion has arrived at the receiver; the sender may copy
 * what the receiver shows. Pages imitate only pages that outrank them: the
 * chance grows from nothing between equals to the full `follow` when the
 * receiver has twice the sender's rank — so an image runs down from hubs,
 * and a hub keeps its own until it takes up the next.
 */
export function follow(field: MediaField, web: RankedWeb, from: number, to: number, time: number, parameters: MediaParameters, random: () => number) {
  if (parameters.mode !== "trend" || field.layers <= 0) return false;
  const ratio = web.rank[to]! / Math.max(web.rank[from]!, 1e-9);
  const upward = Math.min(1, Math.max(0, ratio - 1));
  if (random() >= parameters.follow * upward) return false;
  return beginChange(field, from, field.next[to]!, time);
}

/** The page with the highest rank in each group. */
function leaders(web: RankedWeb, out: Int32Array) {
  out.fill(-1);
  for (let page = 0; page < web.size; page += 1) {
    const group = web.group[page]!;
    const current = out[group]!;
    if (current < 0 || web.rank[page]! > web.rank[current]!) out[group] = page;
  }
}

const groupLeaders = new Int32Array(MAX_GROUPS);

/** Advances fades and, by regime, begins changes. */
export function stepMedia(field: MediaField, web: RankedWeb, time: number, delta: number, parameters: MediaParameters, random: () => number) {
  const fade = Math.max(parameters.fade, 1e-3);
  for (let page = 0; page < web.size; page += 1) {
    if (field.next[page] !== field.layer[page]) {
      const blend = field.blend[page]! + delta / fade;
      if (blend >= 1) {
        field.layer[page] = field.next[page]!;
        field.blend[page] = 0;
      } else field.blend[page] = blend;
    }
  }
  if (field.layers <= 1) return;
  if (parameters.mode === "churn") {
    for (let page = 0; page < web.size; page += 1) {
      if (time < field.due[page]!) continue;
      beginChange(field, page, otherLayer(field.next[page]!, field.layers, random), time);
      field.due[page] = time + churnInterval(parameters.churnRate, random);
    }
  } else if (parameters.mode === "trend") {
    leaders(web, groupLeaders);
    for (let group = 0; group < web.groups; group += 1) {
      if (time < field.nextTrend[group]!) continue;
      const leader = groupLeaders[group]!;
      if (leader >= 0) beginChange(field, leader, otherLayer(field.next[leader]!, field.layers, random), time);
      field.nextTrend[group] = time + parameters.trendInterval * (0.7 + 0.6 * random());
    }
    if (parameters.boredom > 0) {
      for (let page = 0; page < web.size; page += 1) {
        if (time - field.since[page]! < parameters.boredom * (0.75 + 0.5 * field.phase[page]!)) continue;
        beginChange(field, page, otherLayer(field.next[page]!, field.layers, random), time);
      }
    }
  }
}
