import { TOPICS } from "./topics";
import type { Article } from "./types";

const TOPIC_BY_ID = new Map(TOPICS.map((topic) => [topic.id, topic]));

/**
 * The text under a headline: the topic's verified fact, then, for a piece
 * with a side, that side's reading at the piece's tier. A straight report is
 * the fact alone.
 */
export function bodyOf(article: Article): readonly string[] {
  const topic = TOPIC_BY_ID.get(article.topic);
  if (!topic) return [];
  if (article.slant === "none") return [topic.fact];
  // A 사설 or 칼럼 argues first and states the fact after; a report does the reverse.
  const say = topic.say[article.slant][article.tier];
  return article.tier === 1 ? [say, topic.fact] : [topic.fact, say];
}
