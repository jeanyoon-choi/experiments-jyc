// 소리 · 군중 (user, 2026-10-12): the work's FOMO and desire as a crowd yelling. One
// voice, as 유리 is one tone: a shouted "ah", rendered at each note it is asked for and
// pitched on the chord's root and fifth, so the yells agree like a chant rather than
// clash. Withdrawn on the way: driven screams, grunts, stomps and a formant murmur
// (mechanical — "되지도 않은 기계음"); then a sung wail with vibrato over a choir (too
// melodic — "덜 멜로딕 하고 더 고함 같아야함" — and nothing should sound but the touches).
//
// Borrowed strategies:
//   - formant synthesis from Csound's formant tables (soprano/alto/tenor/bass, vowels
//     "a" and "o": five formants each, frequency, level, bandwidth), the register
//     choosing the voice type, as a choir is voiced;
//   - Prismizer-style stacking (Antares Harmony Engine played from MIDI, Francis and the
//     Lights / Bon Iver): one voice, several pitches at once — here a power chord;
//   - the retriggered vocal stab of house and hip-hop: one yell's onset fired again in
//     sixteenths (rhythm, not melody).
// A yell, not a song: a glottal pulse as a band-limited PeriodicWave with a flat tilt
// (pressed, high-effort phonation), three voices a few cents and milliseconds apart, a
// sharp rise into the pitch and a long fall away from it, no vibrato, roughness from a
// fast irregular amplitude flutter (the rasp of a strained voice), loud breath, and
// saturation. Rendered offline, once per note.

export const CROWD_RATE = 32_000;

type Formant = readonly [frequency: number, decibels: number, bandwidth: number];
type VoiceType = "bass" | "tenor" | "alto" | "soprano";
type Vowel = "a" | "o";

/** Csound manual, Appendix "Formant values" (Table III). */
const FORMANTS: Record<VoiceType, Record<Vowel, readonly Formant[]>> = {
  soprano: {
    a: [[800, 0, 80], [1150, -6, 90], [2900, -32, 120], [3900, -20, 130], [4950, -50, 140]],
    o: [[450, 0, 70], [800, -11, 80], [2830, -22, 100], [3800, -22, 130], [4950, -50, 135]],
  },
  alto: {
    a: [[800, 0, 80], [1150, -4, 90], [2800, -20, 120], [3500, -36, 130], [4950, -60, 140]],
    o: [[450, 0, 70], [800, -9, 80], [2830, -16, 100], [3500, -28, 130], [4950, -55, 135]],
  },
  tenor: {
    a: [[650, 0, 80], [1080, -6, 90], [2650, -7, 120], [2900, -8, 130], [3250, -22, 140]],
    o: [[400, 0, 40], [800, -10, 80], [2600, -12, 100], [2800, -12, 120], [3000, -26, 120]],
  },
  bass: {
    a: [[600, 0, 60], [1040, -7, 70], [2250, -9, 110], [2450, -9, 120], [2750, -20, 130]],
    o: [[400, 0, 40], [750, -11, 80], [2400, -21, 100], [2600, -20, 120], [2900, -40, 120]],
  },
};

export function voiceTypeFor(note: number): VoiceType {
  return note < 52 ? "bass" : note < 60 ? "tenor" : note < 69 ? "alto" : "soprano";
}

const midiToHz = (note: number) => 440 * 2 ** ((note - 69) / 12);
const smooth = (edge0: number, edge1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
};

/** One second of white noise, shared by every render (looped from different offsets). */
let whiteNoise: AudioBuffer | null = null;
function noise(context: BaseAudioContext) {
  if (!whiteNoise) {
    whiteNoise = context.createBuffer(1, CROWD_RATE, CROWD_RATE);
    const data = whiteNoise.getChannelData(0);
    for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  }
  const source = context.createBufferSource();
  source.buffer = whiteNoise;
  source.loop = true;
  return source;
}

