// 기호의 파티 (bubble/9, 2026-11-05): with the catalogue (catalogue/index.ts) there are hundreds of kinds, and the
// fields can no longer all sit at 512² on the GPU (bubble/8: one 512² RGBA16F layer and its mips per kind, ~2.8 MB,
// ~150 MB for 54 kinds; with ~550 kinds, ~1.5 GB). Nor does any object need them: a field is only as fine as the
// object is large on screen. The object pass's `detail` is the finest mip worth reading at an object's size, and a
// field's mip chain from level j down is the same field at 512 / 2^j. So each kind is kept in tiers:
//
//   tier 0  64²   every kind, resident once baked (exact for objects whose detail ≥ 3, the raft's many small pages),
//   tier 1  128²  a pool of slots,
//   tier 2  256²  a pool,
//   tier 3  512²  a pool (the largest objects, the 랩's),
//
// each tier with its membrane (fields.ts) and paint (a face's photograph, a catalogue kind's albedo) at the same
// relative size. The pools are fixed at the start from one memory budget, so GPU memory never grows with the
// catalogue; a kind is drawn from the finest tier it has. Every frame the object pass records each kind's largest
// object on screen; a few times a second `Residency.plan` ranks the kinds wanting each pool (largest first, the
// holders favoured a little so they do not swap back and forth), and the workers bake on demand those that lack
// the tier they want — every bake fills free slots too, so in the opening state each kind bakes once.
//
// Measured 2026-11-05 on the opening state (1470 × 919 CSS px at 2 device px per CSS px, 1,053 objects drawn, 48
// kinds on screen): each kind's largest object wanted tier 3 for 17–19 kinds, tier 2 for 7–12, tier 1 for 9–13 and
// tier 0 for ~10. The pools below hold all of that, so the opening draws every object as exactly as bubble/8 did.

/** Texels per side of a full field (fields.ts FIELD_SIZE) and of its membrane (MEMBRANE_SIZE), and a face's paint (ALBEDO_SIZE). */
const FULL = 512;
const FULL_MEMBRANE = 128;
const FULL_PAINT = 256;

export type Tier = 0 | 1 | 2 | 3;
export const TIERS: readonly Tier[] = [0, 1, 2, 3];
export const TOP_TIER: Tier = 3;
/** Each tier's field, membrane and paint, texels per side. */
export const TIER_FIELD = [64, 128, 256, 512] as const;
export const TIER_MEMBRANE = [32, 64, 128, 128] as const;
export const TIER_PAINT = [32, 64, 128, 256] as const;
/** The mip level of the full field (and paint, membrane) each tier starts at. */
export const fieldLevel = (tier: Tier) => Math.log2(FULL / TIER_FIELD[tier]);
export const membraneLevel = (tier: Tier) => Math.log2(FULL_MEMBRANE / TIER_MEMBRANE[tier]);
export const paintLevel = (tier: Tier) => Math.log2(FULL_PAINT / TIER_PAINT[tier]);

/** A shader address: tier × ADDRESS_TIER + slot (tier 0's slot is the layer itself). */
export const ADDRESS_TIER = 4096;
/** Added to a paint's address when it is a catalogue kind's own colours (브랜드 색), not a face's photograph (얼굴 사진 색). */
export const ADDRESS_BRAND = 16384;

/** Mip levels of a square of `size` down to 1². */
export const levelsOf = (size: number) => Math.log2(size) + 1;

/** Bytes of a mip chain of `size`² texels of `bytes` each. */
export function chainBytes(size: number, bytes: number) {
  let total = 0;
  for (let side = size; side >= 1; side /= 2) total += side * side * bytes;
  return total;
}

/** Bytes one tier holds per kind or slot: field RGBA16F, membrane R16F, paint SRGB8_ALPHA8, each with its mips. */
export const tierBytes = (tier: Tier) => chainBytes(TIER_FIELD[tier], 8) + chainBytes(TIER_MEMBRANE[tier], 2) + chainBytes(TIER_PAINT[tier], 4);

/** Fields, membranes and paints together stay within this (bubble/8 held ~154 MiB for its 55 layers and 16 photographs). */
export const MEMORY_BUDGET = 150 * 2 ** 20;
/** The pools wanted (slots of tiers 1–3); smaller only where the budget asks. */
const WANTED = { 1: 128, 2: 40, 3: 24 } as const;
/** WebGL2 guarantees 256 layers per array; every browser this runs on has 2048. */
const MAX_LAYERS = 2048;

