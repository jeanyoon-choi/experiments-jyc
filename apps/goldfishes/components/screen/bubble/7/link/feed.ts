// 연결 (user, 2026-10-27): bubble/7 as the main screen of socket feed/1. Each
// goldfish that has just reached a bubble is
// sent to the relay with the bubble's page and keyword — what the page is
// shown as (its object kind, its 전파 strain's under 전파, or "bubble") — so
// pc/mobiles/N can show what that goldfish now sees. On by default (first
// opt-in behind `?feed`, which left the phones empty: user, 2026-10-27);
// `?feed=0` turns it off. Nothing on screen changes either way. The relay never slows the raft: sending is batched and
// dropped while offline (components/transport/feed/1/screen-link.ts). The
// phone slots themselves — and every timing — live beside the fish, in the
// link (slots.mjs), so tuning them is a reload.
//
// The keyword vocabulary is this screen's own: a later bubble/N with other
// objects changes `VOCABULARY` (and keywordOf) and nothing else.

import { FeedScreenLink, type FeedKeyword } from "@/components/transport/feed/1";
import type { Fish } from "../fish/goldfish";
import { FIELD_KINDS } from "../objects/morph";
import { OBJECT_SETS, pageKind, type ObjectParameters } from "../objects/objects";

const LABELS: Record<string, string> = {
  sparkle: "AI",
  cloud: "Cloud",
  gpu: "GPU",
  robot: "Robots",
  humanoid: "Humanoid",
  robotDog: "Robot dog",
  roadster: "Tesla",
  headset: "VR",
  ape: "NFT",
  rocket: "Rocket",
  chat: "Chatbot",
  spinner: "Loading",
  heart: "Love",
  like: "Likes",
  comment: "Comments",
};

export const VOCABULARY: FeedKeyword[] = [
  ...Object.entries(OBJECT_SETS).flatMap(([set, { kinds }]) => kinds.map((kind) => ({ id: kind, label: LABELS[kind] ?? kind, set }))),
  { id: "bubble", label: "Bubble", set: "bubble" },
];

export const FEED_ENABLED = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("feed") !== "0";

export type FeedFrame = {
  objects: ObjectParameters;
  /** 전파's strain kind per page (an index into FIELD_KINDS, −1 none), or null. */
  caught: ArrayLike<number> | null;
  time: number;
  /** Each page's attention as drawn, for its rank. */
  shown: ArrayLike<number>;
  pageCount: number;
};

/** Out of touch this long, a fish has let go: its phone goes dark. Shorter gaps are its mouth flickering on the edge. */
const DETACH_MS = 150;

type Sent = { page: number; attached: boolean; touchedAt: number };

export class BubbleFeed {
  private readonly link = new FeedScreenLink();
  /** Fish serial → what it was last told as. */
  private sent = new Map<number, Sent>();
  private alive = new Set<number>();

  constructor() {
    this.link.setVocabulary(VOCABULARY);
  }

  private keywordOf(page: number, frame: FeedFrame) {
    const caught = frame.caught?.[page];
    if (caught !== undefined && caught >= 0) return FIELD_KINDS[caught] ?? "bubble";
    return pageKind(page, frame.objects, frame.time) ?? "bubble";
  }

  /**
   * After the school's step: new contacts, and fish gone since the last frame.
   * A fish that reaches another bubble is a new contact even with the same
   * keyword, and even when it never let go in between (user, 2026-10-27).
   */
  observe(fish: readonly Fish[], frame: FeedFrame) {
    let largest = 0;
    for (let page = 0; page < frame.pageCount; page += 1) largest = Math.max(largest, frame.shown[page] ?? 0);
    const now = performance.now();
    const alive = this.alive;
    alive.clear();
    for (const one of fish) {
      const serial = Math.floor(one.seed);
      alive.add(serial);
      const last = this.sent.get(serial);
      const touching = one.touching && one.target >= 0 && one.target < frame.pageCount;
      if (!touching) {
        // Let go: dark once the gap outlasts a flicker.
        if (last?.attached && now - last.touchedAt >= DETACH_MS) {
          this.link.detach(serial);
          last.attached = false;
        }
        continue;
      }
      if (last?.attached && last.page === one.target) {
        last.touchedAt = now;
        continue;
      }
      const rank = largest > 0 ? (frame.shown[one.target] ?? 0) / largest : 0;
      this.link.contact(serial, one.target, this.keywordOf(one.target, frame), rank);
      this.sent.set(serial, { page: one.target, attached: true, touchedAt: now });
    }
    for (const serial of this.sent.keys()) {
      if (alive.has(serial)) continue;
      this.link.depart(serial);
      this.sent.delete(serial);
    }
  }

  close() {
    // The relay tells the pcs this screen has gone; its phones go dark.
    this.link.close();
  }
}
