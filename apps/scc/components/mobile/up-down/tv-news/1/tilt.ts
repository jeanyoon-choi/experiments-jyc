// Up–down tilt as a place between the two broadcasts. The mobile is held at
// whatever angle is comfortable, so the angle it has when the reading starts is
// level. Tipping the top edge away from the body (toward lying flat, as a map
// is read with north ahead) goes north; tipping it back toward the body goes
// south.

/** Degrees of pitch ignored around level, and the pitch that counts as all the way. */
export const DEAD_ZONE = 4;
export const FULL_TILT = 24;
/** Readings averaged into the level angle before the tilt starts to count. */
export const LEVEL_SAMPLES = 8;

type Reading = { beta: number | null; gamma: number | null };

/** Front–back pitch as the participant sees it, whatever way the screen is turned. */
export function pitchOf(reading: Reading, screenAngle: number) {
  const beta = reading.beta ?? 0;
  const gamma = reading.gamma ?? 0;
  if (screenAngle === 90) return -gamma;
  if (screenAngle === 270 || screenAngle === -90) return gamma;
  if (screenAngle === 180) return -beta;
  return beta;
}

/** −1 all the way south, 0 level, +1 all the way north. */
export function leanOf(pitch: number, level: number) {
  const away = level - pitch;
  const magnitude = Math.max(0, Math.abs(away) - DEAD_ZONE) / (FULL_TILT - DEAD_ZONE);
  return magnitude === 0 ? 0 : Math.sign(away) * Math.min(1, magnitude);
}

/** Share of the northern broadcast: 0 is the South alone, 1 the North alone. */
export function northShare(lean: number) {
  return Math.min(1, Math.max(0, 0.5 + 0.5 * lean));
}

/** Equal-power gains for the two voices at a given northern share. */
export function voiceGains(share: number): [south: number, north: number] {
  return [Math.cos((share * Math.PI) / 2), Math.sin((share * Math.PI) / 2)];
}
