// Pure helpers of the school: its hash, its random stream, angles, and the
// closest points of two body segments. No state but the stream's own.

/** A fixed value in [0, 1) for an id and a salt (the school's per-fish differences). */
export function unit(id: number, salt: number) {
  const value = Math.sin(id * 12.9898 + salt * 78.233) * 43_758.5453;
  return value - Math.floor(value);
}

/** The school's one random stream (xorshift32). Every draw is in a pinned order (school-hash.test.ts). */
export class RandomStream {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /** The next value, in [0, 1). */
  next() {
    let state = this.state;
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    this.state = state >>> 0 || 1;
    return this.state / 4_294_967_296;
  }
}

export function angleDifference(target: number, current: number) {
  return Math.atan2(Math.sin(target - current), Math.cos(target - current));
}

/**
 * Closest points between segments a (at `a`) and b (at `b`) in `segments`
 * (x1 y1 x2 y2 each), written to `out` (ax ay bx by). After Ericson,
 * Real-Time Collision Detection, 5.1.9. False only for degenerate input.
 */
export function closestBetween(segments: Float64Array, a: number, b: number, out: Float64Array) {
  const px = segments[a]!;
  const py = segments[a + 1]!;
  const qx = segments[b]!;
  const qy = segments[b + 1]!;
  const d1x = segments[a + 2]! - px;
  const d1y = segments[a + 3]! - py;
  const d2x = segments[b + 2]! - qx;
  const d2y = segments[b + 3]! - qy;
  const rx = px - qx;
  const ry = py - qy;
  const l1 = d1x * d1x + d1y * d1y;
  const l2 = d2x * d2x + d2y * d2y;
  if (l1 < 1e-9 || l2 < 1e-9) return false;
  const f = d2x * rx + d2y * ry;
  const c = d1x * rx + d1y * ry;
  const k = d1x * d2x + d1y * d2y;
  const denominator = l1 * l2 - k * k;
  let s = denominator > 1e-9 ? Math.min(1, Math.max(0, (k * f - c * l2) / denominator)) : 0;
  let t = (k * s + f) / l2;
  if (t < 0) {
    t = 0;
    s = Math.min(1, Math.max(0, -c / l1));
  } else if (t > 1) {
    t = 1;
    s = Math.min(1, Math.max(0, (k - c) / l1));
  }
  out[0] = px + d1x * s;
  out[1] = py + d1y * s;
  out[2] = qx + d2x * t;
  out[3] = qy + d2y * t;
  return true;
}

/** Moves `count` values of `from` into `out`, leaving `from` zero there (contact time, drained by whoever reads it). */
export function drain(from: Float64Array, count: number, out: Float64Array) {
  for (let index = 0; index < count; index += 1) {
    out[index] = from[index]!;
    from[index] = 0;
  }
}
