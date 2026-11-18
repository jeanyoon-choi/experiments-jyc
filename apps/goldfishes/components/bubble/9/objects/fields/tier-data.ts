// A baked field cut into its tiers (tiers.ts): what a worker hands over (field-worker.ts) and what the main thread
// makes itself for the bubble (field-textures.ts). Apart from bake.ts so the main thread takes no bakes with it.

import { ALBEDO_SIZE, FIELD_SIZE, MEMBRANE_SIZE } from "./frame.ts";
import { chainOf, fieldLevel, membraneLevel, paintChainOf, paintLevel, sliceChain, toHalf, type Tier } from "./tiers.ts";

/** One tier's data: its field's mip chain (RGBA half floats), its membrane's (R half floats), its paint's (sRGB RGBA), or none. */
export type TierData = { tier: Tier; field: Uint16Array; membrane: Uint16Array; paint: Uint8Array | null };
/** A field's tiers from its full bake (also used on the main thread for the bubble). */
export function tiersOf(field: { data: Float32Array; membrane: Float32Array }, albedo: Uint8ClampedArray | null, tiers: readonly Tier[]): TierData[] {
  const fieldChain = toHalf(chainOf(field.data, FIELD_SIZE, 4));
  const membraneChain = toHalf(chainOf(field.membrane, MEMBRANE_SIZE, 1));
  const paintChain = albedo ? paintChainOf(albedo, ALBEDO_SIZE) : null;
  return tiers.map((tier) => ({
    tier,
    field: sliceChain(fieldChain, FIELD_SIZE, 4, fieldLevel(tier)),
    membrane: sliceChain(membraneChain, MEMBRANE_SIZE, 1, membraneLevel(tier)),
    paint: paintChain ? sliceChain(paintChain, ALBEDO_SIZE, 4, paintLevel(tier)) : null,
  }));
}
