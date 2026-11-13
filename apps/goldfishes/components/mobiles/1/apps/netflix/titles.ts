// A hype event as Netflix titles: the event's own documentary, plus the
// spin-offs the hype spawns (a dating show, a property show...). Pure:
// every choice comes from the post's seed.

import { imageFor, portraitFor } from "../../content/images";
import type { AppPost } from "../types";

export type Treatment = "condensed" | "serif" | "geometric" | "slab";

export type Title = {
  /** Stable model id: the post's item id, or `<id>-s<n>` for a spin-off. */
  id: string;
  name: string;
  format: "DOCUMENTARY" | "SERIES" | "LIMITED SERIES" | "FILM";
  genres: readonly string[];
  treatment: Treatment;
  /** Title ink: white or an accent. */
  ink: string;
  /** Key-art tint. */
  tint: string;
  art: string;
  ribbon: "Recently Added" | "New Episode" | "New Season" | "Leaving Soon" | null;
  top10: boolean;
};

const TINTS = ["#8a0f14", "#0f4c5c", "#7a4b05", "#3d1f6b", "#123a7a", "#3f5e12", "#6b1240", "#2b2b2b"];
const INKS = ["#ffffff", "#ffffff", "#ffffff", "#f5c518", "#ff3b30", "#c8ff3d", "#7fe7ff"];
const TREATMENTS: readonly Treatment[] = ["condensed", "serif", "geometric", "slab"];
const TONES = ["Satirical", "Investigative", "Absurd", "Ominous", "Irreverent", "Provocative", "Witty"];
const RIBBONS = ["Recently Added", "New Episode", "New Season", "Recently Added", null, "Leaving Soon"] as const;

function choose<T>(list: readonly T[], value: number): T {
  return list[Math.min(list.length - 1, Math.floor(value * list.length))]!;
}

function shortLabel(post: AppPost): string {
  return post.event.tags[0] ?? post.label;
}

function primaryName(post: AppPost): string {
  const key = shortLabel(post);
  const { org } = post.event;
  const nouns = ["The Waitlist", "Inside the Hype", "Early Access", "The Pivot", "Gold Rush", "Unicorn", "The Reckoning"];
  const forms = [
    () => `${key}: ${choose(nouns, post.pick(31))}`,
    () => `The ${key} Bubble`,
    () => `${org}: Move Fast`,
    () => `Running on ${key}`,
    () => `${key}: ${choose(nouns, post.pick(31))}`,
  ];
  return choose(forms, post.pick(30))();
}

function spinoffName(post: AppPost, n: number): string {
  const key = shortLabel(post);
  const { org } = post.event;
  const forms = [
    `Love Is ${key}`,
    `Selling ${org}`,
    `Too Hot to ${key}`,
    `${key} After Dark`,
    `Is It ${key}?`,
    `${org}: Season 2`,
    `Queer Eye for the ${key}`,
    `Making a ${key}`,
  ];
  return choose(forms, post.pick(40 + n));
}

export function titleOf(post: AppPost, n = 0): Title {
  const s = n * 17;
  const format = n === 0 ? choose(["DOCUMENTARY", "SERIES", "LIMITED SERIES", "DOCUMENTARY"] as const, post.pick(32)) : choose(["SERIES", "SERIES", "FILM"] as const, post.pick(33 + s));
  const kind = format === "DOCUMENTARY" ? "Docuseries" : format === "FILM" ? "Comedy" : n === 0 ? "Docuseries" : "Reality TV";
  const photo = n === 0 ? imageFor(post.event.image) : undefined;
  return {
    id: n === 0 ? String(post.item.id) : `${post.item.id}-s${n}`,
    name: n === 0 ? primaryName(post) : spinoffName(post, n),
    format,
    genres: [kind, shortLabel(post), choose(TONES, post.pick(34 + s))],
    treatment: choose(TREATMENTS, post.pick(35 + s)),
    ink: choose(INKS, post.pick(36 + s)),
    tint: choose(TINTS, post.pick(37 + s)),
    art: photo ?? portraitFor(post.item.seed + n * 13),
    ribbon: choose(RIBBONS, post.pick(38 + s)),
    top10: post.pick(39 + s) > 0.6,
  };
}

/** The real push wordings, filled with the hype. */
export function netflixNotice(post: AppPost): { title: string; body: string } {
  const title = titleOf(post);
  const kind = post.pick(9);
  if (kind < 0.4) return { title: `New arrival: ${title.name}`, body: post.event.dek };
  if (kind < 0.75) return { title: "Now streaming", body: `${title.name}. ${post.event.headline}.` };
  return { title: "Top 10 today", body: `${title.name} is #1 in the U.S. today. Watch now.` };
}

const VIEWERS = ["Mina", "Alex", "Sam", "Jordan", "Yuna", "Leo", "Priya", "Kai", "Noor", "Theo"];

/** The profile's name for the "For …" header (the oldest post on the phone). */
export function viewerOf(posts: readonly AppPost[]): string {
  const oldest = posts[posts.length - 1];
  return oldest ? VIEWERS[oldest.item.seed % VIEWERS.length]! : VIEWERS[0]!;
}
