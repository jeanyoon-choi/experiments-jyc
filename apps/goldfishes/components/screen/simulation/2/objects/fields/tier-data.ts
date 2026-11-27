// A baked field cut into its tiers (tiers.ts): what a worker hands over (field-worker.ts) and what the main thread
// makes itself for the bubble (field-textures.ts). Apart from bake.ts so the main thread takes no bakes with it.

import { ALBEDO_SIZE, FIELD_SIZE, MEMBRANE_SIZE } from "./frame.ts";
import { chainOf, fieldLevel, membraneLevel, paintChainOf, paintLevel, sliceChain, toHalf, type Tier } from "./tiers.ts";

/** One tier's data: its field's mip chain (RGBA half floats), its membrane's (R half floats), its paint's (sRGB RGBA), or none. */
export type TierData = { tier: Tier; field: Uint16Array; membrane: Uint16Array; paint: Uint8Array | null };
/** A full bake's mip chains, as the tiers are cut from them: field and membrane as half floats, paint as sRGB bytes. */
export type Chains = { field: Uint16Array; membrane: Uint16Array; paint: Uint8Array | null };

/**
 * How many kinds' chains a worker keeps (field-worker.ts), the longest unused going first: about 2.9 MB a kind.
 * bake-queue.ts counts the same way to know which worker holds which (this constant is the same in the page and in
 * its workers: both read the same navigator.deviceMemory).
 *
 * simulation/2 (2026-11-25): its bubbles swell and burst every half minute and take on each other's objects, so some
 * 70 kinds trade the finer pools' slots every 30 s. With 24 kept a worker, one request in three was a kind no longer
 * kept and was baked over again (0.5 s each in the browser: 0.6–1.1 cores for good, measured). Where the machine has
 * the memory (8 GB or more, as Chrome reports it; unknown elsewhere) each worker keeps 40: 116 MB a worker at most.
 */
const DEVICE_MEMORY = (globalThis as { navigator?: { deviceMemory?: number } }).navigator?.deviceMemory;
export const KEPT_BAKES = DEVICE_MEMORY !== undefined && DEVICE_MEMORY >= 8 ? 40 : 24;

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
