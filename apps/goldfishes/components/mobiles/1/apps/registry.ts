// The eight apps of pc/mobiles/1 (user, 2026-10-27: the seven deadly sins'
// platforms of NOTES 1017, plus the news). Phones take them by slot
// (appForSlot), so every app appears across the grid. A later pc version may swap the set.

import { facebookApp } from "./facebook";
import { instagramApp } from "./instagram";
import { linkedinApp } from "./linkedin";
import { netflixApp } from "./netflix";
import { newsApp } from "./news";
import { tinderApp } from "./tinder";
import { xApp } from "./x";
import { yelpApp } from "./yelp";
import type { AppDefinition } from "./types";

export const APPS: readonly AppDefinition[] = [
  tinderApp,
  yelpApp,
  linkedinApp,
  netflixApp,
  xApp,
  facebookApp,
  instagramApp,
  newsApp,
];

/**
 * Slot n's app: every app once in each run of eight slots, the run's order
 * turned by three each time, so a grid of eight (or four) columns mixes its
 * apps instead of stacking one app per column.
 */
export function appForSlot(slot: number): AppDefinition {
  const count = APPS.length;
  return APPS[(slot + Math.floor(slot / count) * 3) % count]!;
}

/**
 * The app an item's notification comes from: the same hype reaches every
 * app, and each item is one app's take on it. Chosen by seed, so every pc
 * agrees. Tapping it opens that app (phone/index.tsx).
 */
export function appOfItem(seed: number): AppDefinition {
  return APPS[(seed >>> 8) % APPS.length]!;
}