/** A glottal pulse's spectrum: harmonics falling by n^−tilt, odd ones a little stronger. */
function glottis(context: BaseAudioContext, tilt: number) {
  const count = 80;
  const real = new Float32Array(count);
  const imag = new Float32Array(count);
  for (let n = 1; n < count; n += 1) imag[n] = n ** -tilt * (n % 2 === 1 ? 1.12 : 1);
  return context.createPeriodicWave(real, imag);
}

/** The five formants of a voice type, moving from one vowel to another between two times. */
function formantBank(context: BaseAudioContext, input: AudioNode, type: VoiceType, from: Vowel, to: Vowel, turn: readonly [number, number], out: AudioNode) {
  FORMANTS[type][from].forEach(([frequency, decibels, bandwidth], index) => {
    const [toFrequency, toDecibels, toBandwidth] = FORMANTS[type][to][index]!;
    const band = context.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.setValueAtTime(frequency, 0);
    band.frequency.setValueAtTime(frequency, turn[0]);
    band.frequency.linearRampToValueAtTime(toFrequency, turn[1]);
    band.Q.setValueAtTime(frequency / bandwidth, 0);
    band.Q.setValueAtTime(frequency / bandwidth, turn[0]);
    band.Q.linearRampToValueAtTime(toFrequency / toBandwidth, turn[1]);
    const level = context.createGain();
    level.gain.setValueAtTime(10 ** (decibels / 20), 0);
    level.gain.setValueAtTime(10 ** (decibels / 20), turn[0]);
    level.gain.linearRampToValueAtTime(10 ** (toDecibels / 20), turn[1]);
    input.connect(band).connect(level).connect(out);
  });
}

function saturate(context: BaseAudioContext, drive: number) {
  const node = context.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let index = 0; index < curve.length; index += 1) {
    const x = (index / (curve.length - 1)) * 2 - 1;
    curve[index] = Math.tanh(drive * x) / Math.tanh(drive);
  }
  node.curve = curve;
  return node;
}

/** Scales a rendered buffer so its peak sits at `peak`, so every note arrives at one level. */
function normalise(buffer: AudioBuffer, peak = 0.9) {
  let largest = 0;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    for (const value of buffer.getChannelData(channel)) largest = Math.max(largest, Math.abs(value));
  }
  if (largest <= 0) return buffer;
  const gain = peak / largest;
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < data.length; index += 1) data[index] = data[index]! * gain;
  }
  return buffer;
}

type Singer = {
  note: number;
  /** Cents off the note. */
  detune: number;
  /** Seconds late. */
  delay: number;
  vibratoRate: number;
};

type Phrase = {
  seconds: number;
  /** Semitones below the note the voice starts, sliding up over `scoopSeconds`. */
  scoop: number;
  scoopSeconds: number;
  /** Semitones the voice falls, from `fallFrom` (share of the sound) to the end. */
  fall: number;
  fallFrom: number;
  vibrato: number;
  attack: number;
  tilt: number;
  breath: number;
  drive: number;
  from: Vowel;
  to: Vowel;
  /** Share of the sound before the release begins. */
  hold: number;
  /** Depth of the amplitude flutter, 0–1. */
  rasp: number;
};

