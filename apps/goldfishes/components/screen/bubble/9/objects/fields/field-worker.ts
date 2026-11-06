// Bakes objects' fields (bake.ts) off the main thread: each takes 70–330 ms,
// and baked in the frame loop they stalled the first two seconds (measured
// 2026-10-27: fifteen frames of 100–167 ms). Asked for a kind and the tiers
// it should fill (tiers.ts), it bakes the full field once and answers with
// each tier's slice of its mip chains — field and membrane as half floats,
// paint as sRGB bytes — the buffers handed over rather than copied. A face
// (faces.ts) first fetches and decodes its portrait; if that fails it is baked
// from a blank one, a head without a likeness, so the layer never waits for ever.

import { bakeKind, tiersOf, type PaintKind, type TierData } from "./bake";
import type { FieldKind } from "./fields";
import type { Tier } from "./tiers";

export type FieldRequest = { layer: number; kind: FieldKind; tiers: Tier[] };
/** A baked layer: what every tier shares (its outline's measures, what its paint is), then each tier asked for. */
export type FieldAnswer = {
  layer: number;
  thickness: number;
  peak: number;
  reach: number;
  outline: number;
  paint: PaintKind;
  tiers: TierData[];
  /** Milliseconds the bake took (the field, then the chains). */
  took: number;
};

self.onmessage = async (event: MessageEvent<FieldRequest>) => {
  const { layer, kind, tiers } = event.data;
  const started = performance.now();
  const { field, albedo, paint } = await bakeKind(kind);
  const data = tiersOf(field, albedo, tiers);
  const answer: FieldAnswer = { layer, thickness: field.thickness, peak: field.peak, reach: field.reach, outline: field.outline, paint, tiers: data, took: performance.now() - started };
  const transfer: ArrayBuffer[] = data.flatMap((tier) => [tier.field.buffer, tier.membrane.buffer, ...(tier.paint ? [tier.paint.buffer] : [])] as ArrayBuffer[]);
  (self as unknown as Worker).postMessage(answer, transfer);
};
