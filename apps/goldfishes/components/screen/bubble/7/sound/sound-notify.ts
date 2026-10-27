// 소리 · 알림 (user, 2026-10-26): 군중's method on the feed's own sounds. Where 군중
// took a crowd's yell and stacked it on the chord (Yeezus, "Gosh"), 알림 takes the
// interface sounds of SNS and phones — the notification chime, the like's pop, the
// double tap, the sent swoosh — and does the same: pitched onto the chord, stacked
// into harmony, chopped and retriggered. Not recordings: each is synthesised after
// the archetype, so it reads as "a phone" without being any one company's sound.
//
//   - 띵 (chime): the soft-mallet marimba of a notification tone (bar modes
//     1 : 3.93 : 10 with an octave for sweetness). Leaders play it as a rising
//     three-note arpeggio, the tri-tone gesture, on chord tones; under it the same
//     chime pitched an octave below the chord's root and driven — the sample
//     "flipped" down into a dark stab;
//   - 뽁 (pop): the like / message bloop, a sine sliding up nine semitones into its
//     note in a few milliseconds; the middle pages pop in pairs a chord tone apart;
//   - 톡 (tap): a haptic tick or a key — a click and a very short ring; the small
//     pages double-tap, two chord tones high up;
//   - 쓩 (swoosh): the sent sound, noise rising through a band-pass sweep, combed so
//     it rings on the chord — a whoosh in tune.
// 부서짐: notifications piling up — a page's chime retriggered up the chord in
// sixteenths, or (small pages) its tap in thirty-seconds, like typing dots.

import { addClick, addMode, fadeIn, fadeOut, midiToHz, normalise, random, saturate, SYNTH_RATE } from "./synth.ts";

/** The notification chime on `note`; `drive` > 0 saturates it into the flipped, dark stab. */
export function chime(note: number, drive = 0) {
  const frequency = midiToHz(note);
  // Lower bars ring longer.
  const decay = Math.min(0.6, Math.max(0.12, 0.5 * (220 / frequency) ** 0.35)) * (drive > 0 ? 1.4 : 1);
  const out = new Float32Array(Math.floor(SYNTH_RATE * Math.min(2.4, decay * 7)));
  addMode(out, frequency, 1, decay);
  addMode(out, frequency * 2, 0.1, decay * 0.5);
  addMode(out, frequency * 3.93, 0.25, decay * 0.25);
  addMode(out, frequency * 10, 0.05, decay * 0.1);
  // A soft mallet: a dull thud under a rounded onset.
  addClick(out, note * 31 + 3, 1200, 0.7, 0.08, 0.002);
  fadeIn(out, 0.003);
  if (drive > 0) saturate(out, drive);
  fadeOut(out, 0.03);
  return normalise(out);
}

/** The like's pop: a sine sliding up into `note` within ~20 ms, a little second harmonic, a lip click. */
export function pop(note: number) {
  const frequency = midiToHz(note);
  const out = new Float32Array(Math.floor(SYNTH_RATE * 0.45));
  const decay = frequency < 600 ? 0.09 : 0.07;
  let phase = 0;
  for (let index = 0; index < out.length; index += 1) {
    const t = index / SYNTH_RATE;
    phase += (2 * Math.PI * frequency * 2 ** ((-9 * Math.exp(-t / 0.016)) / 12)) / SYNTH_RATE;
    const envelope = (1 - Math.exp(-t / 0.0012)) * Math.exp(-t / decay);
    out[index] = envelope * (Math.sin(phase) + 0.18 * Math.sin(2 * phase) * Math.exp(-t / (decay * 0.5)));
  }
  addClick(out, note * 17 + 5, 1800, 0.8, 0.12, 0.0015);
  fadeOut(out, 0.02);
  return normalise(out);
}

/** A tap: a key's click and a very short ring on `note`. */
export function tap(note: number) {
  const frequency = midiToHz(note);
  const out = new Float32Array(Math.floor(SYNTH_RATE * 0.18));
  addMode(out, frequency, 1, 0.022);
  addMode(out, frequency * 2.01, 0.2, 0.01);
  addClick(out, note * 13 + 7, 3200, 1, 0.5, 0.0012);
  fadeIn(out, 0.0008);
  fadeOut(out, 0.01);
  return normalise(out);
}

