// The sentence for screen readers, every two seconds, and the same numbers kept for the console
// (window.bubbleWebLog).

import type { World } from "../model";

const SUMMARY_SECONDS = 2;

function percent(rank: number) {
  return `${(rank * 100).toFixed(rank >= 0.1 ? 0 : 1)}%`;
}

export class Summary {
  private since = SUMMARY_SECONDS;

  /** `delta` seconds on; `time` is the raft's clock, `say` the summary hook. */
  step(delta: number, world: Pick<World<never>, "state" | "metrics">, time: number, say: (text: string) => void) {
    this.since += delta;
    if (this.since <= SUMMARY_SECONDS) return;
    this.since = 0;
    const pages = world.state.size;
    const share = world.metrics();
    const top = share.leader;
    say(`${pages} pages. The leading page, number ${top + 1}, holds ${percent(share.top)} of PageRank; the top tenth of pages hold ${percent(share.topTenth)}.`);
    // How even the web is, every two seconds, for checking from the console: window.bubbleWebLog.
    const record = { t: Math.round(time), pages, leader: top, top: share.top, topTenth: share.topTenth, gini: share.gini, widest: share.widest, middle: share.middle, large: share.large };
    const host = window as unknown as { bubbleWebLog?: (typeof record)[] };
    (host.bubbleWebLog ??= []).push(record);
    if (host.bubbleWebLog.length > 600) host.bubbleWebLog.shift();
  }
}
