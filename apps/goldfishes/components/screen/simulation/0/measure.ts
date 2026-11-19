// What state the screen is in, by numbers (the model document's state reading, as M8.2 rewrote it after the
// artist's correction: read the direction of change, not its amount). Once a second, over the last four:
//
//   turnover  keyword changes per bubble per second
//   oneWay    net change / gross change: 1 when every change goes the same way (one keyword taking over),
//             near 0 when changes cancel (A to B, B to A)
//   flipped   share of changes made by bubbles that changed twice or more
//
//   안정 (still): turnover < 0.01 — 지배 when one keyword holds half the fish, 공존 when two or more share them
//   전환 (turning): oneWay ≥ 0.55 and flipped < 0.25
//   난리 (uproar): otherwise, when turnover ≥ 0.03
//   흔들림 (wavering): the rest
//
// The thresholds are the document's first guesses, fitted to two scenes the artist had named; they are not settled.
// `rearranged` (neighbours a bubble gained in the second) is beside the state, not in it: a screen can read 난리
// while every bubble sits still and only blinks (M6), so it has to be looked at too.

import { keywordOf, type Bubble, type World } from "./model.ts";

export type State = "안정 · 지배" | "안정 · 공존" | "안정" | "전환" | "난리" | "흔들림";

export type Sample = {
  time: number;
  state: State;
  turnover: number;
  oneWay: number;
  flipped: number;
  /** Share of the fish on the leading keyword, and how many keywords share the fish (1 / Σ p²). */
  lead: number;
  keywords: number;
  fish: number;
  bubbles: number;
  /** In the last second: bursts, moves per fish, fish that came and left, neighbours gained per bubble. */
  bursts: number;
  moves: number;
  joined: number;
  left: number;
  rearranged: number;
  /** The largest bubble's area over the area of a bubble holding the starting mean. */
  largest: number;
};

const WINDOW = 4;

export class Meter {
  readonly samples: Sample[] = [];
  private readonly held: Map<Bubble, number>[] = [];
  private beside = new Map<Bubble, Set<Bubble>>();
  private since = 0;

  /** Call after every step; takes a sample each second of the world's time. */
  after(world: World, seconds: number) {
    this.since += seconds;
    if (this.since < 1) return;
    this.since -= 1;
    this.samples.push(this.read(world));
  }

  private read(world: World): Sample {
    const { bubbles, fish, counts } = world;
    const now = new Map<Bubble, number>();
    for (const bubble of bubbles) now.set(bubble, keywordOf(world, bubble));
    this.held.push(now);
    if (this.held.length > WINDOW + 1) this.held.shift();

    const watching = new Map<number, number>();
    for (const one of fish) {
      const keyword = keywordOf(world, one.at);
      watching.set(keyword, (watching.get(keyword) ?? 0) + 1);
    }
    let lead = 0;
    let squares = 0;
    for (const count of watching.values()) {
      const share = count / Math.max(1, fish.length);
      lead = Math.max(lead, share);
      squares += share * share;
    }
    const keywords = squares > 0 ? 1 / squares : 0;

    // Changes inside the window, and how many of them a bubble made twice over.
    let gross = 0;
    const perBubble = new Map<Bubble, number>();
    for (let at = 0; at + 1 < this.held.length; at += 1) {
      const before = this.held[at]!;
      for (const [bubble, keyword] of this.held[at + 1]!) {
        const was = before.get(bubble);
        if (was === undefined || was === keyword) continue;
        gross += 1;
        perBubble.set(bubble, (perBubble.get(bubble) ?? 0) + 1);
      }
    }
    // Net: how far each keyword's bubble count moved from the window's start to its end.
    const first = this.held[0]!;
    const balance = new Map<number, number>();
    for (const [bubble, keyword] of now) {
      const was = first.get(bubble);
      if (was === undefined) continue;
      balance.set(was, (balance.get(was) ?? 0) - 1);
      balance.set(keyword, (balance.get(keyword) ?? 0) + 1);
    }
    let net = 0;
    for (const moved of balance.values()) net += Math.abs(moved);
    net /= 2;
    let twice = 0;
    for (const changes of perBubble.values()) if (changes >= 2) twice += changes;
    const span = Math.max(1, this.held.length - 1);
    const turnover = gross / bubbles.length / span;
    const oneWay = gross ? net / gross : 1;
    const flipped = gross ? twice / gross : 0;

    let state: State;
    if (turnover < 0.01) state = lead >= 0.5 ? "안정 · 지배" : keywords >= 2 ? "안정 · 공존" : "안정";
    else if (oneWay >= 0.55 && flipped < 0.25) state = "전환";
    else if (turnover >= 0.03) state = "난리";
    else state = "흔들림";

    let gained = 0;
    const beside = new Map<Bubble, Set<Bubble>>();
    for (const bubble of bubbles) {
      const set = new Set(bubble.neighbours);
      beside.set(bubble, set);
      const before = this.beside.get(bubble);
      if (before) for (const other of set) if (!before.has(other)) gained += 1;
    }
    this.beside = beside;

    let widest = 0;
    for (const bubble of bubbles) widest = Math.max(widest, bubble.shown);
    const usual = Math.sqrt((world.parameters.area * 0.45 * 0.45) / world.parameters.bubbles);

    const sample: Sample = {
      time: world.time,
      state,
      turnover,
      oneWay,
      flipped,
      lead,
      keywords,
      fish: fish.length,
      bubbles: bubbles.length,
      bursts: counts.bursts,
      moves: counts.moves / Math.max(1, fish.length),
      joined: counts.joined,
      left: counts.left,
      rearranged: gained / bubbles.length,
      largest: (widest * widest) / (usual * usual),
    };
    counts.signChanges = counts.moves = counts.bursts = counts.left = counts.joined = 0;
    return sample;
  }
}

/** Share of the samples in each state. */
export function shares(samples: readonly Sample[]) {
  const out: Record<string, number> = {};
  for (const sample of samples) {
    const key = sample.state.startsWith("안정") ? "안정" : sample.state;
    out[key] = (out[key] ?? 0) + 1 / samples.length;
  }
  return out;
}
