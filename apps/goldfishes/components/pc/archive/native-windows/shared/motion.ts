// Continuous window choreography shared by versions 2 and 3.
type MotionSettings = { seed: number; period: number; spread: number; breath: number; size: number; movement: number; displayWidth: number; displayHeight: number };
const TAU = Math.PI * 2;
export function frameFor(slot: number, time: number, settings: MotionSettings) {
  const phase = slot * 2.39996 + settings.seed * .731;
  const t = time * TAU / settings.period;
  const diversity = settings.spread / 100;
  const formats = [[.30, .78], [.78, .31], [.60, .64], [.38, .46], [.86, .82], [.46, .88], [.70, .43], [.42, .72]];
  const format = formats[slot % formats.length];
  const pulse = 1 + settings.breath / 100 * .22 * Math.sin(t * .71 + phase);
  const width = Math.round(Math.min(settings.displayWidth - 24, Math.max(360, settings.displayWidth * (.64 + (format[0] - .64) * diversity) * settings.size / 75 * pulse)));
  const height = Math.round(Math.min(settings.displayHeight - 80, Math.max(260, settings.displayHeight * (.65 + (format[1] - .65) * diversity) * settings.size / 75 * pulse)));
  const waveX = .64 * Math.sin(t * (1 + slot * .037) + phase) + .36 * Math.sin(t * .37 + phase * 1.7);
  const waveY = .67 * Math.cos(t * .79 + phase) + .33 * Math.sin(t * 1.13 + phase * .6);
  const x = Math.round(12 + Math.max(0, settings.displayWidth - width - 24) * (.5 + .49 * settings.movement / 100 * waveX));
  const y = Math.round(35 + Math.max(0, settings.displayHeight - height - 80) * (.5 + .49 * settings.movement / 100 * waveY));
  return [x, y, x + width, y + height];
}
export function eventSpacing(baseMs: number, time: number, irregularity: number) {
  const pressure = Math.pow(.5 + .5 * Math.sin(time * .43 + Math.sin(time * .17)), 3);
  return Math.max(125, Math.round(baseMs * (1 + (1 - pressure * 1.6) * irregularity / 100)));
}
