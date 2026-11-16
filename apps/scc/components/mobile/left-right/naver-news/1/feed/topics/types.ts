// What a story gives the headline generator (../articles.ts).
//
// A headline is two halves joined by "…": `a` is the front clause (a quoted
// line or the situation, about 8–18 characters) and `b` the back clause (a
// reaction, an actor's move or an outlook, about 6–16 characters). Every `a`
// of a cell must read correctly with every `b` of the same cell, because the
// generator pairs them freely. Neither half carries a bracket tag ([사설],
// [단독] …): the generator adds those by tier.

export type Cell = {
  /** Front clauses: exactly 5. */
  a: readonly string[];
  /** Back clauses: exactly 6. */
  b: readonly string[];
  /** Body paragraphs in this side's voice at this tier: exactly 2, each 2–3 sentences. */
  say: readonly string[];
};

export type TopicData = {
  id: string;
  /** What happened, from the verified timeline only; 2–3 sentences. Opens every body. */
  fact: string;
  /** Straight reports for the level screen: 4 front and 4 back clauses, no slant. */
  plain: { a: readonly string[]; b: readonly string[] };
  /** Per side, the three tiers in order: 온건 (slanted report), 강경 (사설·칼럼), 극단 (팬덤 매체). */
  left: readonly [Cell, Cell, Cell];
  right: readonly [Cell, Cell, Cell];
};
