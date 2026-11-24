// 소리 (user, 2026-10-12): a sound each time a goldfish touches a page's bubble — the
// same onset as 금붕어가 닿을 때만's reveal. Six soundscapes on one engine:
//
//   유리 — Max Cooper's generative electronica: glassy FM tones on a slowly turning
//          chord, tight clicks, stuttering grains, ping-pong echoes in tempo, a long
//          room;
//   금속 — the objects' chrome and steel (voices/metal.ts) on 군중's low root and fifth;
//   군중 — the work's FOMO and desire as a crowd crying out in harmony: one sung
//          voice (voices/crowd.ts) stacked on the chord and chopped up it in sixteenths;
//   알림 — 군중's method on the feed's interface sounds: chimes, likes' pops, taps and
//          swooshes (voices/notify.ts) stacked on the chord and retriggered;
//   알림 2 — 알림 made vast: chimes whose ring turns into a choir, stacked over three
//          octaves on a driven, flipped-down stab, in a larger room;
//   알림 3 — 군중 note for note, with 알림's chime, pop and tap yelled in place of the voice
//          (held, scooped up and falling nine semitones, three voices, driven).
//
// Those six are v1. v2 (voices/raw.ts, the default since 2026-10-28) keeps the touches,
// the pages' own voices, rank, pan and 부서짐, and drops the chord, the harmony and the
// room: one platform's notification per touch. v3 (voices/real.ts, the default since later
// that day) plays the platforms' own files, as they ship.
//
// Nothing sounds but the touches (user, 2026-10-12): a pad under 유리 and a choir under
// 군중 were tried and removed.
//
// Performative: every page keeps its own voice (a fixed degree of whatever chord is
// sounding), its rank picks the register and the gesture (leaders ring low and long, or
// yell as a root-and-fifth pair; small pages chime high, or bark), its place on the screen pans and colours it,
// so the school plays
// the web as an instrument. The sound is on from the start and begins with the first gesture on the page (use-touch-sound.ts).
//
// Cost (user, 2026-10-12: the first version cost frames): nothing is synthesised per
// touch. Tones are rendered offline, off the main thread, the first time a note is
// needed (at its own pitch — a bank pitched from one low octave sounded wrong, the user
// said) and cached; a touch is a buffer source and a gain into one of five fixed pan
// buses. At most one touch per sixteenth and twelve voices at once.
//
// The folder: this file is the engine — the WebAudio graph, the limits on touches and voices,
// `play`; scapes.ts the gestures, what a touch plays under each soundscape; buffers.ts the
// rendered buffers by key; voices/ the renders themselves (metal, notify and raw computed
// sample by sample on synth.ts and pinned in voices/digest.test.ts; glass and crowd through
// offline WebAudio; real the platforms' files); options.ts the panel's parameters and labels.

import { SOUND_DEFAULTS, type SoundParameters } from "./options.ts";
import { BAR, BARS_PER_CHORD, BEAT, CHORDS, crowd, glass, hash, hymn, metal, notice, notify, raw, real, type Rig, type Touch } from "./scapes.ts";

export { SOUND_DEFAULTS, SOUNDSCAPES, type SoundParameters, type Soundscape } from "./options.ts";
export type { Touch } from "./scapes.ts";

const MAX_VOICES = 12;
/** 브루털's ceiling: buffer sources are cheap; this only keeps a stampede from running away. */
const MAX_BRUTAL_VOICES = 96;
const PAGE_REST = 0.4;
/** At most one new touch per sixteenth: 250 fish begin touching ~16 pages a second. */
const TOUCH_GAP = BEAT / 4;
const PANS = [-0.8, -0.4, 0, 0.4, 0.8];

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

export class TouchSound implements Rig {
  readonly context: AudioContext;
  readonly master: GainNode;
  private readonly limiter: DynamicsCompressorNode;
  private limited = true;
  private readonly roomSend: GainNode;
  private readonly echoSend: GainNode;
  readonly buses: StereoPannerNode[] = [];
  readonly grain: AudioBuffer;
  readonly sub: AudioBuffer;
  private readonly lastAt = new Map<number, number>();
  private endings: number[] = [];
  private lastTouchAt = -1;
  parameters: SoundParameters = SOUND_DEFAULTS;

  constructor() {
    const context = new AudioContext({ latencyHint: "balanced" });
    this.context = context;
    const limiter = context.createDynamicsCompressor();
    limiter.threshold.value = -14;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.25;
    limiter.connect(context.destination);
    this.limiter = limiter;
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
    // 브루털 goes straight out: what piles up clips.
    const limited = !(parameters.version >= 2 && parameters.pile === "brutal");
    if (limited !== this.limited) {
      this.limited = limited;
      this.master.disconnect();
      this.master.connect(limited ? this.limiter : this.context.destination);
    }
    // 알림 2 sits in a larger share of the room; v2 is dry.
    const space = parameters.version >= 2 ? 0 : parameters.space;
    this.roomSend.gain.setTargetAtTime(space * (parameters.scape === "hymn" ? 0.9 : 0.55), now, 0.1);
    this.echoSend.gain.setTargetAtTime(space * 0.4, now, 0.1);
  }

  /** 브루털: the limiter is out. */
  get brutal() {
    return !this.limited;
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
    // 브루털: every touch sounds, however close to the last.
    const brutal = this.brutal;
    if (!brutal && now - this.lastTouchAt < TOUCH_GAP) return;
    if (!brutal && now - (this.lastAt.get(touch.page) ?? -1) < PAGE_REST) return;
    const ceiling = brutal ? MAX_BRUTAL_VOICES : MAX_VOICES;
    if (this.endings.length >= ceiling) {
      this.endings = this.endings.filter((end) => end > now);
      if (this.endings.length >= ceiling) return;
    }
    const notes = this.currentChord();
    // A page's own voice: a fixed degree of the chord.
    const note = notes[1 + Math.floor(hash(touch.page * 31 + 7) * (notes.length - 1))]!;
    const bus = this.buses[Math.max(0, Math.min(PANS.length - 1, Math.round(touch.x * (PANS.length - 1))))]!;
    const { scape } = this.parameters;
    const length =
      this.parameters.version === 3
        ? real(this, touch, now)
        : this.parameters.version === 2
          ? raw(this, touch, now, bus)
          : scape === "crowd"
            ? crowd(this, touch, notes, now, bus)
            : scape === "notify"
              ? notify(this, touch, notes, now, bus)
              : scape === "hymn"
                ? hymn(this, touch, notes, now, bus)
                : scape === "notice"
                  ? notice(this, touch, notes, now, bus)
                  : scape === "metal"
                    ? metal(this, touch, notes, now, bus)
                    : glass(this, touch, note, notes[0]!, now, bus);
    if (length <= 0) return;
    this.lastAt.set(touch.page, now);
    this.lastTouchAt = now;
    this.endings.push(now + length);
  }

  /** A buffer through its own gain into a bus, cut short after `length` seconds. */
  play(buffer: AudioBuffer, rate: number, at: number, level: number, length: number, out: AudioNode) {
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
