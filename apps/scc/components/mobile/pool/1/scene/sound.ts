// The table's sound: real recordings of a cue, balls, cushions, a pocket and a rolling ball (one
// sprite, `table.mp3`), and Trump's "You're fired" for every ball that goes down.
//
// Browsers let a page sound only after a gesture they accept. iOS Safari does not accept a touch
// that moved before it lifted (WebKit bug 248265), and every shot here is a drag, so the page asks
// for one tap. `unlock` is called from that tap and from every other gesture event; `onOpen`
// hears whether sound is let out.

import { HIT_BALL, HIT_CUSHION, HIT_POCKET } from "../model/physics";

type Clip = { at: number; len: number };
/** Where each recording sits in the sprite (seconds), as built from the source pack. */
const SPRITE: Record<"cue" | "ball" | "cushion" | "pocket" | "roll", Clip[]> = {
  cue: [
    { at: 0.12, len: 0.122 },
    { at: 0.362, len: 0.122 },
    { at: 0.604, len: 0.1215 },
    { at: 0.8455, len: 0.122 },
  ],
  ball: [
    { at: 1.0875, len: 0.112 },
    { at: 1.3195, len: 0.112 },
    { at: 1.5515, len: 0.112 },
    { at: 1.7835, len: 0.1105 },
    { at: 2.014, len: 0.1104 },
    { at: 2.2444, len: 0.1105 },
  ],
  cushion: [
    { at: 2.4749, len: 0.1115 },
    { at: 2.7064, len: 0.11 },
    { at: 2.9364, len: 0.1103 },
  ],
  pocket: [{ at: 3.1667, len: 0.762 }],
  roll: [{ at: 4.0487, len: 2.0 }],
};
/** The silence either side of a clip in the sprite: decoders may shift it by up to this much. */
const SLACK = 0.06;
/** Impact speed (m/s) at which each kind of hit is at full loudness. */
const FULL = { [HIT_BALL]: 3, [HIT_CUSHION]: 3.5, [HIT_POCKET]: 1.5 } as Record<number, number>;
const LEVEL = { [HIT_BALL]: 0.85, [HIT_CUSHION]: 0.6, [HIT_POCKET]: 0.8 } as Record<number, number>;
/** No more than this many hits start within one frame: a break is loud, not a wall of noise. */
const HITS_PER_FRAME = 6;
/** Summed rolling speed (m/s) of the balls at which the rumble is at full level. */
const ROLL_FULL = 2.5;
const ROLL_LEVEL = 0.32;

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

function playbackSession() {
  const session = (navigator as AudioSessionNavigator).audioSession;
  try {
    // On iOS page audio otherwise follows the ringer switch.
    if (session && session.type !== "playback") session.type = "playback";
  } catch {
    /* the default session still plays */
  }
}

