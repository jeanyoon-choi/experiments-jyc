// feed/1's payloads as the browser sees them (shapes: ./slots.mjs; forms: socket/experiments/feed/1/protocol.mjs).

export type FeedKeyword = { id: string; label: string; set: string };

export type FeedItem = {
  /** Unique, rising: a stable React key. */
  id: number;
  slot: number;
  /** The goldfish's serial. */
  fish: number;
  page: number;
  keyword: string;
  /** The page's attention relative to the largest, 0–1. */
  rank: number;
  /** 32-bit: the pc chooses its content from this. */
  seed: number;
  at: number;
};

/** `attached`: its fish is at a bubble now; false, the phone is dark. */
export type FeedSlot = { slot: number; fish: number | null; attached: boolean; history: FeedItem[] };

export type FeedState = { vocabulary: FeedKeyword[]; slots: FeedSlot[] };

export type FeedPush = { items: FeedItem[]; released: number[]; idle: number[] };
