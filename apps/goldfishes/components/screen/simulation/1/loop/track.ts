// The running screen by numbers, once a second, for whichever model is in use: what a frame holds (static) and how
// it is moving (dynamic), so a change to the rules is measured in the body it is seen in. Read from the console:
// window.goldfishTrack (the last 600 seconds), window.goldfishTrackSummary(seconds) for means over the last while.
// Nothing here is drawn (simulation/docs/1.md says what each number is for).

type Raft = { readonly radii: Float64Array; readonly points: Float64Array; readonly size: { readonly width: number; readonly height: number } };
type Model = { readonly state: { readonly size: number; readonly out: readonly (readonly { readonly target: number; readonly fading: boolean }[])[] }; readonly shown: Float64Array; readonly carried: number };

export type TrackRecord = {
  t: number;
  bubbles: number;
  /** Static: the largest bubble's width over the median's, the top tenth's share of the area, the raft's share of the screen. */
  widest: number;
  topTenth: number;
  cover: number;
  /** Static: how many different objects are on the screen, and how many carry over a hundredth of the area each. */
  kinds: number;
  kindsSeen: number;
  /** Dynamic: of the ten largest a second ago, how many still are. */
  tenKept: number;
  /** Dynamic: mean |change| of a bubble's radius per second, over its radius. */
  swell: number;
  /** Dynamic: the share of the displayed weight under way, and how many portions were drawn. */
  carried: number;
  portions: number;
  /** Dynamic: objects that began to change, bursts, fish that changed bubble, all per second; fish on the screen. */
  morphs: number;
  bursts: number;
  moves: number;
  fish: number;
  /** Dynamic: neighbours a bubble gained or lost per second (how much the raft rearranges). */
  rearrange: number;
  /** Frame time over the second, ms: its median and its worst. */
  frame: number;
  frameWorst: number;
};

const TOP = 10;

export class Track {
  private since = 0;
  private readonly last = new Float64Array(4096);
  private top: number[] = [];
  private kindsBefore = new Int16Array(4096).fill(-1);
  private neighbours: Set<number>[] = [];
  private frames: number[] = [];
  private morphs = 0;
  private portions = 0;
  private samples = 0;
  /** Counts handed in by the loop since the last record. */
  bursts = 0;
  moves = 0;

  /** One frame: `delta` seconds, `portions` drawn, `kinds` each bubble's layer (null: not objects), `fish` alive. */
  step(delta: number, time: number, raft: Raft, model: Model, kinds: ArrayLike<number> | null, portions: number, fish: number) {
    this.frames.push(delta * 1_000);
    this.portions += portions;
    this.samples += 1;
    const size = model.state.size;
    if (kinds) {
      for (let bubble = 0; bubble < size; bubble += 1) {
        if (this.kindsBefore[bubble]! >= 0 && this.kindsBefore[bubble] !== kinds[bubble]) this.morphs += 1;
        this.kindsBefore[bubble] = kinds[bubble]!;
      }
    }
    this.since += delta;
    if (this.since < 1) return;
    const seconds = this.since;
    this.since = 0;

    const radii = raft.radii;
    const order = Array.from({ length: size }, (_, bubble) => bubble).sort((a, b) => radii[b]! - radii[a]!);
    const median = radii[order[Math.floor(size / 2)] ?? 0] ?? 1;
    let area = 0;
    let topArea = 0;
    let swell = 0;
    const tenth = Math.max(1, Math.round(size / 10));
    const areaOfKind = new Map<number, number>();
    for (let index = 0; index < size; index += 1) {
      const bubble = order[index]!;
      const r = radii[bubble]!;
      const a = r * r;
      area += a;
      if (index < tenth) topArea += a;
      if (this.last[bubble]! > 0) swell += Math.abs(r - this.last[bubble]!) / Math.max(1, r);
      this.last[bubble] = r;
      if (kinds) areaOfKind.set(kinds[bubble]!, (areaOfKind.get(kinds[bubble]!) ?? 0) + a);
    }
    const top = order.slice(0, TOP);
    const kept = this.top.length ? top.filter((bubble) => this.top.includes(bubble)).length : TOP;
    this.top = top;
    let kindsSeen = 0;
    for (const share of areaOfKind.values()) if (share > area * 0.01) kindsSeen += 1;

    // Neighbours gained or lost: by the model's relations when it has contacts, else skipped (PageRank's are links).
    let changed = 0;
    for (let bubble = 0; bubble < size; bubble += 1) {
      const now = new Set<number>();
      for (const relation of model.state.out[bubble]!) if (!relation.fading) now.add(relation.target);
      const before = this.neighbours[bubble];
      if (before) {
        for (const other of now) if (!before.has(other)) changed += 1;
        for (const other of before) if (!now.has(other)) changed += 1;
      }
      this.neighbours[bubble] = now;
    }
    this.neighbours.length = size;

    const frames = this.frames.sort((a, b) => a - b);
    const record: TrackRecord = {
      t: Math.round(time),
      bubbles: size,
      widest: round((radii[order[0] ?? 0] ?? 0) / Math.max(1, median)),
      topTenth: round(topArea / Math.max(1, area)),
      cover: round((Math.PI * area) / Math.max(1, raft.size.width * raft.size.height)),
      kinds: areaOfKind.size,
      kindsSeen,
      tenKept: kept,
      swell: round(swell / Math.max(1, size) / seconds),
      carried: round(model.carried),
      portions: Math.round(this.portions / Math.max(1, this.samples)),
      morphs: round(this.morphs / seconds),
      bursts: round(this.bursts / seconds),
      moves: round(this.moves / seconds),
      fish,
      rearrange: round(changed / Math.max(1, size) / seconds),
      frame: round(frames[Math.floor(frames.length / 2)] ?? 0),
      frameWorst: round(frames[frames.length - 1] ?? 0),
    };
    this.frames = [];
    this.morphs = 0;
    this.portions = 0;
    this.samples = 0;
    this.bursts = 0;
    this.moves = 0;
    const host = window as unknown as { goldfishTrack?: TrackRecord[]; goldfishTrackSummary?: (seconds?: number) => Record<string, number> };
    const log = (host.goldfishTrack ??= []);
    log.push(record);
    if (log.length > 600) log.shift();
    host.goldfishTrackSummary ??= (over = 60) => {
      const records = (host.goldfishTrack ?? []).slice(-over);
      const mean: Record<string, number> = { seconds: records.length };
      for (const key of Object.keys(records[0] ?? {}) as (keyof TrackRecord)[]) {
        if (key === "t") continue;
        mean[key] = round(records.reduce((sum, one) => sum + one[key], 0) / Math.max(1, records.length));
      }
      // How long the ten largest last: of ten, the mean number replaced each second.
      mean.tenTurnover = round(TOP - (mean.tenKept ?? TOP));
      return mean;
    };
  }
}

function round(value: number) {
  return Math.round(value * 1_000) / 1_000;
}
