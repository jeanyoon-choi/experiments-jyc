// Spacetime 1 phone-tilt mapping for O2, shared by the boost mobile and tests.
//
// The phone's tilt away from the pose it held when motion was enabled is the
// observer's velocity: tilt right moves the frame right, tilting the top away
// moves it up. Speed saturates smoothly toward MAX_BETA, so no tilt reaches
// light speed. A held tilt keeps its velocity (pose, not rotation rate: a
// frame of reference is a state, not an impulse).

import { MAX_BETA } from "./physics.mjs";

/** Degrees of tilt that give tanh(1) ≈ 76 % of MAX_BETA. */
export const TILT_SCALE_DEGREES = 28;
/** Tilts smaller than this read as rest (hand tremor). */
export const TILT_DEAD_ZONE_DEGREES = 1.5;

function finite(value) {
  return Number.isFinite(value) ? Number(value) : 0;
}

/** Signed difference in [-180, 180). */
export function signedAngleDelta(value, baseline) {
  return ((finite(value) - finite(baseline) + 540) % 360) - 180;
}

/**
 * @param {{ beta: number | null, gamma: number | null }} orientation
 * @param {{ beta: number, gamma: number }} baseline
 * @returns {{ bx: number, by: number }} velocity as a fraction of C
 */
export function tiltToBeta(orientation, baseline) {
  const gx = signedAngleDelta(orientation.gamma, baseline.gamma);
  // beta is clamped to [-180, 180) by browsers; a flat-held phone sits near 0.
  const gy = signedAngleDelta(orientation.beta, baseline.beta);
  const magnitude = Math.hypot(gx, gy);
  if (magnitude < TILT_DEAD_ZONE_DEGREES) return { bx: 0, by: 0 };
  const speed = MAX_BETA * Math.tanh((magnitude - TILT_DEAD_ZONE_DEGREES) / TILT_SCALE_DEGREES);
  return { bx: (gx / magnitude) * speed, by: (gy / magnitude) * speed };
}
