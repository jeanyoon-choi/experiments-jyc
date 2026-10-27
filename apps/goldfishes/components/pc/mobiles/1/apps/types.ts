// The contract every app clone in pc/mobiles/1 meets (apps/<id>/index.tsx).
//
// A clone is one app's home feed drawn at native iOS points on the 390 × 844
// glass (1 CSS px = 1 pt; the phone scales the whole glass). It is pure: it
// renders `posts` (newest first) and nothing else — no timers, no randomness,
// no fetching, no global listeners, no window or viewport units (read
// `--glass-width` / `--glass-height` if a size is needed). Variation comes
// from each post's `seed`. The newest post is the one a goldfish just reached;
// the clone shows it at the top of its feed as that app would show a new post.
//
// Every post wraps one hype event (content/events.ts): the same event reaches
// all eight apps, each in its own grammar — the UI is only a wrapper (NOTES
// 1017). A keyword with no events gets a generic event built from its label,
// so a clone never meets a missing keyword.

import type { ComponentType } from "react";
import type { FeedItem } from "@/components/transport/feed/1";
import type { HypeEvent } from "../content/events";

export type AppId = "tinder" | "yelp" | "linkedin" | "netflix" | "x" | "facebook" | "instagram" | "news";

export type AppPost = {
  item: FeedItem;
  event: HypeEvent;
  /** The keyword's display label (from the screen's vocabulary). */
  label: string;
  /** 0–1 from `item.seed`, for picking among variants. */
  pick: (salt: number) => number;
};

export type AppScreenProps = {
  /** Newest first, at most the slot's history. Never empty. */
  posts: readonly AppPost[];
};

export type AppDefinition = {
  id: AppId;
  /** As on the home screen under its icon. */
  name: string;
  /** NOTES 1017: the deadly sin this platform stands for (the news is the eighth axis). */
  sin: string;
  Screen: ComponentType<AppScreenProps>;
  /** The home-screen icon, filling a size × size square (the phone rounds its corners). */
  Icon: ComponentType<{ size: number }>;
  /** Status bar glyphs over this app's top: "light" on dark apps. */
  statusTone: "light" | "dark";
  /** The lock-screen / banner notification this app would send for a post. */
  notify: (post: AppPost) => { title: string; body: string };
};
