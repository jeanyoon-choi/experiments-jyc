// The gestures: what one touch plays under each soundscape, from the page, its rank and its place.
// Each returns how long it sounds, 0 if nothing played (a buffer still rendering). They only pick
// buffers and schedule them through the engine's `play` and buses (sound.ts).
//
// The Math.random calls here are in a fixed order within each gesture; keep it when editing, or a
// gesture's 부서짐 changes character.

import { cryFor, fileFor, toneFor, voiceFor } from "./buffers.ts";
import { RAW_KINDS, type SoundParameters } from "./options.ts";
import { midiToHz } from "./synth.ts";
import { beam, clang, pipe } from "./voices/metal.ts";
import { chime, droop, hymn as choir, pop, swoosh, tap } from "./voices/notify.ts";
import { rawVoice } from "./voices/raw.ts";
import { REAL_FILES, REAL_PLATFORMS, realUrl } from "./voices/real.ts";

/** One touch, as the frame loop reports it. */
export type Touch = {
  page: number;
  /** The page's displayed rank over the largest one's, 0–1. */
  rank: number;
  /** Position on the screen, 0–1 each. */
  x: number;
  y: number;
};

/** The engine, as far as a gesture needs it. */
export type Rig = {
  readonly context: AudioContext;
  readonly master: GainNode;
  /** The five pan buses, left to right. */
  readonly buses: readonly AudioNode[];
  /** The stutters' blip and the leaders' sub (sound.ts). */
  readonly grain: AudioBuffer;
  readonly sub: AudioBuffer;
  readonly parameters: SoundParameters;
  /** 브루털: the limiter is out. */
  readonly brutal: boolean;
  play(buffer: AudioBuffer, rate: number, at: number, level: number, length: number, out: AudioNode): void;
};

const BPM = 112;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const BARS_PER_CHORD = 4;
/** D minor, turning: Dm9 · B♭maj7♯11 · Gm9 · Asus4(add9), as MIDI notes from the bass up. */
export const CHORDS: readonly (readonly number[])[] = [
  [38, 50, 53, 57, 60, 64],
  [34, 50, 53, 57, 58, 64],
  [31, 50, 55, 58, 62, 57],
  [33, 50, 52, 55, 57, 59],
];

