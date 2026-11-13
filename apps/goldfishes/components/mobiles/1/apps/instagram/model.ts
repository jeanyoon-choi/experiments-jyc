// A hype event as an Instagram post: the account, its numbers, its caption. Pure functions of the post's seed.

import type { AppPost } from "../types";
import { portraitFor } from "../../content/images";

export type Account = { handle: string; avatar: string; verified: boolean; subtitle?: string };

const slug = (text: string) =>
  text
    .normalize("NFKD")
    .replace(/[^\w\s.&-]/g, "")
    .toLowerCase()
    .trim();

/** "Verdant Silicon" → "verdantsilicon"; "Jin-ho Park" → "jinho.park". */
export function orgHandle(org: string) {
  return slug(org).replace(/&/g, "and").replace(/[\s.-]+/g, "");
}

function personHandle(name: string, pick: number) {
  const words = slug(name).replace(/&/g, "and").replace(/-/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0]!;
  const joined = pick < 0.4 ? words.join(".") : pick < 0.75 ? words.join("_") : `${words.join("")}`;
  return joined;
}

/** Org accounts post the event; sometimes the quoted person posts it instead, with a location. */
export function accountOf(post: AppPost): Account {
  const { event, item, pick } = post;
  if (pick(11) < 0.62) {
    return { handle: orgHandle(event.org), avatar: portraitFor(item.seed >>> 3), verified: pick(12) < 0.8 };
  }
  const cities = ["San Francisco, California", "Brooklyn, New York", "Austin, Texas", "Seoul, South Korea", "London, United Kingdom", "Palo Alto, California"];
  return {
    handle: personHandle(event.person.name, pick(13)),
    avatar: portraitFor(item.seed >>> 5),
    verified: pick(14) < 0.3,
    subtitle: cities[Math.floor(pick(15) * cities.length)],
  };
}

/** Instagram's short count summary: 749, 2.7K, 36.2K, 823K, 1.2M. */
export function compactCount(count: number) {
  const [unit, size] = count >= 1e6 ? (["M", 1e6] as const) : count >= 1e4 ? (["K", 1e3] as const) : count >= 1e3 ? (["K", 1e3] as const) : (["", 1] as const);
  if (size === 1) return String(count);
  const value = count / size;
  return `${(value >= 100 ? Math.round(value).toString() : value.toFixed(1)).replace(/\.0$/, "")}${unit}`;
}

export function countsOf(post: AppPost) {
  const { pick } = post;
  const likes = Math.round(900 + Math.pow(pick(21), 2.2) * 420_000);
  const comments = Math.max(3, Math.round(likes / (28 + pick(22) * 70)));
  const reposts = Math.max(1, Math.round(likes / (60 + pick(23) * 90)));
  const shares = Math.max(2, Math.round(likes / (18 + pick(24) * 40)));
  return { likes, comments, reposts, shares };
}

/** The feed's age line: "1 minute ago", "12 minutes ago", "2 hours ago". */
export function ageOf(newestAt: number, at: number) {
  const minutes = Math.max(1, Math.round((newestAt - at) / 60_000) + 1);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export function hashtags(tags: readonly string[]) {
  return tags.map((tag) => `#${tag.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase()}`);
}

/** Seven or so slides: the counter on a carousel reads "1/7". */
export function slidesOf(post: AppPost) {
  return 3 + Math.floor(post.pick(31) * 8);
}

/** The story tray: other accounts from the slot's history, then a fixed cast. */
const CAST = ["maya.chen", "jinho_park", "priya.raman", "lena.ortiz", "sam.okafor", "arifeld", "chloe.theo", "rafa.costa"];

export function storyAccounts(posts: readonly AppPost[]) {
  const seen = new Set<string>();
  const out: { id: string; handle: string; avatar: string }[] = [];
  for (const post of posts) {
    const handle = accountOf(post).handle;
    if (seen.has(handle)) continue;
    seen.add(handle);
    out.push({ id: `p${post.item.id}`, handle, avatar: accountOf(post).avatar });
  }
  const seed = posts[0]?.item.seed ?? 0;
  for (let index = 0; out.length < 4 && index < CAST.length; index += 1) {
    const handle = CAST[(seed + index) % CAST.length]!;
    if (seen.has(handle)) continue;
    seen.add(handle);
    out.push({ id: `c${handle}`, handle, avatar: portraitFor(seed + index * 7 + 1) });
  }
  return out.slice(0, 4);
}