/** Several singers on one formant bank. */
async function renderSingers(singers: readonly Singer[], phrase: Phrase, channels = 1) {
  const { seconds } = phrase;
  const context = new OfflineAudioContext(channels, Math.floor(CROWD_RATE * seconds), CROWD_RATE);
  const wave = glottis(context, phrase.tilt);
  const lowest = Math.min(...singers.map((singer) => singer.note));
  const type = voiceTypeFor(lowest);
  // Gain staging: the singers' sum kept well under the saturator's knee, so the drive warms
  // rather than squashes (a choir of eight once peaked flat at 1.0, buzzing).
  const voices = context.createGain();
  voices.gain.value = 0.35 / singers.length;
  const sum = context.createGain();
  const points = 240;

  for (const singer of singers) {
    const base = midiToHz(singer.note);
    const oscillator = context.createOscillator();
    oscillator.setPeriodicWave(wave);
    let wander = 0;
    oscillator.frequency.setValueCurveAtTime(
      Float32Array.from({ length: points }, (_, index) => {
        const t = (index / (points - 1)) * seconds - singer.delay;
        wander += (Math.random() - 0.5) * 0.8 - wander * 0.08;
        const semitones = -phrase.scoop * (1 - smooth(0, phrase.scoopSeconds, t)) - phrase.fall * smooth(seconds * phrase.fallFrom, seconds, t) ** 1.6;
        return base * 2 ** ((semitones + (singer.detune + wander) / 100) / 12);
      }),
      0,
      seconds,
    );
    // Vibrato arrives after the note settles.
    const lfo = context.createOscillator();
    lfo.frequency.value = singer.vibratoRate;
    const depth = context.createGain();
    depth.gain.setValueAtTime(0, 0);
    depth.gain.setValueAtTime(0, singer.delay + phrase.scoopSeconds + 0.12);
    depth.gain.linearRampToValueAtTime(phrase.vibrato, singer.delay + phrase.scoopSeconds + 0.6);
    lfo.connect(depth).connect(oscillator.detune);
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, 0);
    envelope.gain.setValueAtTime(0, singer.delay);
    envelope.gain.linearRampToValueAtTime(1, singer.delay + phrase.attack);
    envelope.gain.setValueAtTime(1, seconds * phrase.hold);
    envelope.gain.linearRampToValueAtTime(0, seconds);
    // Roughness: a fast, uneven flutter of the amplitude, as a strained voice rasps.
    const rasp = context.createGain();
    if (phrase.rasp > 0) {
      const flutter = context.createOscillator();
      flutter.frequency.setValueCurveAtTime(Float32Array.from({ length: 32 }, () => 32 + Math.random() * 30), 0, seconds);
      const flutterDepth = context.createGain();
      flutterDepth.gain.value = phrase.rasp;
      flutter.connect(flutterDepth).connect(rasp.gain);
      flutter.start();
    }
    oscillator.connect(rasp).connect(envelope).connect(voices);
    oscillator.start();
    lfo.start();
  }

  // Breath: high, quiet, through the same mouth.
  const breath = noise(context);
  const airy = context.createBiquadFilter();
  airy.type = "highpass";
  airy.frequency.value = 1400;
  const breathLevel = context.createGain();
  breathLevel.gain.setValueAtTime(0, 0);
  breathLevel.gain.linearRampToValueAtTime(phrase.breath, phrase.attack);
  breathLevel.gain.setValueAtTime(phrase.breath, seconds * phrase.hold);
  breathLevel.gain.linearRampToValueAtTime(0, seconds);
  breath.connect(airy).connect(breathLevel).connect(voices);
  breath.start(0, Math.random());

  formantBank(context, voices, type, phrase.from, phrase.to, [seconds * 0.5, seconds * 0.9], sum);
  sum.connect(saturate(context, phrase.drive)).connect(context.destination);
  return normalise(await context.startRendering());
}

/** A yell on one note: three voices a few cents apart, a sharp rise, a long fall, rasp and breath. */
export function renderCry(note: number, seconds: number) {
  return renderSingers(
    [
      { note, detune: 0, delay: 0, vibratoRate: 5 },
      { note, detune: 14, delay: 0.012, vibratoRate: 5 },
      { note, detune: -17, delay: 0.026, vibratoRate: 5 },
    ],
    {
      seconds,
      scoop: 4,
      scoopSeconds: 0.08,
      fall: 9,
      fallFrom: 0.35,
      vibrato: 0,
      attack: 0.02,
      hold: 0.45,
      tilt: 0.72,
      breath: 0.32,
      drive: 2.4,
      rasp: 0.45,
      from: "a",
      to: "a",
    },
  );
}
