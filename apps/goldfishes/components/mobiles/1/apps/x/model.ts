// A hype event as an X post (Wrath): who posts it, what they say, how hard it
// gets ratioed. Pure: everything follows from the post's event and `pick`.

import { imageFor, portraitFor } from "../../content/images";
import type { AppPost } from "../types";

export type Account = {
  name: string;
  handle: string;
  verified: "blue" | "gold" | null;
  /** A portrait path, or null: an organisation's square monogram. */
  avatar: string | null;
  monogram: string;
  tint: string;
};

export type Tweet = {
  author: Account;
  text: string;
  /** The organisation's own post, quoted. */
  quote: { author: Account; text: string; image?: string } | null;
  image?: string;
  replies: number;
  reposts: number;
  likes: number;
  views: number;
};

const TINTS = ["#1d1d1f", "#0b3d91", "#5b2bd6", "#0f766e", "#b42318", "#c2410c", "#334155", "#7c2d12"];

const handleOf = (name: string) => name.replace(/[^A-Za-z0-9_]/g, "");

function personAccount(post: AppPost): Account {
  const { name } = post.event.person;
  const base = handleOf(name).toLowerCase() || "user";
  const suffix = post.pick(11) < 0.4 ? String(Math.floor(post.pick(12) * 90) + 10) : "";
  return {
    name,
    handle: `${base}${suffix}`.slice(0, 15),
    verified: post.pick(13) < 0.72 ? "blue" : null,
    avatar: portraitFor(post.item.seed),
    monogram: name.slice(0, 1),
    tint: TINTS[0]!,
  };
}

function orgAccount(post: AppPost): Account {
  const { org } = post.event;
  const words = org.split(/\s+/).filter(Boolean);
  return {
    name: org,
    handle: (words.map((word) => word[0]!.toUpperCase() + word.slice(1)).join("").replace(/[^A-Za-z0-9_]/g, "") || "Official").slice(0, 15),
    verified: "gold",
    avatar: null,
    monogram: words.slice(0, 2).map((word) => word[0]!.toUpperCase()).join(""),
    tint: TINTS[Math.floor(post.pick(14) * TINTS.length)]!,
  };
}

const hashtag = (tag: string) => `#${tag.replace(/[^A-Za-z0-9]/g, "")}`;

/** The angry take, quote-post energy. */
function takeOf(post: AppPost, org: Account): string {
  const { event, label } = post;
  const [a = "this", b = a, c = b] = event.figures;
  const takes = [
    `This is genuinely insane. ${a}?? And we're all supposed to clap?`,
    `Nobody asked for this. NOBODY. @${org.handle} really looked at ${a} and said "ship it"`,
    `If you're still defending @${org.handle} after this, you are part of the problem.`,
    `${a}. ${b}. ${c}.\n\nRead those numbers again and tell me ${label} isn't a bubble.`,
    `"${event.dek}"\n\nWe are so cooked.`,
    `Every single person who hyped ${label} owes us an apology. Every. Single. One. ${hashtag(event.tags[0] ?? label)}`,
    `I said this a year ago and got ratioed. Who's laughing now?`,
    `Imagine being the ${event.person.role.split(",")[0]!.toLowerCase()} and explaining ${a} with a straight face`,
    `the fact that this is real news in 2026. ${a}. unbelievable.`,
    `Not a parody account. Not satire. ${a}. Delete your app.`,
  ];
  return takes[Math.floor(post.pick(2) * takes.length)]!;
}

function count(post: AppPost, salt: number, scale: number) {
  return Math.round(scale * (0.55 + post.pick(salt) * 0.9));
}

export function tweetOf(post: AppPost): Tweet {
  const { event } = post;
  const image = imageFor(event.image);
  const org = orgAccount(post);
  const kind = post.pick(1);
  // Reach: 300 to ~1M likes, louder for the page the fish found more attention on.
  const likes = Math.round(10 ** (2.5 + post.pick(3) * 2.6 + post.item.rank * 0.8));
  const numbers = (ratio: number) => ({
    likes,
    replies: count(post, 4, likes * ratio),
    reposts: count(post, 5, likes * 0.22),
    views: count(post, 6, likes * 64),
  });

  if (kind < 0.24) {
    // The organisation's own announcement, ratioed: more replies than likes.
    return { author: org, text: `${event.headline}.\n\n${event.dek}`, quote: null, image, ...numbers(1.6) };
  }
  const author = personAccount(post);
  if (kind < 0.5) {
    const [a, b, c] = event.figures;
    const list = [a, b, c].filter(Boolean).map((figure) => `— ${figure}`).join("\n");
    return { author, text: `${event.headline}\n\n${list}\n\n${takeOf(post, org)}`, quote: null, image, ...numbers(0.18) };
  }
  return { author, text: takeOf(post, org), quote: { author: org, text: `${event.headline}. ${event.dek}`, image }, ...numbers(0.24) };
}

/** X's counts: 999, 1.2K, 12K, 1.2M. */
export function compact(value: number): string {
  if (value < 1000) return String(value);
  if (value < 10_000) return `${(value / 1000).toFixed(1).replace(/\.0$/, "")}K`;
  if (value < 1_000_000) return `${Math.floor(value / 1000)}K`;
  return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Timeline stamp, measured back from the newest post (a few seconds old). */
export function stampOf(post: AppPost, newest: AppPost): string {
  const seconds = Math.max(0, Math.round((newest.item.at - post.item.at) / 1000)) + 3 + Math.floor(newest.pick(9) * 40);
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h`;
  const date = new Date(post.item.at);
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
}