/** The sent swoosh on `note`: noise combed to the note, through a band-pass rising 500 → 3000 Hz, swelling then gone. */
export function swoosh(note: number) {
  const seconds = 0.46;
  const out = new Float32Array(Math.floor(SYNTH_RATE * seconds));
  const next = random(note * 7 + 11);
  // Comb: a delay one period of the note long, fed back through a gentle low-pass.
  const period = SYNTH_RATE / midiToHz(note);
  const line = new Float32Array(Math.ceil(period) + 2);
  let write = 0;
  let damped = 0;
  // Chamberlin state-variable band-pass for the sweep.
  let low = 0;
  let band = 0;
  for (let index = 0; index < out.length; index += 1) {
    const t = index / SYNTH_RATE;
    const read = (write - period + line.length * 2) % line.length;
    const base = Math.floor(read);
    const fraction = read - base;
    const delayed = line[base % line.length]! * (1 - fraction) + line[(base + 1) % line.length]! * fraction;
    damped += (delayed - damped) * 0.5;
    const combed = (next() * 2 - 1) * 0.15 + 0.94 * damped;
    line[write] = combed;
    write = (write + 1) % line.length;
    const cutoff = 500 * 6 ** Math.min(1, t / 0.32);
    const f = 2 * Math.sin((Math.PI * cutoff) / SYNTH_RATE);
    low += f * band;
    const high = combed - low - 0.9 * band;
    band += f * high;
    const swell = t < 0.22 ? Math.sin((Math.PI / 2) * (t / 0.22)) ** 2 : Math.cos((Math.PI / 2) * Math.min(1, (t - 0.22) / (seconds - 0.22))) ** 2;
    out[index] = band * swell;
  }
  fadeOut(out, 0.02);
  return normalise(out);
}

/** The vowel "ah" of an alto (Csound's formant table, as 군중's voices): [frequency, level, width]. */
const AH: readonly (readonly [number, number, number])[] = [
  [800, 1, 90],
  [1150, 0.63, 110],
  [2800, 0.1, 170],
];
const vowel = (frequency: number) => 0.08 + AH.reduce((sum, [at, level, width]) => sum + level * Math.exp(-(((frequency - at) / width) ** 2)), 0);

/**
 * 알림 2 (user, 2026-10-26: 알림 as it is, and another "군중과 같은 … 장엄함 … 거대함 … 숭고한";
 * heard, kept as 알림 2 while 알림 3 follows 군중 closer): the notification chime whose ring
 * turns into a choir. The strike is the chime; under it three voices a few cents apart swell
 * in over half a second on the note's harmonics, shaped by an "ah", and fade over four.
 */
export function hymn(note: number) {
  const seconds = 4;
  const out = new Float32Array(Math.floor(SYNTH_RATE * seconds));
  const frequency = midiToHz(note);
  const swell = new Float32Array(out.length);
  for (let index = 0; index < swell.length; index += 1) {
    const t = index / SYNTH_RATE;
    swell[index] = (t < 0.45 ? 0.5 - 0.5 * Math.cos((Math.PI * t) / 0.45) : 1) * Math.exp(-Math.max(0, t - 0.45) / 1.4);
  }
  for (const [cents, delay] of [[-11, 0.04], [0, 0], [9, 0.09]] as const) {
    const first = Math.floor(delay * SYNTH_RATE);
    for (let n = 1; n <= 10; n += 1) {
      const at = frequency * n * 2 ** (cents / 1200);
      if (at > SYNTH_RATE * 0.45) break;
      const level = n ** -0.9 * vowel(at);
      const w = (2 * Math.PI * at) / SYNTH_RATE;
      const c = 2 * Math.cos(w);
      let y1 = 0;
      let y2 = -Math.sin(w);
      for (let index = first; index < out.length; index += 1) {
        const y = c * y1 - y2;
        out[index]! += y * level * swell[index - first]!;
        y2 = y1;
        y1 = y;
      }
    }
  }
  normalise(out, 0.6);
  const strike = chime(note);
  for (let index = 0; index < strike.length; index += 1) out[index]! += strike[index]! * 0.7;
  fadeOut(out, 0.3);
  return normalise(out);
}

