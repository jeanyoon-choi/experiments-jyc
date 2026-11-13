// Who owns each phone: not 64 copies of one template. Dark or light,
// iPhone or Galaxy, its language, its pace, the apps it keeps — drawn once
// per seat from its seed, so a reload brings back the same owners.

import type { AppId, Persona } from "../apps/types";
import type { Lang } from "../paint/types";
import { mix, random, weighted } from "./random.ts";

/** How likely each app is to be on a phone, and how often used. */
const APP_WEIGHT: Record<AppId, number> = {
  instagram: 10,
  reels: 6,
  tiktok: 8,
  x: 7,
  facebook: 5,
  linkedin: 5,
  tinder: 4,
  yelp: 3,
  netflix: 4,
  news: 5,
  stocks: 5,
  shop: 5,
  messages: 8,
};

/** bubble/7's coloured fish palettes (objects/goldfish.ts), one dealt per phone as 섞음 deals one per fish. */
const FISH = ["classic", "instagram", "rose", "sunset", "poppy", "pink"];

export function personaFor(seat: number): Persona {
  const seed = mix(seat * 7919 + 17);
  const rng = random(seed);
  const lang = weighted<Lang>(rng(), { en: 0.55, ko: 0.2, ja: 0.1, es: 0.15 });
  const count = 6 + rng.int(4);
  const pool = { ...APP_WEIGHT };
  const apps: AppId[] = [];
  while (apps.length < count) {
    const app = weighted(rng(), pool);
    apps.push(app);
    pool[app] = 0;
  }
  return {
    seed,
    os: rng.chance(0.27) ? "android" : "ios",
    mode: rng.chance(0.5) ? "dark" : "light",
    lang,
    tempo: rng.range(0.75, 1.35),
    apps,
    hue: rng.int(360),
    fish: rng.pick(FISH),
    name: "",
  };
}