/** Per tier, its layers: every kind for tier 0, then the pools' slots. */
export type Pools = readonly [number, number, number, number];

/** The pools for `layers` field layers (the bubble and every kind) within `budget`. */
export function poolsFor(layers: number, budget = MEMORY_BUDGET): Pools {
  const base = layers * tierBytes(0);
  let hi: number = Math.min(WANTED[3], layers);
  let mid: number = Math.min(WANTED[2], layers);
  const left = () => budget - base - hi * tierBytes(3) - mid * tierBytes(2);
  // A huge catalogue: the 512² pool gives way first down to 8, then the 256² pool down to 16.
  while (left() < 32 * tierBytes(1) && hi > 8) hi -= 1;
  while (left() < 32 * tierBytes(1) && mid > 16) mid -= 1;
  const lo = Math.max(1, Math.min(WANTED[1], layers, MAX_LAYERS, Math.floor(left() / tierBytes(1))));
  return [Math.min(layers, MAX_LAYERS), lo, mid, hi];
}

/** GPU bytes of the pools. */
export const bytesOf = (pools: Pools) => TIERS.reduce<number>((total, tier) => total + pools[tier] * tierBytes(tier), 0);

/**
 * The coarsest tier exact for an object of `radius` CSS px at `cssPerPixel`: the object pass reads mip
 * log2(FULL / (2 × 1.5) × cssPerPixel / radius) of the full field; a tier is exact where that is ≥ its first level.
 */
export function tierFor(radius: number, cssPerPixel: number): Tier {
  const texels = ((FULL / 3) * cssPerPixel) / Math.max(radius, 1e-3);
  if (texels >= 8) return 0;
  if (texels >= 4) return 1;
  if (texels >= 2) return 2;
  return 3;
}

// Mip chains, made in the workers (field-worker.ts) so each tier is a slice of one chain: a kind drawn from any tier
// is the same field at that level, and nothing pops when it moves between tiers. A 2 × 2 box, as generateMipmap's.

/** A float chain: level 0 (`data`, `size`² × `channels`), then each half, down to 1². */
export function chainOf(data: Float32Array, size: number, channels: number) {
  const chain = new Float32Array((chainBytes(size, 4) / 4) * channels);
  chain.set(data.subarray(0, size * size * channels));
  let from = 0;
  let to = size * size * channels;
  for (let side = size / 2; side >= 1; side /= 2) {
    const wide = side * 2;
    for (let y = 0; y < side; y += 1) {
      for (let x = 0; x < side; x += 1) {
        const a = from + ((y * 2) * wide + x * 2) * channels;
        const b = a + wide * channels;
        const out = to + (y * side + x) * channels;
        for (let c = 0; c < channels; c += 1) chain[out + c] = (chain[a + c]! + chain[a + channels + c]! + chain[b + c]! + chain[b + channels + c]!) * 0.25;
      }
    }
    from = to;
    to += side * side * channels;
  }
  return chain;
}

const LINEAR = Float32Array.from({ length: 256 }, (_, value) => {
  const c = value / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
});
const toSrgb = (linear: number) => Math.round(255 * (linear <= 0.0031308 ? linear * 12.92 : 1.055 * linear ** (1 / 2.4) - 0.055));

/** A paint chain (sRGB RGBA bytes): averaged in linear light, as an sRGB texture's mips are. */
export function paintChainOf(data: Uint8ClampedArray | Uint8Array, size: number) {
  const chain = new Uint8Array(chainBytes(size, 4));
  chain.set(data.subarray(0, size * size * 4));
  let from = 0;
  let to = size * size * 4;
  for (let side = size / 2; side >= 1; side /= 2) {
    const wide = side * 2;
    for (let y = 0; y < side; y += 1) {
      for (let x = 0; x < side; x += 1) {
        const a = from + ((y * 2) * wide + x * 2) * 4;
        const b = a + wide * 4;
        const out = to + (y * side + x) * 4;
        for (let c = 0; c < 3; c += 1) chain[out + c] = toSrgb((LINEAR[chain[a + c]!]! + LINEAR[chain[a + 4 + c]!]! + LINEAR[chain[b + c]!]! + LINEAR[chain[b + 4 + c]!]!) * 0.25);
        chain[out + 3] = Math.round((chain[a + 3]! + chain[a + 7]! + chain[b + 3]! + chain[b + 7]!) * 0.25);
      }
    }
    from = to;
    to += side * side * 4;
  }
  return chain;
}

