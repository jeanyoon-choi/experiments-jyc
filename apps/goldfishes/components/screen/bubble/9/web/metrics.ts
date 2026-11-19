// Read-only measures of a ranked web, for the summary line and the console log. They read the rank and the page
// count and nothing else, so anything that keeps a distribution over its pages can be measured by them.

type Ranked = { readonly size: number; readonly rank: Float64Array };

/**
 * Share of rank held by the top page and by the top 10% of pages; the Gini
 * coefficient of rank; how many times the median bubble's width the largest
 * one's is (area is rank, so √(top / median)); and how many pages are 2–5
 * times the median's width (the middle) and 5 times or more (the large).
 */
export function concentration(web: Ranked) {
  const ranks = Array.from(web.rank.subarray(0, web.size)).sort((a, b) => b - a);
  const tenth = Math.max(1, Math.round(web.size / 10));
  const n = ranks.length;
  let weighted = 0;
  let total = 0;
  // Sorted descending: the i-th largest takes weight (n + 1 − 2(i + 1)) reversed.
  for (let index = 0; index < n; index += 1) {
    weighted += (n - 2 * index - 1) * ranks[index]!;
    total += ranks[index]!;
  }
  const median = ranks[Math.floor(n / 2)] ?? 0;
  let middle = 0;
  let large = 0;
  for (const rank of ranks) {
    const width = median > 0 ? Math.sqrt(rank / median) : 0;
    if (width >= 5) large += 1;
    else if (width >= 2) middle += 1;
  }
  return {
    middle,
    large,
    top: ranks[0] ?? 0,
    topTenth: ranks.slice(0, tenth).reduce((sum, value) => sum + value, 0),
    gini: n > 0 && total > 0 ? weighted / (n * total) : 0,
    widest: median > 0 ? Math.sqrt((ranks[0] ?? 0) / median) : 0,
  };
}

/** The page with the most rank (the first of equals). */
export function leader(web: Ranked) {
  let best = 0;
  for (let page = 1; page < web.size; page += 1) if (web.rank[page]! > web.rank[best]!) best = page;
  return best;
}
