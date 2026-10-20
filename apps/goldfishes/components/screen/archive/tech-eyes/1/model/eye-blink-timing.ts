/** Pure blink timing for the six-frame photographic eye sheets. */
export type EyeBlinkFrame = 0 | 1 | 2 | 3 | 4 | 5;

export interface EyeBlinkStep {
  frame: EyeBlinkFrame;
  /** Time to retain this frame before moving to the following step. */
  holdMs: number;
}

export interface EyeBlinkPlan {
  steps: readonly EyeBlinkStep[];
  /** Elapsed time from the first partially closed frame to the open frame. */
  durationMs: number;
  /** Time from this blink returning open to the next blink beginning. */
  nextDelayMs: number;
  isDoubleBlink: boolean;
}

export type BlinkRandom = () => number;

const randomUnit = (rng: BlinkRandom) => Math.min(.999_999, Math.max(0, rng()));
const between = (rng: BlinkRandom, min: number, max: number) =>
  min + Math.floor(randomUnit(rng) * (max - min + 1));

/**
 * Entry is deliberately sampled separately from the recurring cadence. Its
 * wider, earlier range stops several eyes loaded together from blinking in a
 * synchronized 620–800 ms window.
 */
export function sampleFirstBlinkDelay(rng: BlinkRandom): number {
  return between(rng, 180, 920);
}

/**
 * A full blink is 206–244 ms. It drops quickly to closed, pauses only briefly,
 * and takes longer to reopen. Skipping the near-duplicate sprite frames keeps
 * the fastest sampled plan around 24 visual changes per second.
 */
export function sampleEyeBlinkPlan(rng: BlinkRandom): EyeBlinkPlan {
  const steps: readonly EyeBlinkStep[] = [
    { frame: 1, holdMs: between(rng, 36, 42) },
    { frame: 2, holdMs: between(rng, 34, 40) },
    { frame: 4, holdMs: between(rng, 36, 44) },
    { frame: 2, holdMs: between(rng, 46, 54) },
    { frame: 1, holdMs: between(rng, 54, 64) },
    { frame: 0, holdMs: 0 },
  ];
  const durationMs = steps.reduce((total, step) => total + step.holdMs, 0);
  const isDoubleBlink = randomUnit(rng) < .12;

  return {
    steps,
    durationMs,
    isDoubleBlink,
    nextDelayMs: isDoubleBlink
      ? between(rng, 110, 210)
      : between(rng, 2600, 6800),
  };
}
