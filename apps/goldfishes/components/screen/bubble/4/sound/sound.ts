// 소리 (user, 2026-10-12): a sound each time a goldfish touches a page's bubble — the
// same onset as 금붕어가 닿을 때만's reveal. Two soundscapes on one engine:
//
//   유리 — Max Cooper's generative electronica: glassy FM tones on a slowly turning
//          chord, tight clicks, stuttering grains, ping-pong echoes in tempo, a long
//          room;
//   군중 — the work's FOMO and desire as a crowd crying out in harmony: one sung
//          voice (sound-crowd.ts) stacked on the chord and chopped up it in sixteenths.
//
// Nothing sounds but the touches (user, 2026-10-12): a pad under 유리 and a choir under
// 군중 were tried and removed.
//
// Performative: every page keeps its own voice (a fixed degree of whatever chord is
// sounding), its rank picks the register and the gesture (leaders ring low and long, or
// yell as a root-and-fifth pair; small pages chime high, or bark), its place on the screen pans and colours it,
// so the school plays
// the web as an instrument. The context starts only from the panel's button.
//
// Cost (user, 2026-10-12: the first version cost frames): nothing is synthesised per
// touch. Tones are rendered offline, off the main thread, the first time a note is
// needed (at its own pitch — a bank pitched from one low octave sounded wrong, the user
// said) and cached; a touch is a buffer source and a gain into one of five fixed pan
// buses. At most one touch per sixteenth and twelve voices at once.

import { renderCry } from "./sound-crowd";

/** One touch, as the frame loop reports it. */
export type Touch = {
  page: number;
  /** The page's displayed rank over the largest one's, 0–1. */
  rank: number;
  /** Position on the screen, 0–1 each. */
  x: number;
  y: number;
};

export type Soundscape = "glass" | "crowd";

export const SOUNDSCAPES: readonly { id: Soundscape; label: string }[] = [
  { id: "glass", label: "유리" },
  { id: "crowd", label: "군중" },
];

export type SoundParameters = {
  scape: Soundscape;
  volume: number;
  /** How much reaches the room and the echoes, 0–1. */
  space: number;
  /** How often a touch breaks into stuttering grains or retriggered yells, 0–1. */
  grain: number;
};

export const SOUND_DEFAULTS: SoundParameters = { scape: "glass", volume: 0.7, space: 0.55, grain: 0.35 };

const BPM = 112;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const BARS_PER_CHORD = 4;
/** D minor, turning: Dm9 · B♭maj7♯11 · Gm9 · Asus4(add9), as MIDI notes from the bass up. */
const CHORDS: readonly (readonly number[])[] = [
  [38, 50, 53, 57, 60, 64],
  [34, 50, 53, 57, 58, 64],
  [31, 50, 55, 58, 62, 57],
  [33, 50, 52, 55, 57, 59],
];
const MAX_VOICES = 12;
const PAGE_REST = 0.4;
/** At most one new touch per sixteenth: 250 fish begin touching ~16 pages a second. */
const TOUCH_GAP = BEAT / 4;
const TONE_RATE = 32_000;
const PANS = [-0.8, -0.4, 0, 0.4, 0.8];
/** How long a tone rings in each register (octave offset → seconds); a touch may cut it shorter. */
const TONE_SECONDS: Record<number, number> = { [-12]: 3.2, 0: 2.4, 12: 1.4, 24: 0.8 };

