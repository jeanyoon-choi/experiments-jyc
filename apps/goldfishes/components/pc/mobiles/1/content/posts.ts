// A slot's history as a clone's posts: newest first, each with its event.

import type { FeedItem, FeedKeyword } from "@/components/transport/feed/1";
import type { AppPost } from "../apps/types";
import { eventFor } from "./events";

/** 0–1, a pure function of a seed and a salt. */
export function pickOf(seed: number) {
  return (salt: number) => {
    let value = Math.imul((seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0, 0x85ebca6b) >>> 0;
    value = Math.imul(value ^ (value >>> 13), 0xc2b2ae35) >>> 0;
    return ((value ^ (value >>> 16)) >>> 0) / 4_294_967_296;
  };
}

/**
 * Each item's post, kept while the vocabulary stays the same: a post keeps its
 * object as the feed grows over it, so the clones' memoized posts render once.
 */
const cache = new Map<number, AppPost>();
let cachedVocabulary: readonly FeedKeyword[] | null = null;

export function postsOf(history: readonly FeedItem[], vocabulary: readonly FeedKeyword[]): AppPost[] {
  if (cachedVocabulary !== vocabulary || cache.size > 8_000) {
    cache.clear();
    cachedVocabulary = vocabulary;
  }
  let labels: Map<string, string> | null = null;
  const posts: AppPost[] = [];
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const item = history[index]!;
    let post = cache.get(item.id);
    if (!post || post.item.seed !== item.seed) {
      labels ??= new Map(vocabulary.map((keyword) => [keyword.id, keyword.label]));
      const label = labels.get(item.keyword) ?? item.keyword;
      post = { item, event: eventFor(item.keyword, label, item.seed), label, pick: pickOf(item.seed) };
      cache.set(item.id, post);
    }
    posts.push(post);
  }
  return posts;
}
