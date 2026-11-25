// The fields on the GPU: eleven texture arrays on units 8–18 — the four tiers' fields (tiers.ts: 64² for every
// kind, then the pools), their membranes (three: the 256² and 512² pools share one) and their paints (a face's
// photograph) — and, per layer, what a bake measured of it. A bake is taken in here, into the slots the residency
// gives it; the bubble's is made at once, so every kind is drawn as the bubble until its own is in.

import { bubbleField } from "./bubble-field.ts";
import type { FieldAnswer } from "./field-worker";
import { tiersOf, type TierData } from "./tier-data.ts";
import { levelsOf, TIER_FIELD, TIER_MEMBRANE, TIER_PAINT, TIERS, type Residency, type Tier } from "./tiers.ts";

/** The first of the units the arrays are read from (WebGL2 has at least 32; the raft's own programs use 0–7). */
const FIRST_UNIT = 8;
/** The arrays' samplers in the shader (pass/shader.ts), in the order of their units. */
const SAMPLERS = ["fields0", "fields1", "fields2", "fields3", "membranes0", "membranes1", "membranes2", "paints0", "paints1", "paints2", "paints3"] as const;

export type FieldTextures = {
  /** Per layer, how far its outline reaches along x or y (the bubble's until it is baked): the square it is drawn in. */
  readonly reach: Float32Array;
  /** Per layer, how far its outline reaches in any direction. */
  readonly outline: Float32Array;
  /** Takes in a bake: its measures, then each tier it brought, into the slot the residency gives it (if any). */
  takeIn(answer: FieldAnswer): void;
  /** A layer's paint's shader address (its finest tier's), −1 none. */
  paintAddress(layer: number): number;
  /**
   * Names the arrays' units to a program (in use), once: its samplers and where the 512² pool's membranes start
   * never change, so they are not set again every frame.
   */
  link(program: WebGLProgram): void;
  /** Binds the arrays to their units, for a draw. */
  bind(): void;
  dispose(): void;
};

/** The arrays for `residency`'s layers and pools, the bubble's field in them. */
export function createFieldTextures(gl: WebGL2RenderingContext, residency: Residency): FieldTextures {
  const { layers, pools } = residency;
  const array = (size: number, count: number, format: number) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    gl.texStorage3D(gl.TEXTURE_2D_ARRAY, levelsOf(size), format, size, size, Math.max(1, count));
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
  };
  const fieldArrays = TIERS.map((tier) => array(TIER_FIELD[tier], pools[tier], gl.RGBA16F));
  // The 256² and 512² pools' membranes are both 128²: one array, the 256² pool's slots first.
  const membraneArrays = [array(TIER_MEMBRANE[0], pools[0], gl.R16F), array(TIER_MEMBRANE[1], pools[1], gl.R16F), array(TIER_MEMBRANE[2], pools[2] + pools[3], gl.R16F)];
  const paintArrays = TIERS.map((tier) => array(TIER_PAINT[tier], pools[tier], gl.SRGB8_ALPHA8));
  const textures = [...fieldArrays, ...membraneArrays, ...paintArrays];

  /** Per layer, whether it has a paint: a face's photograph (얼굴 사진 색). */
  const painted = new Uint8Array(layers);
  const reach = new Float32Array(layers).fill(1.05);
  const outline = new Float32Array(layers).fill(1.05);

  /** One mip chain into a layer of an array, level by level. */
  const chain = (texture: WebGLTexture, size: number, layer: number, data: Uint16Array | Uint8Array, format: number, type: number, channels: number) => {
    gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);
    let offset = 0;
    for (let side = size, level = 0; side >= 1; side /= 2, level += 1) {
      const count = side * side * channels;
      gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, level, 0, 0, layer, side, side, 1, format, type, data.subarray(offset, offset + count));
      offset += count;
    }
  };
  /** Writes one tier's data into its slot (tier 0: the layer's own). */
  const uploadTier = (tier: Tier, slot: number, data: TierData) => {
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    chain(fieldArrays[tier]!, TIER_FIELD[tier], slot, data.field, gl.RGBA, gl.HALF_FLOAT, 4);
    chain(membraneArrays[Math.min(2, tier)]!, TIER_MEMBRANE[tier], tier === 3 ? pools[2] + slot : slot, data.membrane, gl.RED, gl.HALF_FLOAT, 1);
    if (data.paint) chain(paintArrays[tier]!, TIER_PAINT[tier], slot, data.paint, gl.RGBA, gl.UNSIGNED_BYTE, 4);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  };
  const takeIn = (answer: FieldAnswer) => {
    const { layer } = answer;
    reach[layer] = answer.reach;
    outline[layer] = answer.outline;
    painted[layer] = answer.paint === "face" ? 1 : 0;
    for (const data of [...answer.tiers].sort((a, b) => a.tier - b.tier)) {
      const slot = data.tier === 0 ? layer : residency.place(layer, data.tier, residency.desired[layer] === data.tier);
      if (slot < 0) continue;
      uploadTier(data.tier, slot, data);
      if (data.tier === 0) residency.bake(layer);
    }
  };
  const paintAddress = (layer: number) => {
    const address = residency.address[layer]!;
    return !painted[layer] || address < 0 ? -1 : address;
  };

  // The bubble at once (exact, a few milliseconds), in tier 0 and in a 512² slot kept for it: every kind is drawn as
  // it until its own field is ready.
  {
    const field = bubbleField();
    const slot = residency.pin(0, 3);
    const [base, top] = tiersOf(field, null, [0, 3]);
    takeIn({ layer: 0, reach: field.reach, outline: field.outline, paint: null, tiers: [base!] });
    uploadTier(3, slot, top!);
  }

  return {
    reach,
    outline,
    takeIn,
    paintAddress,
    link: (program) => {
      SAMPLERS.forEach((name, index) => gl.uniform1i(gl.getUniformLocation(program, name), FIRST_UNIT + index));
      gl.uniform1f(gl.getUniformLocation(program, "midSlots"), pools[2]);
    },
    bind: () => {
      for (let index = 0; index < textures.length; index += 1) {
        gl.activeTexture(gl.TEXTURE0 + FIRST_UNIT + index);
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, textures[index]!);
      }
    },
    dispose: () => {
      for (const texture of textures) gl.deleteTexture(texture);
    },
  };
}