/** The part of a chain of `size` from `level` on (a tier's), copied. */
export function sliceChain<T extends Float32Array | Uint16Array | Uint8Array>(chain: T, size: number, channels: number, level: number): T {
  let offset = 0;
  for (let at = 0; at < level; at += 1) offset += (size >> at) * (size >> at) * channels;
  return chain.slice(offset) as T;
}

const halfBits = new Float32Array(1);
const halfWord = new Uint32Array(halfBits.buffer);
/** A float's half-float bits, rounded to nearest even (as WebGL rounds FLOAT data into a 16-bit texture). */
function toHalfBits(value: number) {
  halfBits[0] = value;
  const x = halfWord[0]!;
  const sign = (x >>> 16) & 0x8000;
  const exponent = (x >>> 23) & 0xff;
  let mantissa = x & 0x7fffff;
  if (exponent === 0xff) return sign | 0x7c00 | (mantissa ? 0x200 : 0);
  const e = exponent - 127 + 15;
  if (e >= 0x1f) return sign | 0x7c00;
  if (e <= 0) {
    if (e < -10) return sign;
    mantissa |= 0x800000;
    const shift = 14 - e;
    const half = mantissa >>> shift;
    const rest = mantissa & ((1 << shift) - 1);
    const middle = 1 << (shift - 1);
    return sign | (half + (rest > middle || (rest === middle && half & 1) ? 1 : 0));
  }
  const half = (e << 10) | (mantissa >>> 13);
  const rest = mantissa & 0x1fff;
  return sign | (half + (rest > 0x1000 || (rest === 0x1000 && half & 1) ? 1 : 0));
}

type Float16Constructor = new (source: ArrayLike<number>) => { buffer: ArrayBuffer };
const Float16 = (globalThis as { Float16Array?: Float16Constructor }).Float16Array;

/** A float chain as half floats (for HALF_FLOAT uploads: half the bytes to hand over and no conversion in the driver). */
export function toHalf(data: Float32Array): Uint16Array {
  if (Float16) return new Uint16Array(new Float16(data).buffer);
  const out = new Uint16Array(data.length);
  for (let at = 0; at < data.length; at += 1) out[at] = toHalfBits(data[at]!);
  return out;
}

/**
 * Which kinds hold which pool slots, and which want which (no GL here: object-pass.ts uploads what it says).
 * Tier 0 is every kind's own layer; the pools' slots are taken by the kinds whose objects on screen are largest.
 */
export class Residency {
  /** Per layer: tier 0 baked. */
  readonly baked: Uint8Array;
  /** Per tier 1–3 and layer: its slot, −1 none. */
  readonly slotOf: Int16Array[];
  /** Per tier 1–3 and slot: the layer in it, −1 free. */
  readonly holder: Int32Array[];
  /** Per layer: the tier it should have now (plan), and when it was last on screen. */
  readonly desired: Int8Array;
  readonly lastSeen: Float64Array;
  /** Per layer: the shader address of its finest tier, −1 until baked. */
  readonly address: Float32Array;
  private readonly pinned = new Set<number>();
  /** Layers pinned somewhere: left out of the ranking. */
  private readonly fixed = new Set<number>();

  readonly layers: number;
  readonly pools: Pools;

  constructor(layers: number, pools: Pools) {
    this.layers = layers;
    this.pools = pools;
    this.baked = new Uint8Array(layers);
    this.slotOf = TIERS.map(() => new Int16Array(layers).fill(-1));
    this.holder = TIERS.map((tier) => new Int32Array(tier === 0 ? 0 : pools[tier]).fill(-1));
    this.desired = new Int8Array(layers);
    this.lastSeen = new Float64Array(layers).fill(-Infinity);
    this.address = new Float32Array(layers).fill(-1);
  }

  private readdress(layer: number) {
    if (!this.baked[layer]) {
      this.address[layer] = -1;
      return;
    }
    for (let tier = TOP_TIER; tier >= 1; tier -= 1) {
      const slot = this.slotOf[tier]![layer]!;
      if (slot >= 0) {
        this.address[layer] = tier * ADDRESS_TIER + slot;
        return;
      }
    }
    this.address[layer] = layer;
  }

  /** Tier 0 is in. */
  bake(layer: number) {
    this.baked[layer] = 1;
    this.readdress(layer);
  }

  /** Keeps `layer` in `tier`'s first free slot for good (the bubble); returns the slot. */
  pin(layer: number, tier: Tier) {
    const slot = this.place(layer, tier);
    if (slot >= 0) {
      this.pinned.add(tier * this.layers + layer);
      this.fixed.add(layer);
    }
    return slot;
  }

