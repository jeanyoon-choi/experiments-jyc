// `?measure`: what a frame costs. CPU work lapped part by part, plus the GPU, synchronised by a 1-pixel read; the
// numbers go to window.bubbleLaps, bubbleCounts and bubbleLife and to the frameCost hook. Without `?measure`
// nothing here runs but an empty call per lap.

/** Frame cost is measured only when the URL asks for it (?measure). */
export const MEASURE = typeof window !== "undefined" && window.location.search.includes("measure");

/** The frame's parts, as ?measure times them. */
const LAPS = ["web", "display", "arrange", "emit", "fish", "foamCpu", "gpu", "fishGpu"] as const;

function noLap(index: number) {
  void index;
}

export class Measure {
  /** Smoothed ms per part of the frame (?measure only). */
  private readonly laps = new Float64Array(8);
  private lapStart = 0;
  // Frame cost, when asked for: CPU work plus the GPU, synchronised by a 1-pixel read.
  private readonly costs = new Float64Array(120);
  private costCount = 0;
  /** Ends the part `index` of LAPS (−1: only starts the clock); nothing unless measuring. */
  readonly mark: (index: number) => void = MEASURE ? (index) => this.lap(index) : noLap;

  /** When the frame began (0 unless measuring). */
  start() {
    return MEASURE ? performance.now() : 0;
  }

  lap(index: number) {
    const now = performance.now();
    if (index >= 0) this.laps[index] = this.laps[index]! * 0.95 + (now - this.lapStart) * 0.05;
    this.lapStart = now;
  }

  /**
   * After the frame is presented (measuring only): waits for the GPU, then publishes the laps, the frame's cost
   * (median / 95th percentile, once a second, to `frameCost`), how many 흐름 버블 and pages it drew, and the
   * lifecycle's counts (`life`, null without a school).
   */
  finish(frameStart: number, renderer: { sync(): void }, flows: number, pages: number, life: object | null, frameCost: (text: string) => void) {
    renderer.sync();
    this.lap(6);
    (window as unknown as { bubbleLaps?: unknown }).bubbleLaps = Object.fromEntries(LAPS.map((name, index) => [name, this.laps[index]!.toFixed(2)]));
    this.cost(frameStart, frameCost);
    // How many 흐름 버블 and pages this frame drew, to check the 흐름 버블 양 slider.
    (window as unknown as { bubbleCounts?: unknown }).bubbleCounts = { flows, pages };
    // The lifecycle's counts, for measurement only.
    if (life) (window as unknown as { bubbleLife?: unknown }).bubbleLife = life;
  }

  /** The GPU is done by now (`finish` waited for it), so the frame's cost is the time since it began. */
  private cost(frameStart: number, frameCost: (text: string) => void) {
    const costs = this.costs;
    costs[this.costCount % costs.length] = performance.now() - frameStart;
    this.costCount += 1;
    if (this.costCount % 60 !== 0) return;
    const sorted = Array.from(costs.subarray(0, Math.min(this.costCount, costs.length))).sort((a, b) => a - b);
    const at = (share: number) => sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))]!;
    frameCost(`${at(0.5).toFixed(1)} / ${at(0.95).toFixed(1)}`);
  }
}
