// The rendered buffers, by key. Each is made the first time a touch asks for it, away from the
// frame that asked, and that touch stays silent. Module-level, so shared by every engine and
// kept for the page's life.

import { midiToHz, SYNTH_RATE } from "./synth.ts";
import { renderCry } from "./voices/crowd.ts";
import { renderTone } from "./voices/glass.ts";

/** How long a tone rings in each register (octave offset → seconds); a touch may cut it shorter. */
const TONE_SECONDS: Record<number, number> = { [-12]: 3.2, 0: 2.4, 12: 1.4, 24: 0.8 };

/** Tones by note and colour, shared by every engine; a missing one is rendered and the touch stays silent. */
const tones = new Map<string, AudioBuffer | null>();
export function toneFor(note: number, glass: boolean, octave: number) {
  const key = `${note}${glass ? "g" : "w"}`;
  const tone = tones.get(key);
  if (tone !== undefined) return tone;
  tones.set(key, null);
  void renderTone(midiToHz(note), glass, TONE_SECONDS[octave] ?? 1.4).then((buffer) => tones.set(key, buffer));
  return null;
}

/** 군중's yells by note, rendered the first time each is needed; longer the lower they sit. */
const cries = new Map<number, AudioBuffer | null>();
export function cryFor(note: number) {
  const cry = cries.get(note);
  if (cry !== undefined) return cry;
  cries.set(note, null);
  void renderCry(note, note < 52 ? 1.4 : note < 60 ? 1.1 : 0.8).then((buffer) => cries.set(note, buffer));
  return null;
}

/** v3's files by URL, fetched and decoded the first time each is needed; the touch stays silent. */
const files = new Map<string, AudioBuffer | null>();
export function fileFor(context: BaseAudioContext, url: string) {
  const file = files.get(url);
  if (file !== undefined) return file;
  files.set(url, null);
  void fetch(url)
    .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(`${url}: ${response.status}`))))
    .then((data) => context.decodeAudioData(data))
    .then((buffer) => files.set(url, buffer))
    .catch((error: unknown) => console.warn("bubble/9 소리 v3:", error));
  return null;
}

/**
 * 금속's tones and 알림's voices by key, computed (voices/) the first time each is
 * needed, in a task of its own rather than the frame that asked; the touch stays silent.
 */
const voices = new Map<string, AudioBuffer | null>();
export function voiceFor(key: string, render: () => Float32Array<ArrayBuffer>) {
  const voice = voices.get(key);
  if (voice !== undefined) return voice;
  voices.set(key, null);
  setTimeout(() => {
    const data = render();
    const buffer = new AudioBuffer({ length: data.length, sampleRate: SYNTH_RATE, numberOfChannels: 1 });
    buffer.copyToChannel(data, 0);
    voices.set(key, buffer);
  }, 0);
  return null;
}
