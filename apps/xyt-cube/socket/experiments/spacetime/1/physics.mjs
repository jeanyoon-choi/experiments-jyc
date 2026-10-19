// Spacetime 1 physics, shared by the relay (validation, stepping) and the
// browsers (rendering). Pure: no DOM, no Socket.IO, no React.
// Contract: apps/xyt-cube/docs/spacetime/1.md
//
// Units. Scene space is measured in frame heights: x in [0, aspect] to the
// right, y in [0, 1] downward. Time is in seconds. The speed of light C is in
// frame heights per second, so a boost's "now" tilts by at most 1 / C seconds
// per frame height.

// ── Tunable constants ────────────────────────────────────────────────────────

/** Light speed, frame heights per second. Smaller = steeper "now" tilt. */
export const LIGHT_SPEED = 0.6;
/** Largest speed one observer may take, as a fraction of C. */
export const MAX_BETA = 0.85;

/** O1: smallest circumference of the compactified space, as a fraction of the frame. */
export const MIN_COMPACT_SCALE = 0.2;

/** O3: Plummer softening length, frame heights. Keeps the field global. */
export const MASS_SOFTENING = 0.22;
/** O3: growth of a held mass (gravitational radius, frame heights / s). */
export const MASS_GROWTH_PER_SECOND = 0.05;
/** O3: largest gravitational radius of one mass. */
export const MASS_MAX = 0.06;
/** O3: at most this many masses persist; the oldest released one leaves. */
export const MAX_MASSES = 16;
/** O3: proper-time rate floor (sqrt(1 - 2Φ) never falls below this). */
export const MIN_CLOCK_RATE = 0.05;
/** O3: lensing gain on the softened point-mass deflection. */
export const LENS_GAIN = 0.3;

// ── O2: Lorentz boosts in 2+1 dimensions ────────────────────────────────────
//
// Coordinates (w, x, y) with w = C·t. Matrices are row-major arrays of 9.

/** Clamp a velocity (fraction of C) into the open light cone. */
export function clampBeta(bx, by, max = MAX_BETA) {
  const x = Number.isFinite(bx) ? bx : 0;
  const y = Number.isFinite(by) ? by : 0;
  const speed = Math.hypot(x, y);
  if (speed <= max) return [x, y];
  return [(x / speed) * max, (y / speed) * max];
}

/**
 * Passive boost into a frame moving with velocity (bx, by)·C.
 * Maps rest-frame (w, x, y) to the moving frame's (w', x', y').
 */
export function boostMatrix(bx, by) {
  const b2 = bx * bx + by * by;
  if (b2 < 1e-12) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
  const g = 1 / Math.sqrt(1 - b2);
  const k = (g - 1) / b2;
  return [
    g, -g * bx, -g * by,
    -g * bx, 1 + k * bx * bx, k * bx * by,
    -g * by, k * bx * by, 1 + k * by * by,
  ];
}

export function multiply3(a, b) {
  const out = new Array(9);
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      out[r * 3 + c] =
        a[r * 3] * b[c] + a[r * 3 + 1] * b[3 + c] + a[r * 3 + 2] * b[6 + c];
    }
  }
  return out;
}

/**
 * Observer chain → the matrix that carries observer coordinates back to the
 * scene's rest frame. Observer k moves with beta_k relative to observer k-1,
 * so the observer frame is B_n ⋯ B_1 and its inverse is B(-β_1) ⋯ B(-β_n).
 * Two non-collinear boosts do not commute; their product also rotates
 * (Thomas–Wigner rotation). Nothing here imitates that: it is the algebra.
 */
export function observerToRestMatrix(betas) {
  let m = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  for (const [bx, by] of betas) {
    m = multiply3(m, boostMatrix(-bx, -by));
  }
  return m;
}

/**
 * The event seen at observer offset (dx, dy) from the screen centre, on the
 * observer's "now" through the present event (tNow, centre).
 * Returns the rest-frame offsets { dt, dx, dy }.
 */