/** 군중's yell contour (sound-crowd.ts renderCry): a 4-semitone scoop up in 80 ms, a 9-semitone fall from 35% to the end. */
function yellContour(t: number, seconds: number) {
  const smooth = (edge0: number, edge1: number, x: number) => {
    const u = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
    return u * u * (3 - 2 * u);
  };
  return -4 * (1 - smooth(0, 0.08, t)) - 9 * smooth(seconds * 0.35, seconds, t) ** 1.6;
}

/** Each notification sound's partials: [ratio, level, decay (s) of its strike]. */
const NOTICE_PARTIALS: Record<"chime" | "pop" | "tap", readonly (readonly [number, number, number])[]> = {
  chime: [[1, 1, 0.5], [2, 0.12, 0.25], [3.93, 0.3, 0.12], [10, 0.06, 0.04]],
  pop: [[1, 1, 0.08], [2, 0.2, 0.04]],
  tap: [[1, 1, 0.025], [2.01, 0.25, 0.012]],
};

/**
 * 알림 3 (user, 2026-10-26: "군중과 같은 소리가 아니라 알림 소리에서 시작해야"; "묵직하고 낮게
 * 깔리는"): a notification sound — the chime, the like's pop, the tap — yelled as 군중 yells.
 * Its strike stays as it is (the "ding", the "pop", the "tick"); under it the sound is held
 * and bent with 군중's contour: three voices 0, +14 and −17 cents and 0, 12 and 26 ms apart,
 * scooping up four semitones and falling nine, held to 45% of its length. The held body is
 * not the strike's sine but a full stack of the note's harmonics up to 3 kHz (the chime's
 * bar 4th and 10th lifted), driven hard (tanh 3.5): measured live, 군중's weight is a dense,
 * saturated roar at 600–1200 Hz, not a low fundamental a laptop cannot play.
 */
export function droop(kind: "chime" | "pop" | "tap", note: number, seconds: number) {
  const out = new Float32Array(Math.floor(SYNTH_RATE * seconds));
  const frequency = midiToHz(note);
  const partials = NOTICE_PARTIALS[kind];
  // The held body: one period of the note's harmonics up to 3 kHz, n^−0.75, the fundamental and octave
  // thinned as a mouth thins them, the bar's 4th and 10th lifted.
  const size = 2048;
  const table = new Float32Array(size + 1);
  for (let n = 1; frequency * n < 3000; n += 1) {
    const level = n ** -0.75 * (n === 1 ? 0.35 : n === 2 ? 0.7 : n === 4 ? 1.8 : n === 10 ? 1.5 : 1);
    for (let index = 0; index <= size; index += 1) table[index]! += level * Math.sin((2 * Math.PI * n * index) / size);
  }
  let largest = 0;
  for (const value of table) largest = Math.max(largest, Math.abs(value));
  for (const [cents, delay] of [[0, 0], [14, 0.012], [-17, 0.026]] as const) {
    const phases = partials.map(() => 0);
    let phase = 0;
    for (let index = Math.floor(delay * SYNTH_RATE); index < out.length; index += 1) {
      const t = index / SYNTH_RATE - delay;
      const bend = 2 ** ((yellContour(t, seconds) + cents / 100) / 12);
      // Up within 30 ms, flat to 45%, then down to nothing.
      const body = Math.min(1, t / 0.03) * (t < seconds * 0.45 ? 1 : Math.max(0, 1 - (t - seconds * 0.45) / (seconds * 0.55)));
      phase = (phase + (frequency * bend * size) / SYNTH_RATE) % size;
      const at = Math.floor(phase);
      let sample = (body * (table[at]! + (table[at + 1]! - table[at]!) * (phase - at))) / largest;
      partials.forEach(([ratio, level, decay], partial) => {
        const hz = frequency * ratio * bend;
        if (hz > SYNTH_RATE * 0.45) return;
        phases[partial] = phases[partial]! + (2 * Math.PI * hz) / SYNTH_RATE;
        sample += 0.6 * level * Math.sin(phases[partial]!) * Math.exp(-t / decay) * Math.min(1, t / 0.002);
      });
      out[index]! += sample;
    }
  }
  const click = kind === "tap" ? [3200, 1, 0.5] : kind === "pop" ? [1800, 0.8, 0.2] : [1200, 0.7, 0.1];
  addClick(out, note * 41 + 5, click[0]!, click[1]!, click[2]! * 3, 0.0015);
  saturate(out, 3.5);
  fadeOut(out, 0.02);
  return normalise(out);
}
