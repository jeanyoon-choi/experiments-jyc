// One rubber-stamp impression: the cut face (an alpha mask) pressed once
// onto paper with a water-based pad ink. Everything is seeded, so a stamp
// keeps its impression until it is pressed again.

export type Rgb = readonly [number, number, number];

export const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Smooth value noise over an n×n field with lattice spacing `cell` px. */
function valueNoise(n: number, cell: number, random: () => number) {
  const g = Math.ceil(n / cell) + 2;
  const lattice = new Float32Array(g * g);
  for (let i = 0; i < lattice.length; i += 1) lattice[i] = random();
  const out = new Float32Array(n * n);
  const inv = 1 / cell;
  for (let y = 0; y < n; y += 1) {
    const fy = y * inv;
    const iy = Math.floor(fy);
    let ty = fy - iy;
    ty = ty * ty * (3 - 2 * ty);
    const row0 = iy * g;
    const row1 = row0 + g;
    for (let x = 0; x < n; x += 1) {
      const fx = x * inv;
      const ix = Math.floor(fx);
      let tx = fx - ix;
      tx = tx * tx * (3 - 2 * tx);
      const a = lattice[row0 + ix] + (lattice[row0 + ix + 1] - lattice[row0 + ix]) * tx;
      const b = lattice[row1 + ix] + (lattice[row1 + ix + 1] - lattice[row1 + ix]) * tx;
      out[y * n + x] = a + (b - a) * ty;
    }
  }
  return out;
}

/** Separable box blur, applied twice (close to a Gaussian). */
function blur(src: Float32Array, n: number, r: number) {
  if (r < 1) return src.slice();
  const tmp = new Float32Array(n * n);
  let a = src.slice();
  const norm = 1 / (2 * r + 1);
  for (let pass = 0; pass < 2; pass += 1) {
    for (let y = 0; y < n; y += 1) {
      const row = y * n;
      let acc = 0;
      for (let k = -r; k <= r; k += 1) acc += a[row + Math.min(n - 1, Math.max(0, k))];
      for (let x = 0; x < n; x += 1) {
        tmp[row + x] = acc * norm;
        acc += a[row + Math.min(n - 1, x + r + 1)] - a[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < n; x += 1) {
      let acc = 0;
      for (let k = -r; k <= r; k += 1) acc += tmp[Math.min(n - 1, Math.max(0, k)) * n + x];
      for (let y = 0; y < n; y += 1) {
        a[y * n + x] = acc * norm;
        acc += tmp[Math.min(n - 1, y + r + 1) * n + x] - tmp[Math.max(0, y - r) * n + x];
      }
    }
  }
  return a;
}

const smooth = (e0: number, e1: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * Turns a cut-face mask into an impression.
 * - Edges: the rubber's edge, slightly softened and broken by paper tooth.
 * - Pressure: uneven over the face (a tilt and slow blotches), so one side
 *   prints lighter and fine paper grain shows through there.
 * - Pooling: ink gathers along the edges of solid areas, a little darker.
 */
export function impress(mask: Uint8ClampedArray, n: number, ink: Rgb, seed: number, out: ImageData) {
  const random = mulberry32(seed);
  const unit = n / 360; // texture scale follows the device-pixel size of the stamp
  const m = new Float32Array(n * n);
  for (let i = 0; i < n * n; i += 1) m[i] = mask[i * 4 + 3] / 255;

  const edge = blur(m, n, Math.max(1, Math.round(unit * 0.9)));
  const pool = blur(m, n, Math.max(2, Math.round(unit * 6)));
  const tooth = valueNoise(n, Math.max(1.6, unit * 2.6), random);
  const grain = valueNoise(n, Math.max(1.1, unit * 1.2), random);
  const mottle = valueNoise(n, Math.max(4, unit * 22), random);
  const blotch = valueNoise(n, n / 2.2, random);

  // Tilt: the hand never presses flat.
  const tiltAngle = random() * Math.PI * 2;
  const tiltX = Math.cos(tiltAngle);
  const tiltY = Math.sin(tiltAngle);
  const tiltAmount = 0.12 + random() * 0.22;
  const inkLoad = 0.86 + random() * 0.14;

  const px = out.data;
  const [r0, g0, b0] = ink;
  for (let y = 0; y < n; y += 1) {
    const v = (y / n) * 2 - 1;
    for (let x = 0; x < n; x += 1) {
      const i = y * n + x;
      const u = (x / n) * 2 - 1;
      const e = edge[i];
      let alpha = 0;
      if (e > 0.02) {
        const pressure = inkLoad - tiltAmount * (0.5 + 0.5 * (u * tiltX + v * tiltY)) + (blotch[i] - 0.5) * 0.28 + (mottle[i] - 0.5) * 0.16;
        const t = e + (tooth[i] - 0.5) * 0.46 + (grain[i] - 0.5) * 0.12;
        const cover = smooth(0.4, 0.6, t);
        // Starved areas let paper grain through as pinholes and streaks.
        const starve = smooth(0.62, 0.86, grain[i] * 0.5 + tooth[i] * 0.25 + (1 - pressure) * 0.85);
        const rim = Math.max(0, m[i] - pool[i]) * 0.55;
        alpha = cover * Math.min(1, Math.max(0, pressure + rim)) * (1 - 0.9 * starve);
        alpha = Math.min(1, Math.max(0, alpha));
      }
      const o = i * 4;
      // Thin ink reads a touch lighter and cooler; heavy ink stays the pad colour.
      const lift = (1 - alpha) * 0.18;
      px[o] = r0 + (255 - r0) * lift;
      px[o + 1] = g0 + (255 - g0) * lift;
      px[o + 2] = b0 + (255 - b0) * lift;
      px[o + 3] = Math.round(Math.pow(alpha, 0.85) * 0.96 * 255);
    }
  }
  return out;
}
