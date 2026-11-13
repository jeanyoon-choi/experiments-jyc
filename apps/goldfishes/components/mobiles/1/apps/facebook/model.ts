// A hype event as a Facebook post: who shares it (the org's Page, or the person, a friend), the link card,
// and the numbers under it. Pure functions of the post's seed.

import { portraitFor } from "../../content/images";
import type { AppPost } from "../types";

export type Author = { name: string; avatar: string; verified: boolean; page: boolean };

export function authorOf(post: AppPost): Author {
  const { event, item, pick } = post;
  if (pick(61) < 0.55) return { name: event.org, avatar: portraitFor(item.seed >>> 3), verified: pick(62) < 0.7, page: true };
  return { name: event.person.name, avatar: portraitFor(item.seed >>> 5), verified: false, page: false };
}

const siteOf = (org: string) =>
  `${org
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "")}.com`;

/** Fictional outlets: a friend shares news, a Page shares its own site. */
const OUTLETS = ["byteline.news", "thecircuitdaily.com", "hypecycle.co", "frontierwire.com", "signalnoise.net"];

export function domainOf(post: AppPost, author: Author) {
  return (author.page ? siteOf(post.event.org) : OUTLETS[Math.floor(post.pick(63) * OUTLETS.length)]!).toUpperCase();
}

/** Facebook's short counts: 845, 1.2K, 12K, 1.4M. */
export function shortCount(count: number) {
  if (count < 1000) return String(count);
  if (count < 10_000) return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  if (count < 1_000_000) return `${Math.round(count / 1000)}K`;
  return `${(count / 1e6).toFixed(1).replace(/\.0$/, "")}M`;
}

export function countsOf(post: AppPost, author: Author) {
  const { pick } = post;
  const scale = author.page ? 52_000 : 2_400;
  const reactions = Math.round(14 + Math.pow(pick(71), 2) * scale);
  const comments = Math.max(2, Math.round(reactions / (3 + pick(72) * 9)));
  const shares = Math.max(1, Math.round(reactions / (4 + pick(73) * 14)));
  const order = (["like", "love", "wow", "haha"] as const).slice();
  // The top three reactions: Like first most of the time; a surprising post leads with Wow.
  if (pick(74) < 0.25) order.unshift(order.splice(2, 1)[0]!);
  return { reactions, comments, shares, faces: order.slice(0, pick(75) < 0.5 ? 3 : 2) };
}

/** "Just now", "4m", "2h", "1d". */
export function ageOf(newestAt: number, at: number) {
  const minutes = Math.round((newestAt - at) / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  return hours < 24 ? `${hours}h` : `${Math.round(hours / 24)}d`;
}

/** The story tray: the slot's other people, then a fixed cast of friends. */
const CAST = ["Maya Chen", "Priya Raman", "Sam Okafor", "Lena Ortiz", "Theo Brandt", "Rafael Costa"];

export function storiesOf(posts: readonly AppPost[]) {
  const seed = posts[0]?.item.seed ?? 0;
  const names = new Set<string>();
  const out: { id: string; name: string; avatar: string; photo: string }[] = [];
  for (const post of posts) {
    const name = post.event.person.name;
    if (names.has(name)) continue;
    names.add(name);
    out.push({ id: `p${post.item.id}`, name, avatar: portraitFor(post.item.seed >>> 7), photo: portraitFor(post.item.seed >>> 9) });
  }
  for (let index = 0; out.length < 3 && index < CAST.length; index += 1) {
    const name = CAST[(seed + index) % CAST.length]!;
    if (names.has(name)) continue;
    names.add(name);
    out.push({ id: `c${index}`, name, avatar: portraitFor(seed + index * 5 + 2), photo: portraitFor(seed + index * 11 + 9) });
  }
  return out.slice(0, 3);
}