export function observerOffsetToRest(matrix, dx, dy) {
  const w = matrix[1] * dx + matrix[2] * dy;
  return {
    dt: w / LIGHT_SPEED,
    dx: matrix[4] * dx + matrix[5] * dy,
    dy: matrix[7] * dx + matrix[8] * dy,
  };
}

// ── O1: compactified space ──────────────────────────────────────────────────
//
// Space is identified with itself every L = scale × frame in x and in y (a flat
// torus). The scene fits one fundamental domain; an observer at its centre
// sees every copy (i, j), and light from copy (i, j) has travelled |(i, j)·L|,
// so that copy is seen |(i, j)·L| / C seconds in the past (the "ghost images"
// of cosmic topology). Locally the geometry stays flat: only topology changes.

/** Circumference of the compact space as a fraction of the frame. 1 = not compact. */
export function compactScale(compactness) {
  const c = Math.min(Math.max(Number(compactness) || 0, 0), 1);
  return 1 - c * (1 - MIN_COMPACT_SCALE);
}

/** Which copy a rest-frame offset (from the centre) lands in, and how old it is. */
export function compactImage(dx, dy, aspect, scale) {
  const lx = aspect * scale;
  const ly = scale;
  const i = Math.floor(dx / lx + 0.5);
  const j = Math.floor(dy / ly + 0.5);
  return {
    i,
    j,
    localX: (dx - i * lx) / scale,
    localY: (dy - j * ly) / scale,
    delay: Math.hypot(i * lx, j * ly) / LIGHT_SPEED,
  };
}

/** t on the circle t ~ t + period, in [0, period). */
export function wrapTime(t, period) {
  return ((t % period) + period) % period;
}

// ── O3: weak-field masses ───────────────────────────────────────────────────
//
// Φ/C² = -Σ μ_i / sqrt(r_i² + s²). A clock at rest there runs at
// sqrt(1 + 2Φ/C²) of coordinate time; the lag it accumulates is
// ∫ (1 - rate) dt and it never decays.

/** -Φ/C² at (x, y) for masses [{ x, y, mu }] in scene units. */
export function potentialDepth(masses, x, y) {
  let depth = 0;
  for (const mass of masses) {
    const dx = x - mass.x;
    const dy = y - mass.y;
    depth += mass.mu / Math.sqrt(dx * dx + dy * dy + MASS_SOFTENING * MASS_SOFTENING);
  }
  return depth;
}

/** Proper-time rate of a static clock at potential depth d. */
export function clockRate(depth) {
  const r2 = 1 - 2 * depth;
  return Math.sqrt(Math.max(r2, MIN_CLOCK_RATE * MIN_CLOCK_RATE));
}

/**
 * Lens: the scene point whose light arrives at (x, y).
 * Softened point-mass deflection α = gain · Σ 4μ (θ - θ_i)/(|θ - θ_i|² + s²).
 */
export function lensSource(masses, x, y, gain = LENS_GAIN) {
  let ax = 0;
  let ay = 0;
  for (const mass of masses) {
    const dx = x - mass.x;
    const dy = y - mass.y;
    const q = 4 * mass.mu / (dx * dx + dy * dy + MASS_SOFTENING * MASS_SOFTENING);
    ax += q * dx;
    ay += q * dy;
  }
  return { x: x - gain * ax, y: y - gain * ay };
}

/**
 * Integrate the lag field one step: lag[i] += (1 - rate) · dt on a
 * width × height grid spanning [0, aspect] × [0, 1] (cell centres).
 */
export function integrateLag(lag, width, height, aspect, masses, dt) {
  if (masses.length === 0 || dt <= 0) return;
  for (let j = 0; j < height; j += 1) {
    const y = (j + 0.5) / height;
    for (let i = 0; i < width; i += 1) {
      const x = ((i + 0.5) / width) * aspect;
      lag[j * width + i] += (1 - clockRate(potentialDepth(masses, x, y))) * dt;
    }
  }
}
