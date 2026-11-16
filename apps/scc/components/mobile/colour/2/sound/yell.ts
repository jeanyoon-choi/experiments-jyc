// While a finger is down: 군중's yell (cry.ts) as a hook that never lets up. A low
// root-and-fifth pair shouted on beats one and three and left to fall under the rest,
// the same yell's onset chopped in sixteenths an octave up, one high scream on the
// fourth beat. One root and its fifth only: a chant, not a tune. Dry, so it can stop
// on the frame the finger lifts.

import { CRY_RATE, renderCry } from "./cry";

const BPM = 126;
const STEP = 60 / BPM / 4;
const LOOKAHEAD = 0.14;
const CHOP = 0.12;

const LOW = 50;
const FIFTH = 57;
const MID = 62;
const HIGH = 69;
/** Seconds each note is rendered for: longer the lower it sits. */
const NOTES: readonly (readonly [note: number, seconds: number])[] = [[LOW, 1.4], [FIFTH, 1.1], [MID, 0.8], [HIGH, 0.8]];

type Hit = { note: number; level: number; whole?: boolean; late?: number };
const PAIR: readonly Hit[] = [{ note: LOW, level: 0.36, whole: true }, { note: FIFTH, level: 0.28, whole: true, late: 0.025 }];
const chop = (note: number, level: number): readonly Hit[] => [{ note, level }];
/** One bar in sixteenths. */
const BAR: readonly (readonly Hit[] | null)[] = [
  PAIR, null, chop(MID, 0.26), chop(MID, 0.2),
  chop(FIFTH, 0.26), null, chop(MID, 0.26), chop(HIGH, 0.18),
  PAIR, null, chop(MID, 0.26), chop(MID, 0.2),
  [{ note: HIGH, level: 0.24, whole: true }], null, chop(MID, 0.26), chop(MID, 0.2),
];

export type Yell = {
  /** Call from any gesture: a browser starts audio only after one. */
  unlock: () => void;
  /** Call every frame with whether a finger is down. */
  update: (pressed: boolean) => void;
  dispose: () => void;
  /** One line on why it might be silent, for `?debug`. */
  status: () => string;
};

const SILENT: Yell = { unlock: () => {}, update: () => {}, dispose: () => {}, status: () => "audio unsupported" };

export function createYell(): Yell {
  if (typeof AudioContext === "undefined" || typeof OfflineAudioContext === "undefined") return SILENT;
  const context = new AudioContext({ latencyHint: "interactive" });
  const limiter = context.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.ratio.value = 6;
  limiter.attack.value = 0.004;
  limiter.release.value = 0.2;
  limiter.connect(context.destination);

  const buffers = new Map<number, AudioBuffer>();
  // Computed (cry.ts), one note per task so mounting never stalls a frame.
  let disposed = false;
  let failure = "";
  const build = (index: number) => {
    const entry = NOTES[index];
    if (disposed || !entry) return;
    try {
      const [note, seconds] = entry;
      const data = renderCry(note, seconds);
      const buffer = context.createBuffer(1, data.length, CRY_RATE);
      buffer.getChannelData(0).set(data);
      buffers.set(note, buffer);
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
      console.warn("colour/2 sound:", error);
    }
    window.setTimeout(() => build(index + 1), 0);
  };
  window.setTimeout(() => build(0), 0);

  // iOS: Web Audio follows the ringer switch unless the session is declared as playback.
  const session = (navigator as Navigator & { audioSession?: { type: string } }).audioSession;
  if (session) {
    try {
      session.type = "playback";
    } catch {
      // Left at the browser's default.
    }
  }

  let bus: GainNode | null = null;
  let live = new Set<AudioBufferSourceNode>();
  let next = 0;
  let step = 0;

  const fire = ({ note, level, whole, late = 0 }: Hit, at: number, out: AudioNode, sources: Set<AudioBufferSourceNode>) => {
    const buffer = buffers.get(note);
    if (!buffer) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    const start = at + late;
    gain.gain.setValueAtTime(level, start);
    source.connect(gain).connect(out);
    if (whole) {
      source.start(start);
    } else {
      // The yell's onset alone, closed over its last 20 ms so it does not click.
      gain.gain.setValueAtTime(level, start + CHOP - 0.02);
      gain.gain.linearRampToValueAtTime(0, start + CHOP);
      source.start(start, 0, CHOP);
    }
    sources.add(source);
    source.onended = () => {
      sources.delete(source);
      gain.disconnect();
    };
  };

  const stop = () => {
    if (!bus) return;
    const now = context.currentTime;
    const ended = bus;
    ended.gain.cancelScheduledValues(now);
    ended.gain.setTargetAtTime(0, now, 0.004);
    for (const source of live) {
      try {
        source.stop(now + 0.03);
      } catch {
        // Already stopped.
      }
    }
    window.setTimeout(() => ended.disconnect(), 200);
    bus = null;
    live = new Set();
  };

  return {
    unlock: () => {
      // Not only "suspended": iOS also parks a context as "interrupted" when the camera starts.
      if (context.state !== "running") void context.resume().catch(() => {});
    },
    update: (pressed) => {
      if (!pressed) {
        stop();
        return;
      }
      if (context.state !== "running" || buffers.size < NOTES.length) return;
      const now = context.currentTime;
      if (!bus) {
        bus = context.createGain();
        bus.connect(limiter);
        next = now + 0.01;
        step = 0;
      }
      // A stalled frame must not fire the steps it missed all at once.
      while (next < now) {
        next += STEP;
        step = (step + 1) % BAR.length;
      }
      while (next < now + LOOKAHEAD) {
        for (const hit of BAR[step] ?? []) fire(hit, next, bus, live);
        next += STEP;
        step = (step + 1) % BAR.length;
      }
    },
    status: () => `audio ${context.state} ${context.sampleRate} · yells ${buffers.size}/${NOTES.length} · session ${session?.type ?? "none"} · playing ${live.size}${failure ? ` · ${failure}` : ""}`,
    dispose: () => {
      disposed = true;
      stop();
      void context.close().catch(() => {});
    },
  };
}