export const hash = (value: number) => {
  let x = Math.imul(value ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
};

/**
 * v2: one platform's notification, as it is. Under 섞임 a page keeps its platform; rank sets
 * how loud and how many arrive in a row (leaders three, the small one); 부서짐 piles up six.
 */
export function raw(rig: Rig, { page, rank }: Touch, now: number, bus: AudioNode) {
  const { raw, grain } = rig.parameters;
  const kind = raw === "mixed" ? RAW_KINDS[Math.floor(hash(page * 17 + 3) * RAW_KINDS.length)]! : raw;
  const brutal = rig.brutal;
  const burst = hash(page * 13 + Math.floor(now * 4)) < grain;
  const count = burst ? (brutal ? 12 : 6) : rank > 0.7 ? 3 : rank > 0.3 ? 2 : 1;
  const voice = voiceFor(`r${brutal ? "b" : ""}${kind}x${count}`, () => rawVoice(kind, count, brutal));
  if (!voice) return 0;
  rig.play(voice, 1, now, brutal ? 0.7 + 0.3 * rank : 0.16 + 0.14 * rank, voice.duration, bus);
  return voice.duration;
}

/**
 * v3: the platform's own file, played as it is: straight into the master, no pan, at its
 * own level. Under 섞임 a page keeps its platform, and within it its sound. 부서짐 makes
 * the same notification arrive several times running (70 ms apart under 브루털).
 */
export function real(rig: Rig, { page }: Touch, now: number) {
  const { real, grain } = rig.parameters;
  const platform = real === "mixed" ? REAL_PLATFORMS[Math.floor(hash(page * 17 + 3) * REAL_PLATFORMS.length)]! : real;
  const names = REAL_FILES[platform];
  const file = fileFor(rig.context, realUrl(platform, names[Math.floor(hash(page * 31 + 7) * names.length)]!));
  if (!file) return 0;
  const brutal = rig.brutal;
  const count = hash(page * 13 + Math.floor(now * 4)) < grain ? (brutal ? 8 : 3) : 1;
  for (let index = 0; index < count; index += 1) {
    const source = rig.context.createBufferSource();
    source.buffer = file;
    source.connect(rig.master);
    source.start(now + index * (brutal ? 0.07 : 0.2));
  }
  // A long tail (Note rings 4.4 s) counts as a voice for 1.5 s at most.
  return Math.min(1.5, file.duration) + (count - 1) * (brutal ? 0.07 : 0.2);
}

/** 유리: the page's tone in a register set by its rank; returns how long it sounds, 0 if nothing played. */
export function glass(rig: Rig, { page, rank, y }: Touch, degreeNote: number, root: number, now: number, bus: AudioNode) {
  const octave = rank > 0.7 ? -12 : rank > 0.35 ? 0 : rank > 0.12 ? 12 : 24;
  const note = degreeNote + octave;
  const tone = toneFor(note, y < 0.5, octave);
  if (!tone) return 0;
  const length = Math.min(tone.duration, 0.35 + 2.8 * rank ** 0.6);
  rig.play(tone, 1, now, 0.16 + 0.12 * rank, length, bus);
  if (rank > 0.85) rig.play(rig.sub, midiToHz(root < 40 ? root + 12 : root) / 55, now, 0.3, 0.7, rig.buses[2]!);
  if (hash(page * 13 + Math.floor(now * 4)) < rig.parameters.grain) stutter(rig, midiToHz(note + 12), now, rank, bus);
  return length;
}

/**
 * 금속, on 군중's grammar rather than 유리's (user: "훨씬 낮게 … 군중과 같이 더 깊게 묵직하고
 * 낮게 깔려야"): the chord's root and fifth only, in 군중's registers. Leaders: a steel beam
 * on the root an octave up, with its fifth, and the sub; the middle a struck pipe two octaves
 * up (root or fifth); small pages a steel clang a little higher, cut short. Breaking (부서짐):
 * a chain's rattle on root and fifth, off the beat.
 */
export function metal(rig: Rig, { page, rank }: Touch, notes: readonly number[], now: number, bus: AudioNode) {
  const root = notes[0]!;
  const fifth = hash(page * 31 + 7) < 0.5;
  if (hash(page * 13 + Math.floor(now * 4)) < rig.parameters.grain) {
    const count = 4 + Math.floor(Math.random() * 4);
    let at = now;
    for (let index = 0; index < count; index += 1) {
      const note = root + 24 + (Math.random() < 0.5 ? 7 : 0);
      const voice = voiceFor(`m${note}`, () => clang(note, false, 1.2));
      if (voice) rig.play(voice, 1, at, 0.2 * 0.85 ** index, 0.3, bus);
      at += 0.03 + Math.random() * 0.08;
    }
    return at - now + 0.3;
  }
  if (rank > 0.7) {
    const note = root + 12;
    const low = voiceFor(`b${note}`, () => beam(note, 3.6));
    const upper = voiceFor(`b${note + 7}`, () => beam(note + 7, 3.2));
    if (!low) return 0;
    const length = Math.min(low.duration, 1.6 + 2 * rank);
    rig.play(low, 1, now, 0.34, length, rig.buses[2]!);
    if (upper) rig.play(upper, 1, now + 0.025, 0.24, length, bus);
    if (rank > 0.85) rig.play(rig.sub, midiToHz(root < 40 ? root + 12 : root) / 55, now, 0.34, 0.7, rig.buses[2]!);
    return length;
  }
  if (rank > 0.3) {
    const note = root + 24 + (fifth ? 7 : 0);
    const voice = voiceFor(`q${note}`, () => pipe(note, 2.4));
    if (!voice) return 0;
    const length = Math.min(voice.duration, 0.8 + 2 * rank);
    rig.play(voice, 1, now, 0.3, length, bus);
    return length;
  }
  const note = root + 31 + (fifth ? 5 : 0);
  const voice = voiceFor(`m${note}`, () => clang(note, false, 1.2));
  if (!voice) return 0;
  rig.play(voice, 1, now, 0.24, 0.35, bus);
  return 0.35;
}

/**
 * 알림 2: every chime's ring turns into a choir (voices/notify.ts hymn). Leaders: the driven chime flipped down
 * to the root, the sub, and choir-chimes rising over three octaves — root, fifth, the page's
 * tone, its octave. The middle: a like's pop struck into two choir-chimes a chord tone apart.
 * The small: a double tap with a faint choir above. Breaking (부서짐): chimes climbing the
 * chord in sixteenths over two octaves, the last one sung.
 */
export function hymn(rig: Rig, { page, rank }: Touch, notes: readonly number[], now: number, bus: AudioNode) {
  const scale = notes.slice(1).sort((a, b) => a - b);
  const index = Math.floor(hash(page * 31 + 7) * scale.length);
  const degree = (step: number) => scale[(index + step) % scale.length]! + 12 * Math.floor((index + step) / scale.length);
  const root = notes[0]!;
  const sung = (note: number) => voiceFor(`h${note}`, () => choir(note));
  if (hash(page * 13 + Math.floor(now * 4)) < rig.parameters.grain) {
    const count = 4 + Math.floor(Math.random() * 3);
    const step = BEAT / 4;
    for (let index = 0; index < count; index += 1) {
      const note = degree(index) + (rank > 0.5 ? 0 : 12);
      const last = index === count - 1;
      const voice = last ? sung(note) : voiceFor(`c${note}`, () => chime(note));
      if (voice) rig.play(voice, 1, now + index * step, (last ? 0.2 : 0.17) * 0.92 ** index, last ? voice.duration : 0.7, bus);
    }
    return count * step + 2;
  }
  if (rank > 0.7) {
    const stab = voiceFor(`f${root}`, () => chime(root, 2.2));
    const choir = [root + 12, root + 19, degree(0), degree(0) + 12].map(sung);
    if (!stab || choir.some((voice) => !voice)) return 0;
    const length = 2 + 2 * rank;
    rig.play(stab, 1, now, 0.26, Math.min(stab.duration, length), bus);
    rig.play(rig.sub, midiToHz(root < 40 ? root + 12 : root) / 55, now, 0.32, 0.7, rig.buses[2]!);
    choir.forEach((voice, step) => rig.play(voice!, 1, now + step * 0.07, 0.15, length, step < 2 ? rig.buses[2]! : bus));
    return length;
  }
  if (rank > 0.3) {
    const like = voiceFor(`p${degree(0) + 12}`, () => pop(degree(0) + 12));
    const choir = [degree(0) + 12, degree(1) + 12].map(sung);
    if (!like || choir.some((voice) => !voice)) return 0;
    const length = 1.4 + 2 * rank;
    rig.play(like, 1, now, 0.24, like.duration, bus);
    choir.forEach((voice, step) => rig.play(voice!, 1, now + 0.03 + step * 0.05, 0.14, length, bus));
    return length;
  }
  const [first, second] = [degree(0) + 24, degree(1) + 24].map((note) => voiceFor(`t${note}`, () => tap(note)));
  const halo = sung(degree(0) + 24);
  if (!first || !second || !halo) return 0;
  rig.play(first, 1, now, 0.2, first.duration, bus);
  rig.play(second, 1, now + 0.085, 0.16, second.duration, bus);
  rig.play(halo, 1, now + 0.085, 0.06, 1.2, bus);
  return 1.2;
}

/**
 * 알림 3: 군중's crowd() note for note — root and fifth, its registers, its gestures and
 * levels — with 알림's sounds yelled in place of the voice (voices/notify.ts droop): leaders a
 * low chime-yell with its fifth over it, the middle a like's pop-yell, small pages a tap's
 * short bark; breaking (부서짐), one onset retriggered in sixteenths.
 */
export function notice(rig: Rig, { page, rank }: Touch, notes: readonly number[], now: number, bus: AudioNode) {
  const root = notes[0]!;
  const fifth = hash(page * 31 + 7) < 0.5;
  const note = root + (rank > 0.7 ? 12 : rank > 0.3 ? 24 : 31) + (fifth && rank <= 0.7 ? 7 : 0);
  const kind = rank > 0.7 ? "chime" : rank > 0.3 ? "pop" : "tap";
  const seconds = (at: number) => (at < 52 ? 1.4 : at < 60 ? 1.1 : 0.8);
  const yell = voiceFor(`y${kind}${note}`, () => droop(kind, note, seconds(note)));
  if (!yell) return 0;
  if (hash(page * 13 + Math.floor(now * 4)) < rig.parameters.grain) return retrigger(rig, yell, now, bus);
  if (rank > 0.7) {
    rig.play(yell, 1, now, 0.34, yell.duration, bus);
    const upper = voiceFor(`ychime${note + 7}`, () => droop("chime", note + 7, seconds(note + 7)));
    if (upper) rig.play(upper, 1, now + 0.025, 0.26, upper.duration, bus);
    return yell.duration;
  }
  const length = rank > 0.3 ? yell.duration : 0.35;
  rig.play(yell, 1, now, 0.3, length, bus);
  return length;
}

/**
 * 알림: the feed's sounds harmonised on the chord. Each page has its own chord tone and the
 * tone above it. Leaders play the notification's rising three notes over the chime flipped
 * down to the root and driven, the largest with a swoosh in tune after them; the middle pop
 * as a pair, likes a chord tone apart; small pages double-tap high up. Breaking (부서짐), a
 * page's notifications pile up: chimes climbing the chord in sixteenths, or taps in
 * thirty-seconds.
 */
export function notify(rig: Rig, { page, rank }: Touch, notes: readonly number[], now: number, bus: AudioNode) {
  const scale = notes.slice(1).sort((a, b) => a - b);
  const index = Math.floor(hash(page * 31 + 7) * scale.length);
  const degree = (step: number) => scale[(index + step) % scale.length]! + 12 * Math.floor((index + step) / scale.length);
  const root = notes[0]!;
  const chimeAt = (note: number) => voiceFor(`c${note}`, () => chime(note));
  if (hash(page * 13 + Math.floor(now * 4)) < rig.parameters.grain) {
    const count = 3 + Math.floor(Math.random() * 3);
    const small = rank <= 0.3;
    const step = small ? BEAT / 8 : BEAT / 4;
    for (let index = 0; index < count; index += 1) {
      const note = small ? degree(index % 2) + 24 : degree(index) + (rank > 0.7 ? 0 : 12);
      const voice = small ? voiceFor(`t${note}`, () => tap(note)) : chimeAt(note);
      if (voice) rig.play(voice, 1, now + index * step, 0.2 * 0.85 ** index, small ? voice.duration : 0.6, bus);
    }
    return count * step + (small ? 0.18 : 0.6);
  }
  if (rank > 0.7) {
    const stab = voiceFor(`f${root}`, () => chime(root, 2.2));
    const rising = [degree(0), degree(1), degree(0) + 12].map(chimeAt);
    if (!stab || rising.some((voice) => !voice)) return 0;
    const length = 0.8 + 1.4 * rank;
    rig.play(stab, 1, now, 0.2, length, bus);
    rising.forEach((voice, step) => rig.play(voice!, 1, now + step * 0.075, 0.2 - 0.015 * step, Math.min(voice!.duration, length), bus));
    if (rank > 0.85) {
      const note = degree(0) + 12;
      const whoosh = voiceFor(`s${note}`, () => swoosh(note));
      if (whoosh) rig.play(whoosh, 1, now + 0.15, 0.12, whoosh.duration, bus);
    }
    return length;
  }
  if (rank > 0.3) {
    const [first, second] = [degree(0) + 12, degree(1) + 12].map((note) => voiceFor(`p${note}`, () => pop(note)));
    if (!first || !second) return 0;
    rig.play(first, 1, now, 0.26, first.duration, bus);
    rig.play(second, 1, now + 0.035, 0.2, second.duration, bus);
    return 0.45;
  }
  const [first, second] = [degree(0) + 24, degree(1) + 24].map((note) => voiceFor(`t${note}`, () => tap(note)));
  if (!first || !second) return 0;
  rig.play(first, 1, now, 0.22, first.duration, bus);
  rig.play(second, 1, now + 0.085, 0.18, second.duration, bus);
  return 0.27;
}

/**
 * 군중: yells, harmonised like a crowd's chant — on the chord's root and fifth only, not a
 * melody. Leaders yell low as a root-and-fifth pair; the middle a single yell; small pages a
 * short bark; sometimes, instead, one yell retriggered in sixteenths (rhythm, not tune).
 */
export function crowd(rig: Rig, { page, rank }: Touch, notes: readonly number[], now: number, bus: AudioNode) {
  const root = notes[0]!;
  const fifth = hash(page * 31 + 7) < 0.5;
  const note = root + (rank > 0.7 ? 12 : rank > 0.3 ? 24 : 31) + (fifth && rank <= 0.7 ? 7 : 0);
  const yell = cryFor(note);
  if (!yell) return 0;
  if (hash(page * 13 + Math.floor(now * 4)) < rig.parameters.grain) return retrigger(rig, yell, now, bus);
  if (rank > 0.7) {
    rig.play(yell, 1, now, 0.34, yell.duration, bus);
    const upper = cryFor(note + 7);
    if (upper) rig.play(upper, 1, now + 0.025, 0.26, upper.duration, bus);
    return yell.duration;
  }
  const length = rank > 0.3 ? yell.duration : 0.35;
  rig.play(yell, 1, now, 0.3, length, bus);
  return length;
}

/** The yell's onset cut and fired again in sixteenths, each a little quieter. */
function retrigger(rig: Rig, yell: AudioBuffer, at: number, out: AudioNode) {
  const context = rig.context;
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

/** Ratcheting grains in tempo, each quieter, sometimes an octave up: one gain, a few buffer sources. */
function stutter(rig: Rig, frequency: number, at: number, rank: number, out: AudioNode) {
  const context = rig.context;
  const count = 2 + Math.floor(Math.random() * 3);
  const step = Math.random() < 0.5 ? BEAT / 4 : BEAT / 8;
  const level = context.createGain();
  const base = 0.08 + 0.05 * (1 - rank);
  level.connect(out);
  for (let index = 1; index <= count; index += 1) {
    const start = at + index * step;
    const grain = context.createBufferSource();
    grain.buffer = rig.grain;
    grain.playbackRate.value = (frequency * (index % 3 === 0 ? 2 : 1)) / 440;
    level.gain.setValueAtTime(base * 0.8 ** index, start);
    grain.connect(level);
    grain.start(start);
  }
}
