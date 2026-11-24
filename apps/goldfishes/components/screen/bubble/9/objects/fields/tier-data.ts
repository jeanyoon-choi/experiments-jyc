// A baked field cut into its tiers (tiers.ts): what a worker hands over (field-worker.ts) and what the main thread
// makes itself for the bubble (field-textures.ts). Apart from bake.ts so the main thread takes no bakes with it.

import { ALBEDO_SIZE, FIELD_SIZE, MEMBRANE_SIZE } from "./frame.ts";
import { chainOf, fieldLevel, membraneLevel, paintChainOf, paintLevel, sliceChain, toHalf, type Tier } from "./tiers.ts";

/** One tier's data: its field's mip chain (RGBA half floats), its membrane's (R half floats), its paint's (sRGB RGBA), or none. */
export type TierData = { tier: Tier; field: Uint16Array; membrane: Uint16Array; paint: Uint8Array | null };
/** A full bake's mip chains, as the tiers are cut from them: field and membrane as half floats, paint as sRGB bytes. */
export type Chains = { field: Uint16Array; membrane: Uint16Array; paint: Uint8Array | null };

/**
 * How many kinds' chains a worker keeps (field-worker.ts), the longest unused going first: about 2.9 MB a kind, so
 * 70 MB a worker at most. bake-queue.ts counts the same way to know which worker holds which.
 */
export const KEPT_BAKES = 24;

/** A full bake's chains. */
export function chainsOf(field: { data: Float32Array; membrane: Float32Array }, albedo: Uint8ClampedArray | null): Chains {
  return {
    field: toHalf(chainOf(field.data, FIELD_SIZE, 4)),
    membrane: toHalf(chainOf(field.membrane, MEMBRANE_SIZE, 1)),
    paint: albedo ? paintChainOf(albedo, ALBEDO_SIZE) : null,
  };
}

/** The tiers' slices of a bake's chains, each a copy (the chains stay whole). */
export function tiersFrom(chains: Chains, tiers: readonly Tier[]): TierData[] {
  return tiers.map((tier) => ({
    tier,
    field: sliceChain(chains.field, FIELD_SIZE, 4, fieldLevel(tier)),
    membrane: sliceChain(chains.membrane, MEMBRANE_SIZE, 1, membraneLevel(tier)),
    paint: chains.paint ? sliceChain(chains.paint, ALBEDO_SIZE, 4, paintLevel(tier)) : null,
  }));
}

/** A field's tiers from its full bake (also used on the main thread for the bubble). */
export function tiersOf(field: { data: Float32Array; membrane: Float32Array }, albedo: Uint8ClampedArray | null, tiers: readonly Tier[]): TierData[] {
  return tiersFrom(chainsOf(field, albedo), tiers);
}
