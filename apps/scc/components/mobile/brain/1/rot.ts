// Brain rot as a function of the reel level f (0 = untouched, 1 = one reel down, ...).
// Rot starts at seeds scattered over the gyral crowns; each reel wakes a few more and every
// patch keeps spreading. Pure: the same level always gives the same brain.

export const MAX_SEEDS = 40;

export type Seed = { x: number; y: number; z: number; born: number };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The reel at which seed i appears: three on the first reel, then two per reel.
export function seedBirth(i: number) {
  if (i < 3) return 0.12 + i * 0.06;
  const k = Math.floor((i - 3) / 2) + 1;
  return k + 0.12 + ((i - 3) % 2) * 0.1;
}

// Patch radius in metres, t reels after its birth.
export function rotRadius(t: number) {
  if (t <= 0) return 0;
  return Math.min(0.05, 0.005 + 0.011 * Math.pow(t, 0.75));
}

/** Pick seeds on exposed cortex (low fine cavity), kept apart from each other. */
export function pickSeeds(positions: ArrayLike<number>, cavity: ArrayLike<number>, cavityStride: number): Seed[] {
  const rand = mulberry32(0x0b7a1d);
  const n = positions.length / 3;
  const seeds: Seed[] = [];
  let minGap = 0.03;
  for (let tries = 0; seeds.length < MAX_SEEDS && tries < 40000; tries++) {
    if (tries % 4000 === 3999) minGap *= 0.8;
    const v = Math.floor(rand() * n);
    if (cavity[v * cavityStride] > 0.45) continue;
    const x = positions[v * 3], y = positions[v * 3 + 1], z = positions[v * 3 + 2];
    // keep off the cut brainstem face and the cerebellum's underside
    if (z < -0.05) continue;
    if (seeds.some((s) => Math.hypot(s.x - x, s.y - y, s.z - z) < minGap)) continue;
    seeds.push({ x, y, z, born: seedBirth(seeds.length) });
  }
  return seeds;
}

/** Write xyz + radius (0 when unborn) for level f into out (vec4 per seed). */
export function rotUniforms(seeds: Seed[], f: number, out: Float32Array) {
  out.fill(0);
  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i];
    out[i * 4] = s.x;
    out[i * 4 + 1] = s.y;
    out[i * 4 + 2] = s.z;
    out[i * 4 + 3] = rotRadius(f - s.born);
  }
  return out;
}

/** Whole-brain dulling with level: 0 at the first reel, 1 by about the twentieth. */
export function decayOf(f: number) {
  const t = Math.min(1, Math.max(0, f / 20));
  return t * t * (3 - 2 * t);
}
