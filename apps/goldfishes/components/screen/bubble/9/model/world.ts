// The model seam: what the rest of the experiment needs from "the model", whatever the model is. Today it is
// PageRank on a living web (web/model.ts, web/iteration.ts; the adapter is pagerank.ts); the layout, the drawing, the
// goldfish, 전파 and 연결 read only what is named here, so another model (agents optimising locally: bubbles with
// keywords, goldfish with temperaments; a fast numeric level and a slow semantic one) takes its place by implementing
// `World`. Types only: nothing here computes.
//
// Who reads what (2026-11-18). `state` is a RankedWeb today, field for field, so a consumer typed on the web moves
// to the contract by changing its import.
//
//   loop/ and simulation/ (through model/index.ts, typed on `World` alone; neither imports web/)
//     raft.step    step(seconds, parameters) → events; a "page" event's page and targets[0] (placed beside it)
//     display      show(fraction): the displayed weight moves towards its next beat
//     rebuild      restart(start) (raft.ts): a new `state` object, `shown` uniform again
//     emitter      state.size, state.out[from][].{target, weight}, shown, flow(from, relation), carried
//     school       state (its identity: a new object makes the school forget its pages), state.size, state.out
//                  and shown (handed to the school)
//     attention    attend(entity, amount, most)
//     spread       add(…) through the raft, then setQuality(entity, value); state.size (the nearest page)
//     summary      state.size, metrics()
//   raft/raft.ts (display.ts, picking.ts, views.ts)
//     arrange      shown → radii; state.rank and size → presence and the 순위 order; state.out[].{target, weight}
//                  → the links that pull; state.groups, state.group → each group's place
//     seedPages    state.size, groups, group, rank
//     pageAt/linkAt  state.size, state.out[].{target, weight, fading}
//     gestures     add(group, quality), relate(from, to, weight), release(from, to), relation(from, to),
//                  metrics().leader (key N); setDamping and restart are the PageRank adapter's own (the raft holds
//                  the adapter as `world`)
//   fish/school-thread.ts, fish/model.ts (SchoolWeb)
//     state.out[page][].{target, weight} (copied flat for the worker), shown[page]
//   spread/contagion.ts
//     state (identity: a new one starts clean), state.size, state.out[from][].target
//   link/feed.ts
//     shown[page] only (through FeedFrame); nothing of the relations
//   index.tsx
//     release(from, to) (a tapped link), through raft.web today
//
// `raft.web` (the same object as `world.state`, typed as the web) is still read by spread/contagion.ts, handed it by
// loop/spread.ts, and by index.tsx: both are typed on RankedWeb.

/** One relation of an entity: the layout pulls along it, portions of weight travel along it, the fish follow it. */
export type Relation = {
  readonly target: number;
  /** ≥ 0; a page's relations need not sum to 1. */
  readonly weight: number;
  /** Being let go: it still carries weight and can no longer be tapped. */
  readonly fading: boolean;
};

/** What is read of the model each frame. Entities are 0 … size − 1, densely. A new object is a new world (a restart). */
export type WorldState = {
  readonly size: number;
  /** Settled weight per entity, Σ = 1 (today the stationary PageRank): presence, the 순위 order, the metrics. */
  readonly rank: ArrayLike<number>;
  /** A slow number of each entity's own, log-scaled (today hidden quality): what watching raises. */
  readonly quality: ArrayLike<number>;
  /** Number of groups (1: one connected world), and each entity's. */
  readonly groups: number;
  readonly group: ArrayLike<number>;
  /** Each entity's outgoing relations, in a stable order. */
  readonly out: readonly (readonly Relation[])[];
};

/** A birth: `page` came in related to `targets` (the first is where it appears). */
export type WorldBirth = { kind: "page"; page: number; targets: number[] };
/** A removal. PageRank never removes a page; a model that does gives the entity gone (and must keep indices dense). */
export type WorldRemoval = { kind: "gone"; page: number };
export type WorldEvent = WorldBirth | WorldRemoval;

/** What the summary reads: the leading entity, and how concentrated the settled weight is (web/metrics.ts). */
export type WorldMetrics = { leader: number; top: number; topTenth: number; gini: number; widest: number; middle: number; large: number };

export interface World<Parameters> {
  readonly state: WorldState;
  /** Displayed weight per entity, Σ = 1: a bubble's area, and what the fish and the feed see as its size. */
  readonly shown: Float64Array;
  /** The share of all displayed weight on its way along relations during one beat (today d). */
  readonly carried: number;
  /** Advances the model by `seconds`; the entities born and gone in it, in order. */
  step(seconds: number, parameters: Parameters): readonly WorldEvent[];
  /** The displayed weight moves `fraction` (0–1) of the way to where one beat takes it. */
  show(fraction: number): void;
  /** The displayed weight `relation` of `from` carries during a beat (as of the last `show`). */
  flow(from: number, relation: Relation): number;
  /** Feedback from outside (the school's watching): raises `entity`'s quality by `amount`, to at most `most` above its group's mean. */
  attend(entity: number, amount: number, most?: number): void;
  /** A new entity by hand, in `group` (the neediest when absent); null when full. */
  add(group?: number, quality?: number): number | null;
  /** A relation made (or strengthened to `weight`) by hand; false when it cannot be. */
  relate(from: number, to: number, weight?: number): boolean;
  /** A relation let go by hand: it fades. False when there is none or it is fading already. */
  release(from: number, to: number): boolean;
  relation(from: number, to: number): Relation | null;
  setQuality(entity: number, value: number): void;
  metrics(): WorldMetrics;
}
