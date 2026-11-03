import assert from "node:assert/strict";
import test from "node:test";
import { concentration, createRankedWeb, DEFAULT_PARAMETERS, FLOOR_RANGE, stepRankedWeb, type RankedWeb } from "./model.ts";

// bubble/6's opening parameters (settings.ts PRESET_3.rates), on 800 pages as it opens.
const PARAMETERS = { ...DEFAULT_PARAMETERS, volatility: 1.5, floor: FLOOR_RANGE[0] * (FLOOR_RANGE[1] / FLOOR_RANGE[0]) ** (1 - 0.03) };

/** A stand-in for the goldfish: every second the ten largest pages are watched, as frame-loop's attend raises them. */
function watch(web: RankedWeb) {
  const largest = Array.from(web.rank.subarray(0, web.size))
    .map((rank, page) => [rank, page] as const)
    .sort((a, b) => b[0] - a[0])
    .slice(0, 10);
  for (const [, page] of largest) web.quality[page] = Math.min(1.5, web.quality[page]! + 0.25);
}

/** 90 s at 30 steps a second; the last 60 s averaged. */
function run(dynamics: number) {
  const web = createRankedWeb(800, 0x2545f491, 1);
  const parameters = { ...PARAMETERS, dynamics };
  let gini = 0;
  let widest = 0;
  let peak = 0;
  let samples = 0;
  let leaders = 0;
  let last = -1;
  // Motion: how far the fifty largest pages' ranks move each second, |Δ ln rank| on average.
  let motion = 0;
  let moves = 0;
  let before: Float64Array | null = null;
  for (let step = 1; step <= 90 * 30; step += 1) {
    stepRankedWeb(web, 1 / 30, parameters);
    if (step % 30 !== 0) continue;
    watch(web);
    let lead = 0;
    for (let page = 1; page < web.size; page += 1) if (web.rank[page]! > web.rank[lead]!) lead = page;
    if (lead !== last) leaders += 1;
    last = lead;
    const ranks = web.rank.subarray(0, web.size);
    if (before) {
      const largest = Array.from(ranks)
        .map((rank, page) => [rank, page] as const)
        .sort((a, b) => b[0] - a[0])
        .slice(0, 50);
      for (const [rank, page] of largest) {
        motion += Math.abs(Math.log(rank / Math.max(1e-12, before[page] ?? rank)));
        moves += 1;
      }
    }
    before = Float64Array.from(ranks);
    if (step < 30 * 30) continue;
    const share = concentration(web);
    gini += share.gini;
    widest += share.widest;
    peak = Math.max(peak, share.widest);
    samples += 1;
  }
  return { gini: gini / samples, widest: widest / samples, peak, leaders, motion: motion / moves };
}

test("bubble/6 moves as bubble/5 does, but its largest pages burst before they cover the screen", () => {
  const before = run(0);
  const after = run(1);
  const report =
    `before gini ${before.gini.toFixed(2)} widest ${before.widest.toFixed(1)}× (peak ${before.peak.toFixed(1)}×) motion ${before.motion.toFixed(2)}; ` +
    `after gini ${after.gini.toFixed(2)} widest ${after.widest.toFixed(1)}× (peak ${after.peak.toFixed(1)}×) motion ${after.motion.toFixed(2)}`;
  console.log(report);
  assert.ok(before.widest > 10, report);
  // Hierarchy kept, only its top cut: most of bubble/5's spread, but its peaks clearly lower.
  assert.ok(after.widest > before.widest * 0.6, report);
  assert.ok(after.peak < before.peak * 0.85, report);
  // bubble/5's motion is kept: ranks move at least as much.
  assert.ok(after.motion >= before.motion * 0.9, report);
});