const midiToHz = (note: number) => 440 * 2 ** ((note - 69) / 12);
const hash = (value: number) => {
  let x = Math.imul(value ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

/** A glassy (ratio 3.5) or warm (ratio 2) FM tone with a tick at its start, rendered offline. */
async function renderTone(frequency: number, glass: boolean, seconds: number) {
  const context = new OfflineAudioContext(1, Math.floor(TONE_RATE * seconds), TONE_RATE);
  const carrier = context.createOscillator();
  carrier.frequency.value = frequency;
  const modulator = context.createOscillator();
  modulator.frequency.value = frequency * (glass ? 3.5 : 2);
  const depth = context.createGain();
  depth.gain.setValueAtTime(frequency * (glass ? 2.6 : 1.1), 0);
  depth.gain.exponentialRampToValueAtTime(frequency * 0.02, seconds * 0.5);
  modulator.connect(depth).connect(carrier.frequency);
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0, 0);
  envelope.gain.linearRampToValueAtTime(1, 0.004);
  envelope.gain.exponentialRampToValueAtTime(0.0008, seconds);
  carrier.connect(envelope).connect(context.destination);
  // The tick: a few milliseconds of band-passed noise.
  const noise = context.createBuffer(1, Math.floor(TONE_RATE * 0.02), TONE_RATE);
  const data = noise.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  const tick = context.createBufferSource();
  tick.buffer = noise;
  const band = context.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = glass ? 9000 : 4500;
  band.Q.value = 4;
  const tickLevel = context.createGain();
  tickLevel.gain.setValueAtTime(0.35, 0);
  tickLevel.gain.exponentialRampToValueAtTime(0.002, 0.012);
  tick.connect(band).connect(tickLevel).connect(context.destination);
  carrier.start();
  modulator.start();
  tick.start();
  return context.startRendering();
}

/** Tones by note and colour, shared by every engine; a missing one is rendered and the touch stays silent. */
const tones = new Map<string, AudioBuffer | null>();
function toneFor(note: number, glass: boolean, octave: number) {
  const key = `${note}${glass ? "g" : "w"}`;
  const tone = tones.get(key);
  if (tone !== undefined) return tone;
  tones.set(key, null);
  void renderTone(midiToHz(note), glass, TONE_SECONDS[octave] ?? 1.4).then((buffer) => tones.set(key, buffer));
  return null;
}

/** 군중's yells by note, rendered the first time each is needed; longer the lower they sit. */
const cries = new Map<number, AudioBuffer | null>();
function cryFor(note: number) {
  const cry = cries.get(note);
  if (cry !== undefined) return cry;
  cries.set(note, null);
  void renderCry(note, note < 52 ? 1.4 : note < 60 ? 1.1 : 0.8).then((buffer) => cries.set(note, buffer));
  return null;
}

/** A room: two channels of decaying noise, darker as it fades. */
function roomImpulse(context: AudioContext, seconds: number) {
  const length = Math.floor(context.sampleRate * seconds);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < 2; channel += 1) {
    const data = impulse.getChannelData(channel);
    let low = 0;
    for (let index = 0; index < length; index += 1) {
      const t = index / length;
      low += (Math.random() * 2 - 1 - low) * (0.9 - 0.75 * t);
      data[index] = low * (1 - t) ** 2.6;
    }
  }
  return impulse;
}

/** A short triangle blip at 440 Hz for the stutters, played at other pitches by rate. */
function grainBuffer(context: AudioContext) {
  const length = Math.floor(context.sampleRate * 0.05);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) {
    const phase = (index * 440 / context.sampleRate) % 1;
    data[index] = (1 - 4 * Math.abs(phase - 0.5)) * Math.min(1, index / 60) * Math.exp(-index / (context.sampleRate * 0.012));
  }
  return buffer;
}

/** A sine dropping onto 55 Hz, felt more than heard. */
function subBuffer(context: AudioContext) {
  const length = Math.floor(context.sampleRate * 0.7);
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  let phase = 0;
  for (let index = 0; index < length; index += 1) {
    const t = index / context.sampleRate;
    phase += (2 * Math.PI * 55 * (1 + 1.5 * Math.exp(-t / 0.025))) / context.sampleRate;
    data[index] = Math.sin(phase) * Math.exp(-t / 0.18);
  }
  return buffer;
}

export class TouchSound {
  readonly context: AudioContext;
  private readonly master: GainNode;
  private readonly roomSend: GainNode;
  private readonly echoSend: GainNode;
  private readonly buses: StereoPannerNode[] = [];
  private readonly grain: AudioBuffer;
  private readonly sub: AudioBuffer;
  private readonly lastAt = new Map<number, number>();
  private endings: number[] = [];
  private lastTouchAt = -1;
  private parameters = SOUND_DEFAULTS;

