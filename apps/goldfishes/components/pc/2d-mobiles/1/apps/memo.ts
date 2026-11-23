// Feed posts re-render only when the post itself changes (content/posts.ts
// keeps each post's object while it stays in the feed). What a post reads
// from its neighbours — the newest post's time for its age, its position —
// is taken as it was when it first rendered: with posts arriving many times
// a second, re-rendering every post for its age stalled 64 phones.

import type { AppPost } from "./types";

export function samePost(previous: { post: AppPost }, next: { post: AppPost }) {
  return previous.post === next.post;
}
