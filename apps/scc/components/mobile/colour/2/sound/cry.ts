// The yell of Goldfishes bubble/9's 소리 v1 · 군중 (apps/goldfishes/components/bubble/9/sound/
// sound-crowd.ts, 2026-10-12), ported on 2026-11-16 so this experiment stands alone.
// One shouted "ah": a glottal pulse with a flat tilt (pressed, high-effort phonation)
// through Csound's formant tables, three voices a few cents and milliseconds apart, a
// sharp rise into the pitch and a long fall away from it, no vibrato, rasp from a fast
// irregular amplitude flutter, loud breath, saturation.
//
// The original renders through an OfflineAudioContext. This is the same signal chain
// computed sample by sample, as bubble/9's synth.ts does for its other voices: iPhone
// Safari stayed silent with the offline render, and a plain Float32Array has nothing
// device-dependent in it and can be checked in Node.

export const CRY_RATE = 32_000;

type Formant = readonly [frequency: number, decibels: number, bandwidth: number];
type VoiceType = "bass" | "tenor" | "alto" | "soprano";

/** Csound manual, Appendix "Formant values" (Table III), vowel "a". */
const FORMANTS: Record<VoiceType, readonly Formant[]> = {
  soprano: [[800, 0, 80], [1150, -6, 90], [2900, -32, 120], [3900, -20, 130], [4950, -50, 140]],
  alto: [[800, 0, 80], [1150, -4, 90], [2800, -20, 120], [3500, -36, 130], [4950, -60, 140]],
  tenor: [[650, 0, 80], [1080, -6, 90], [2650, -7, 120], [2900, -8, 130], [3250, -22, 140]],
  bass: [[600, 0, 60], [1040, -7, 70], [2250, -9, 110], [2450, -9, 120], [2750, -20, 130]],
};

const voiceTypeFor = (note: number): VoiceType => (note < 52 ? "bass" : note < 60 ? "tenor" : note < 69 ? "alto" : "soprano");
const midiToHz = (note: number) => 440 * 2 ** ((note - 69) / 12);
const smoothstep = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

// The phrase: a yell, not a song.
const SCOOP = 4;
const SCOOP_SECONDS = 0.08;
const FALL = 9;
const FALL_FROM = 0.35;
const ATTACK = 0.02;
const HOLD = 0.45;
const TILT = 0.72;
const BREATH = 0.32;
const DRIVE = 2.4;
const RASP = 0.45;
/** Cents off the note and seconds late, per voice. */
const SINGERS: readonly (readonly [detune: number, delay: number])[] = [[0, 0], [14, 0.012], [-17, 0.026]];

const TABLE = 2048;

/** One cycle of the glottal pulse: harmonics falling by n^−tilt, odd ones a little stronger, peak 1. */
function glottis(partials: number) {
  const table = new Float32Array(TABLE + 1);
  for (let n = 1; n <= partials; n += 1) {
    const level = n ** -TILT * (n % 2 === 1 ? 1.12 : 1);
    for (let index = 0; index < TABLE; index += 1) table[index]! += level * Math.sin((2 * Math.PI * n * index) / TABLE);
  }
  let peak = 0;
  for (let index = 0; index < TABLE; index += 1) peak = Math.max(peak, Math.abs(table[index]!));
  for (let index = 0; index < TABLE; index += 1) table[index]! /= peak;
  table[TABLE] = table[0]!;
  return table;
}

/** A value read from evenly spaced points across the whole sound, linearly between them. */
function curve(points: Float32Array, share: number) {
  const position = Math.min(1, Math.max(0, share)) * (points.length - 1);
  const index = Math.min(points.length - 2, Math.floor(position));
  return points[index]! + (points[index + 1]! - points[index]!) * (position - index);
}

/** RBJ biquad over `data`, into a new array. */
function biquad(data: Float32Array, b0: number, b1: number, b2: number, a1: number, a2: number) {
  const out = new Float32Array(data.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let index = 0; index < data.length; index += 1) {
    const x = data[index]!;
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    out[index] = y;
  }
  return out;
}