  constructor() {
    const context = new AudioContext({ latencyHint: "balanced" });
    this.context = context;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.25;
    limiter.connect(context.destination);
    this.master = context.createGain();
    this.master.connect(limiter);

    const room = context.createConvolver();
    room.buffer = roomImpulse(context, 3.2);
    const roomReturn = context.createGain();
    roomReturn.gain.value = 0.9;
    room.connect(roomReturn).connect(this.master);
    this.roomSend = context.createGain();
    this.roomSend.connect(room);

    // Ping-pong echoes: a dotted eighth on the left, a quarter on the right, darkening each pass.
    const left = context.createDelay(2);
    const right = context.createDelay(2);
    left.delayTime.value = BEAT * 0.75;
    right.delayTime.value = BEAT;
    const tone = context.createBiquadFilter();
    tone.type = "lowpass";
    tone.frequency.value = 3200;
    const feedback = context.createGain();
    feedback.gain.value = 0.42;
    const merger = context.createChannelMerger(2);
    this.echoSend = context.createGain();
    this.echoSend.connect(left);
    left.connect(tone).connect(right);
    right.connect(feedback).connect(left);
    left.connect(merger, 0, 0);
    right.connect(merger, 0, 1);
    const echoReturn = context.createGain();
    echoReturn.gain.value = 0.5;
    merger.connect(echoReturn).connect(this.master);
    echoReturn.connect(room);

    for (const pan of PANS) {
      const bus = context.createStereoPanner();
      bus.pan.value = pan;
      bus.connect(this.master);
      bus.connect(this.roomSend);
      bus.connect(this.echoSend);
      this.buses.push(bus);
    }

    this.grain = grainBuffer(context);
    this.sub = subBuffer(context);
    this.setParameters(SOUND_DEFAULTS);
  }

  setParameters(parameters: SoundParameters) {
    this.parameters = parameters;
    const now = this.context.currentTime;
    this.master.gain.setTargetAtTime(parameters.volume * 0.8, now, 0.05);
    this.roomSend.gain.setTargetAtTime(parameters.space * 0.55, now, 0.1);
    this.echoSend.gain.setTargetAtTime(parameters.space * 0.4, now, 0.1);
  }

  /** The chord sounding now. */
  private currentChord() {
    const index = Math.floor(this.context.currentTime / (BAR * BARS_PER_CHORD)) % CHORDS.length;
    return CHORDS[index]!;
  }

  touch(touch: Touch) {
    const context = this.context;
    if (context.state !== "running") return;
    const now = context.currentTime;
    if (now - this.lastTouchAt < TOUCH_GAP) return;
    if (now - (this.lastAt.get(touch.page) ?? -1) < PAGE_REST) return;
    if (this.endings.length >= MAX_VOICES) {
      this.endings = this.endings.filter((end) => end > now);
      if (this.endings.length >= MAX_VOICES) return;
    }
    const notes = this.currentChord();
    // A page's own voice: a fixed degree of the chord.
    const note = notes[1 + Math.floor(hash(touch.page * 31 + 7) * (notes.length - 1))]!;
    const bus = this.buses[Math.max(0, Math.min(PANS.length - 1, Math.round(touch.x * (PANS.length - 1))))]!;
    const length = this.parameters.scape === "crowd" ? this.crowd(touch, notes, now, bus) : this.glass(touch, note, notes[0]!, now, bus);
    if (length <= 0) return;
    this.lastAt.set(touch.page, now);
    this.lastTouchAt = now;
    this.endings.push(now + length);
  }