export function createSound(spriteUrl: string, firedUrl: string, onOpen: (open: boolean) => void) {
  let context: AudioContext | null = null;
  let output: GainNode | null = null;
  let sprite: AudioBuffer | null = null;
  let fired: AudioBuffer | null = null;
  // Where each clip really starts in the decoded sprite.
  const starts = new Map<Clip, number>();
  let rumble: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  let heardThisFrame = 0;

  const load = (made: AudioContext, url: string, done: (buffer: AudioBuffer) => void) => {
    fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error(`${url} answered ${response.status}`);
        return response.arrayBuffer();
      })
      .then((bytes) => made.decodeAudioData(bytes))
      .then(done)
      .catch((error: unknown) => console.error("Pool sound could not be loaded", error));
  };

  /** Finds each clip's first loud sample near where it was put, so decoder padding cannot clip an attack. */
  const locate = (buffer: AudioBuffer) => {
    const data = buffer.getChannelData(0);
    const rate = buffer.sampleRate;
    for (const clips of Object.values(SPRITE)) {
      for (const clip of clips) {
        const from = Math.max(0, Math.floor((clip.at - SLACK) * rate));
        const to = Math.min(data.length, Math.ceil((clip.at + SLACK) * rate));
        let found = clip.at;
        for (let i = from; i < to; i += 1) {
          if (Math.abs(data[i]) > 0.03) {
            found = i / rate - 0.002;
            break;
          }
        }
        starts.set(clip, found);
      }
    }
  };

  const unlock = () => {
    playbackSession();
    if (!context) {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      const made = new Context();
      context = made;
      made.onstatechange = () => onOpen(made.state === "running");
      // Many clicks at once in a break: a compressor keeps them from clipping.
      const limiter = made.createDynamicsCompressor();
      limiter.threshold.value = -10;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.15;
      output = made.createGain();
      output.gain.value = 0.9;
      // The compressor adds its own make-up gain; this takes it back under full scale.
      const trim = made.createGain();
      trim.gain.value = 0.7;
      output.connect(limiter).connect(trim).connect(made.destination);
      load(made, spriteUrl, (buffer) => {
        locate(buffer);
        sprite = buffer;
      });
      load(made, firedUrl, (buffer) => {
        fired = buffer;
      });
    }
    if (context.state !== "running") {
      void context.resume().catch(() => {});
      // Older iOS opens the output only once something has been started inside the gesture.
      try {
        const tick = context.createBufferSource();
        tick.buffer = context.createBuffer(1, 1, context.sampleRate);
        tick.connect(context.destination);
        tick.start();
      } catch {
        /* resume alone is enough elsewhere */
      }
    }
  };

  const ready = () => context !== null && output !== null && context.state === "running";

  const play = (clip: Clip, gain: number, rate: number, delay = 0) => {
    if (!context || !output || !sprite) return;
    const source = context.createBufferSource();
    source.buffer = sprite;
    source.playbackRate.value = rate;
    const level = context.createGain();
    level.gain.value = gain;
    source.connect(level).connect(output);
    source.onended = () => level.disconnect();
    source.start(context.currentTime + delay, starts.get(clip) ?? clip.at, clip.len);
  };

  const pick = (clips: Clip[]) => clips[Math.floor(Math.random() * clips.length)];

  return {
    unlock,
    /** Whether sound has been let out by the browser. */
    get running() {
      return ready();
    },
    /** Call once per frame before the frame's hits. */
    frame() {
      heardThisFrame = 0;
    },
    /** The cue's tip meeting the cue ball, power 0–1. */
    strike(power: number) {
      if (!ready()) return;
      play(pick(SPRITE.cue), 0.35 + 0.65 * power, 0.95 + Math.random() * 0.1);
    },
    /** One impact from the table: its kind and speed (m/s). */
    hit(kind: number, speed: number) {
      if (!ready() || heardThisFrame >= HITS_PER_FRAME) return;
      const loud = Math.min(1, speed / FULL[kind]) ** 0.75 * LEVEL[kind];
      if (loud < 0.015) return;
      heardThisFrame += 1;
      const clips = kind === HIT_BALL ? SPRITE.ball : kind === HIT_CUSHION ? SPRITE.cushion : SPRITE.pocket;
      // Harder hits ring a little higher, and no two clicks are quite alike.
      play(pick(clips), loud, 0.94 + Math.random() * 0.08 + Math.min(1, speed / 6) * 0.06);
    },
    /** "You're fired", `delay` seconds from now. */
    fired(delay: number) {
      if (!ready() || !context || !output || !fired) return;
      const source = context.createBufferSource();
      source.buffer = fired;
      source.connect(output);
      source.start(context.currentTime + delay);
    },
    /** The rumble of balls rolling on cloth, from their summed speed (m/s); 0 silences it. */
    roll(speed: number) {
      if (!context || !output) return;
      const level = ready() ? Math.min(1, speed / ROLL_FULL) ** 0.8 * ROLL_LEVEL : 0;
      if (!rumble) {
        if (level === 0 || !sprite) return;
        const clip = SPRITE.roll[0];
        const from = starts.get(clip) ?? clip.at;
        const source = context.createBufferSource();
        source.buffer = sprite;
        source.loop = true;
        source.loopStart = from;
        source.loopEnd = from + clip.len;
        // Cloth, not the wooden gully it was recorded in: only the low part of it.
        const soft = context.createBiquadFilter();
        soft.type = "lowpass";
        soft.frequency.value = 1100;
        const gain = context.createGain();
        gain.gain.value = 0;
        source.connect(soft).connect(gain).connect(output);
        source.start(context.currentTime, from + Math.random() * clip.len * 0.5);
        rumble = { source, gain };
      }
      rumble.gain.gain.setTargetAtTime(level, context.currentTime, 0.06);
      if (level === 0) {
        const ending = rumble;
        rumble = null;
        ending.source.stop(context.currentTime + 0.4);
        ending.source.onended = () => ending.gain.disconnect();
      }
    },
    close() {
      rumble?.source.stop();
      rumble = null;
      void context?.close().catch(() => {});
      context = null;
    },
  };
}