  private evictable(tier: Tier, slot: number) {
    const layer = this.holder[tier]![slot]!;
    return layer < 0 || (!this.pinned.has(tier * this.layers + layer) && this.desired[layer]! < tier);
  }

  /** A free slot in `tier`, or the one held longest unseen by a kind that does not want it; −1 none. */
  private slotFor(tier: Tier) {
    const holders = this.holder[tier]!;
    let best = -1;
    let oldest = Infinity;
    for (let slot = 0; slot < holders.length; slot += 1) {
      if (holders[slot]! < 0) return slot;
      if (!this.evictable(tier, slot)) continue;
      const seen = this.lastSeen[holders[slot]!]!;
      if (seen < oldest) {
        oldest = seen;
        best = slot;
      }
    }
    return best;
  }

  /** Whether `tier` has a slot `layer` could take now. */
  canPlace(layer: number, tier: Tier) {
    if (tier === 0) return !this.baked[layer];
    if (this.slotOf[tier]![layer]! >= 0) return false;
    return this.slotFor(tier) >= 0;
  }

  /**
   * Gives `layer` a slot of `tier` (its data then goes there), evicting a holder that no longer wants it; −1 none.
   * `wanted` false (a bake that only filled spare room): only a free slot.
   */
  place(layer: number, tier: Tier, wanted = true): number {
    if (tier === 0) {
      this.bake(layer);
      return layer;
    }
    const own = this.slotOf[tier]![layer]!;
    if (own >= 0) return own;
    const holders = this.holder[tier]!;
    const slot = this.slotFor(tier);
    if (slot < 0 || (!wanted && holders[slot]! >= 0)) return -1;
    const evicted = holders[slot]!;
    if (evicted >= 0) {
      this.slotOf[tier]![evicted] = -1;
      this.readdress(evicted);
    }
    holders[slot] = layer;
    this.slotOf[tier]![layer] = slot;
    this.readdress(layer);
    return slot;
  }

  /**
   * From each layer's largest object on screen this while (`radius`, CSS px; 0 not drawn), the tier each should
   * have: the pools go to the largest objects' kinds, tier by tier from the finest, those already holding a slot
   * favoured by a quarter so two kinds of about one size do not trade it back and forth.
   */
  plan(radius: Float32Array, cssPerPixel: number, time: number) {
    const { desired, layers } = this;
    const need = new Int8Array(layers);
    const ranked: number[] = [];
    for (let layer = 0; layer < layers; layer += 1) {
      desired[layer] = 0;
      if (radius[layer]! <= 0 || this.fixed.has(layer)) continue;
      this.lastSeen[layer] = time;
      need[layer] = tierFor(radius[layer]!, cssPerPixel);
      if (need[layer]! > 0) ranked.push(layer);
    }
    for (let tier = TOP_TIER; tier >= 1; tier -= 1) {
      // The pinned (the bubble's 512² slot) are not to be had.
      const slots = this.pools[tier] - this.holder[tier]!.reduce((count, layer) => count + (layer >= 0 && this.pinned.has(tier * layers + layer) ? 1 : 0), 0);
      const wanting = ranked.filter((layer) => need[layer]! >= tier && desired[layer] === 0);
      const score = (layer: number) => radius[layer]! * (this.slotOf[tier]![layer]! >= 0 ? 1.25 : 1);
      wanting.sort((a, b) => score(b) - score(a));
      for (let at = 0; at < Math.min(slots, wanting.length); at += 1) desired[wanting[at]!] = tier;
    }
  }

  /** The tiers a bake of `layer` should bring: tier 0 if missing, the tier it wants if missing, and any spare room. */
  tiersToBake(layer: number): Tier[] {
    const tiers: Tier[] = [];
    if (!this.baked[layer]) tiers.push(0);
    for (let tier = 1 as Tier; tier <= TOP_TIER; tier = (tier + 1) as Tier) {
      if (this.slotOf[tier]![layer]! >= 0) continue;
      if (this.desired[layer]! === tier ? this.slotFor(tier) >= 0 : this.holder[tier]!.includes(-1)) tiers.push(tier);
    }
    return tiers;
  }

  /** Whether `layer` wants a tier it lacks (a bake is worth it). */
  lacking(layer: number) {
    if (!this.baked[layer]) return true;
    const tier = this.desired[layer]!;
    return tier > 0 && this.slotOf[tier]![layer]! < 0 && this.slotFor(tier as Tier) >= 0;
  }
}