  /** 유리: the page's tone in a register set by its rank; returns how long it sounds, 0 if nothing played. */
  private glass({ page, rank, y }: Touch, degreeNote: number, root: number, now: number, bus: AudioNode) {
    const octave = rank > 0.7 ? -12 : rank > 0.35 ? 0 : rank > 0.12 ? 12 : 24;
    const note = degreeNote + octave;
    const tone = toneFor(note, y < 0.5, octave);
    if (!tone) return 0;
    const length = Math.min(tone.duration, 0.35 + 2.8 * rank ** 0.6);
    this.play(tone, 1, now, 0.16 + 0.12 * rank, length, bus);
    if (rank > 0.85) this.play(this.sub, midiToHz(root < 40 ? root + 12 : root) / 55, now, 0.3, 0.7, this.buses[2]!);
    if (hash(page * 13 + Math.floor(now * 4)) < this.parameters.grain) this.stutter(midiToHz(note + 12), now, rank, bus);
    return length;
  }

  /**
   * 군중: yells, harmonised like a crowd's chant — on the chord's root and fifth only, not a
   * melody. Leaders yell low as a root-and-fifth pair; the middle a single yell; small pages a
   * short bark; sometimes, instead, one yell retriggered in sixteenths (rhythm, not tune).
   */
  private crowd({ page, rank }: Touch, notes: readonly number[], now: number, bus: AudioNode) {
    const root = notes[0]!;
    const fifth = hash(page * 31 + 7) < 0.5;
    const note = root + (rank > 0.7 ? 12 : rank > 0.3 ? 24 : 31) + (fifth && rank <= 0.7 ? 7 : 0);
    const yell = cryFor(note);
    if (!yell) return 0;
    if (hash(page * 13 + Math.floor(now * 4)) < this.parameters.grain) return this.retrigger(yell, now, bus);
    if (rank > 0.7) {
      this.play(yell, 1, now, 0.34, yell.duration, bus);
      const upper = cryFor(note + 7);
      if (upper) this.play(upper, 1, now + 0.025, 0.26, upper.duration, bus);
      return yell.duration;
    }
    const length = rank > 0.3 ? yell.duration : 0.35;
    this.play(yell, 1, now, 0.3, length, bus);
    return length;
  }

  /** The yell's onset cut and fired again in sixteenths, each a little quieter. */
  private retrigger(yell: AudioBuffer, at: number, out: AudioNode) {
    const context = this.context;
    const count = 2 + Math.floor(Math.random() * 3);
    const level = context.createGain();
    level.connect(out);
    for (let index = 0; index < count; index += 1) {
      const start = at + (index * BEAT) / 4;
      level.gain.setValueAtTime(0.32 * 0.82 ** index, start);
      const source = context.createBufferSource();
      source.buffer = yell;
      source.connect(level);
      source.start(start, 0, 0.12);
    }
    return (count * BEAT) / 4;
  }

  /** A buffer through its own gain into a bus, cut short after `length` seconds. */
  private play(buffer: AudioBuffer, rate: number, at: number, level: number, length: number, out: AudioNode) {
    const source = this.context.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(level, at);
    if (length < buffer.duration / rate - 0.01) gain.gain.setTargetAtTime(0, at + length * 0.75, length * 0.08);
    source.connect(gain).connect(out);
    source.start(at);
    source.stop(at + length + 0.1);
  }

  /** Ratcheting grains in tempo, each quieter, sometimes an octave up: one gain, a few buffer sources. */
  private stutter(frequency: number, at: number, rank: number, out: AudioNode) {
    const context = this.context;
    const count = 2 + Math.floor(Math.random() * 3);
    const step = Math.random() < 0.5 ? BEAT / 4 : BEAT / 8;
    const level = context.createGain();
    const base = 0.08 + 0.05 * (1 - rank);
    level.connect(out);
    for (let index = 1; index <= count; index += 1) {
      const start = at + index * step;
      const grain = context.createBufferSource();
      grain.buffer = this.grain;
      grain.playbackRate.value = (frequency * (index % 3 === 0 ? 2 : 1)) / 440;
      level.gain.setValueAtTime(base * 0.8 ** index, start);
      grain.connect(level);
      grain.start(start);
    }
  }

  async resume() {
    if (this.context.state !== "running") await this.context.resume();
  }

  async suspend() {
    if (this.context.state === "running") await this.context.suspend();
  }

  dispose() {
    void this.context.close();
  }
}