function bandpass(data: Float32Array, frequency: number, q: number) {
  const w = (2 * Math.PI * frequency) / CRY_RATE;
  const alpha = Math.sin(w) / (2 * q);
  const a0 = 1 + alpha;
  return biquad(data, alpha / a0, 0, -alpha / a0, (-2 * Math.cos(w)) / a0, (1 - alpha) / a0);
}

function highpass(data: Float32Array, frequency: number, q: number) {
  const w = (2 * Math.PI * frequency) / CRY_RATE;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  const a0 = 1 + alpha;
  return biquad(data, (1 + cos) / 2 / a0, -(1 + cos) / a0, (1 + cos) / 2 / a0, (-2 * cos) / a0, (1 - alpha) / a0);
}

/** A yell on one note, `seconds` long, peaking at 0.9. */
export function renderCry(note: number, seconds: number) {
  const length = Math.floor(CRY_RATE * seconds);
  const base = midiToHz(note);
  // Harmonics stop short of the rate's ceiling, so a high note does not alias.
  const table = glottis(Math.max(1, Math.min(80, Math.floor((CRY_RATE * 0.45) / (base * 1.1)))));
  const dry = new Float32Array(length);

  for (const [detune, delay] of SINGERS) {
    // The pitch: a scoop up into the note, a long fall off it, and a slow random wander.
    const pitch = new Float32Array(240);
    let wander = 0;
    for (let index = 0; index < pitch.length; index += 1) {
      const t = (index / (pitch.length - 1)) * seconds - delay;
      wander += (Math.random() - 0.5) * 0.8 - wander * 0.08;
      const semitones = -SCOOP * (1 - smoothstep(0, SCOOP_SECONDS, t)) - FALL * smoothstep(seconds * FALL_FROM, seconds, t) ** 1.6;
      pitch[index] = base * 2 ** ((semitones + (detune + wander) / 100) / 12);
    }
    // Roughness: a fast, uneven flutter of the amplitude, as a strained voice rasps.
    const flutter = Float32Array.from({ length: 32 }, () => 32 + Math.random() * 30);
    let phase = 0;
    let flutterPhase = 0;
    for (let index = 0; index < length; index += 1) {
      const t = index / CRY_RATE;
      const share = index / length;
      const position = phase * TABLE;
      const cell = Math.floor(position);
      const wave = table[cell]! + (table[cell + 1]! - table[cell]!) * (position - cell);
      phase += curve(pitch, share) / CRY_RATE;
      phase -= Math.floor(phase);
      flutterPhase += (2 * Math.PI * curve(flutter, share)) / CRY_RATE;
      const rise = Math.min(1, Math.max(0, (t - delay) / ATTACK));
      const release = t < seconds * HOLD ? 1 : Math.max(0, (seconds - t) / (seconds * (1 - HOLD)));
      dry[index]! += wave * (1 + RASP * Math.sin(flutterPhase)) * Math.min(rise, release);
    }
  }

  // Breath: high, quiet, through the same mouth.
  const air = new Float32Array(length);
  for (let index = 0; index < length; index += 1) air[index] = Math.random() * 2 - 1;
  const breath = highpass(air, 1400, 1.12);
  const staging = 0.35 / SINGERS.length;
  for (let index = 0; index < length; index += 1) {
    const t = index / CRY_RATE;
    const level = t < ATTACK ? t / ATTACK : t < seconds * HOLD ? 1 : Math.max(0, (seconds - t) / (seconds * (1 - HOLD)));
    dry[index] = (dry[index]! + breath[index]! * BREATH * level) * staging;
  }

  const out = new Float32Array(length);
  for (const [frequency, decibels, bandwidth] of FORMANTS[voiceTypeFor(note)]) {
    const band = bandpass(dry, frequency, frequency / bandwidth);
    const level = 10 ** (decibels / 20);
    for (let index = 0; index < length; index += 1) out[index]! += band[index]! * level;
  }

  let peak = 0;
  for (let index = 0; index < length; index += 1) {
    out[index] = Math.tanh(DRIVE * out[index]!) / Math.tanh(DRIVE);
    peak = Math.max(peak, Math.abs(out[index]!));
  }
  if (peak > 0) for (let index = 0; index < length; index += 1) out[index]! *= 0.9 / peak;
  return out;
}
