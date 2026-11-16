// Eye rot as a function of the reel level f (0 = untouched, 1 = one reel down, ...).
// Rot starts at seeds scattered over the globe; each reel wakes a few more and every patch keeps
// spreading. Pure: the same level always gives the same eye.

export const MAX_SEEDS = 40;
export const RADIUS = 0.1; // the globe, in scene units (a 24 mm eye at about 8.3x)

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

// The reel at which seed i appears: two on the first reel, then about five every three reels.
// Slower than the brain's: an eye first reddens, yellows and clouds, and the patches follow.
export function seedBirth(i: number) {
  if (i < 2) return 0.1 + i * 0.25;
  return 1 + (i - 2) * 0.6;
}

// Patch radius in scene units, t reels after its birth.
export function rotRadius(t: number) {
  if (t <= 0) return 0;
  return Math.min(0.045, 0.006 + 0.009 * Math.pow(t, 0.7));
}

/** Seeds on the globe, kept apart. The first reels' seeds sit on the white beside the iris, in view. */
export function pickSeeds(): Seed[] {
  const rand = mulberry32(0x0e7e1d);
  const seeds: Seed[] = [];
  let minGap = 0.045;
  for (let tries = 0; seeds.length < MAX_SEEDS && tries < 40000; tries++) {
    if (tries % 4000 === 3999) minGap *= 0.8;
    const z = rand() * 2 - 1;
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(1 - z * z);
    const early = seeds.length < 6;
    // early seeds: the front half, but off the cornea, so the gaze is the last thing to go
    if (early && (z < 0.2 || z > 0.8)) continue;
    const x = r * Math.cos(a) * RADIUS;
    const y = r * Math.sin(a) * RADIUS;
    if (seeds.some((s) => Math.hypot(s.x - x, s.y - y, s.z - z * RADIUS) < minGap)) continue;
    seeds.push({ x, y, z: z * RADIUS, born: seedBirth(seeds.length) });
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

/** Whole-eye decline with level: quick at first (half by the fourth reel), near 1 by the twentieth. */
export function decayOf(f: number) {
  return 1 - Math.exp(-Math.max(0, f) / 6);
}
