// Bakes objects' fields (bake.ts) off the main thread: each takes 70–330 ms,
// and baked in the frame loop they stalled the first two seconds (measured
// 2026-10-27: fifteen frames of 100–167 ms). Asked for a kind and the tiers
// it should fill (tiers.ts), it bakes the full field once and answers with
// each tier's slice of its mip chains — field and membrane as half floats,
// paint as sRGB bytes — the buffers handed over rather than copied. A face
// (faces.ts) first fetches and decodes its portrait; if that fails it is baked
// from a blank one, a head without a likeness, so the layer never waits for ever.
//
// A kind is asked for again and again: first for tier 0, then for the tier its page grew into, and once more
// whenever it wins back a pool slot it had lost (measured 2026-11-24 on the opening: seven bakes a second without
// end, three in four of a kind baked in the two minutes before, the three workers never idle). So the worker keeps
// the chains of the kinds it baked last (KEPT_BAKES) and cuts the tiers asked for from those: the same bytes as a
// bake over again, in a few milliseconds. bake-queue.ts sends a kind to the worker that holds it when that one is free.

import { bakeKind, type PaintKind } from "./bake";
import type { FieldKind } from "./fields";
import { chainsOf, KEPT_BAKES, tiersFrom, type Chains, type TierData } from "./tier-data";
import type { Tier } from "./tiers";

export type FieldRequest = { layer: number; kind: FieldKind; tiers: Tier[] };
/** A baked layer: what every tier shares (its outline's measures, what its paint is), then each tier asked for. */
export type FieldAnswer = {
  layer: number;
  reach: number;
  outline: number;
  paint: PaintKind;
  tiers: TierData[];
};

/** A bake kept: what every tier shares, and the chains the tiers are cut from. */
type Kept = { reach: number; outline: number; paint: PaintKind; chains: Chains; blank: boolean };
/** The kinds baked last, the longest unused first (a Map keeps the order its entries were set in). */
const kept = new Map<FieldKind, Kept>();

async function bakeOf(kind: FieldKind): Promise<Kept> {
  const { field, albedo, paint, blank } = await bakeKind(kind);
  return { reach: field.reach, outline: field.outline, paint, chains: chainsOf(field, albedo), blank: blank === true };
}

// One request at a time: bake-queue.ts sends the next only to a worker that has answered.
self.onmessage = async (event: MessageEvent<FieldRequest>) => {
  const { layer, kind, tiers } = event.data;
  const bake = kept.get(kind) ?? (await bakeOf(kind));
  // Set again, so it is the last to go; then the longest unused goes (as bake-queue.ts `keep` counts it). A face
  // without its portrait is not kept, so its next bake asks for the portrait again (the queue may then send that
  // bake here for nothing: it is baked like any other).
  kept.delete(kind);
  if (!bake.blank) kept.set(kind, bake);
  if (kept.size > KEPT_BAKES) kept.delete(kept.keys().next().value!);
  const data = tiersFrom(bake.chains, tiers);
  const answer: FieldAnswer = { layer, reach: bake.reach, outline: bake.outline, paint: bake.paint, tiers: data };
  const transfer: ArrayBuffer[] = data.flatMap((tier) => [tier.field.buffer, tier.membrane.buffer, ...(tier.paint ? [tier.paint.buffer] : [])] as ArrayBuffer[]);
  (self as unknown as Worker).postMessage(answer, transfer);
};
