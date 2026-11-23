// The table's sound: real recordings of balls, cushions and a rolling ball, cut from pool/1's sprite
// (`table.mp3`, which also holds a cue and a pocket that this table has no use for).
//
// Browsers let a page sound only after a gesture they accept, and this page does not ask for one:
// `unlock` is called from every gesture event, and the table is silent until the first touch that
// the browser accepts (on iOS Safari a tap, never a touch that moved: WebKit bug 248265).

import { HIT_BALL, HIT_CUSHION } from "../model/physics";

type Clip = { at: number; len: number };
/** Where each recording sits in the sprite (seconds), as built from the source pack. */
const SPRITE: Record<"ball" | "cushion" | "roll", Clip[]> = {
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
  roll: [{ at: 4.0487, len: 2.0 }],
};
/** The silence either side of a clip in the sprite: decoders may shift it by up to this much. */
const SLACK = 0.06;
/**
 * Impact speed (m/s) at which each kind of hit is at full loudness: what a hard shake gives on
 * this table's gravity. Below it loudness falls a little faster than the speed does, as a struck
 * ball's does, so a table barely tipped ticks and a shaken one cracks.
 */
const FULL = { [HIT_BALL]: 1.5, [HIT_CUSHION]: 1.7 } as Record<number, number>;
const HIT_CURVE = 1.25;
const LEVEL = { [HIT_BALL]: 0.85, [HIT_CUSHION]: 0.6 } as Record<number, number>;
/** No more than this many hits start within one frame: a heap landing is loud, not a wall of noise. */
const HITS_PER_FRAME = 6;
const ROLL_LEVEL = 0.36;
/** The rumble is dull when the balls creep and opens up as they run (Hz). */
const ROLL_DULL = 420;
const ROLL_OPEN = 1700;
/** Everything is a little quieter on a table that is barely moving: the output's level at rest. */
const CALM = 0.55;

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

export function createSound(spriteUrl: string) {
  let context: AudioContext | null = null;
  let output: GainNode | null = null;
  let sprite: AudioBuffer | null = null;
  // Where each clip really starts in the decoded sprite.
  const starts = new Map<Clip, number>();
  let rumble: { source: AudioBufferSourceNode; soft: BiquadFilterNode; gain: GainNode } | null = null;
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
      // Many clicks at once when a heap lands: a compressor keeps them from clipping.
      const limiter = made.createDynamicsCompressor();
      // Only the peaks: a hard limiter would flatten the difference between a tick and a crack.
      limiter.threshold.value = -6;
      limiter.ratio.value = 4;
      limiter.attack.value = 0.002;
      limiter.release.value = 0.15;
      output = made.createGain();
      output.gain.value = CALM;
      // The compressor adds its own make-up gain; this takes it back under full scale.
      const trim = made.createGain();
      trim.gain.value = 0.7;
      output.connect(limiter).connect(trim).connect(made.destination);
      load(made, spriteUrl, (buffer) => {
        locate(buffer);
        sprite = buffer;
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

  const play = (clip: Clip, gain: number, rate: number) => {
    if (!context || !output || !sprite) return;
    const source = context.createBufferSource();
    source.buffer = sprite;
    source.playbackRate.value = rate;
    const level = context.createGain();
    level.gain.value = gain;
    source.connect(level).connect(output);
    source.onended = () => level.disconnect();
    source.start(context.currentTime, starts.get(clip) ?? clip.at, clip.len);
  };

  const pick = (clips: Clip[]) => clips[Math.floor(Math.random() * clips.length)];

  return {
    unlock,
    /** Call once per frame before the frame's hits. */
    frame() {
      heardThisFrame = 0;
    },
    /** One impact from the table: its kind and speed (m/s). */
    hit(kind: number, speed: number) {
      if (!ready() || heardThisFrame >= HITS_PER_FRAME) return;
      const hard = Math.min(1, speed / FULL[kind]);
      const loud = hard ** HIT_CURVE * LEVEL[kind];
      if (loud < 0.006) return;
      heardThisFrame += 1;
      const clips = kind === HIT_BALL ? SPRITE.ball : SPRITE.cushion;
      // Harder hits ring a little higher, and no two clicks are quite alike.
      play(pick(clips), loud, 0.93 + Math.random() * 0.06 + hard * 0.08);
    },
    /**
     * How hard the table is being changed, 0 (at rest) to 1 (shaken): the rumble of balls rolling on
     * cloth and the level of everything follow it.
     */
    stir(amount: number) {
      if (!context || !output) return;
      const now = context.currentTime;
      const open = ready() ? Math.min(1, Math.max(0, amount)) : 0;
      output.gain.setTargetAtTime(CALM + (1 - CALM) * open, now, 0.12);
      const level = open ** 1.1 * ROLL_LEVEL;
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
        soft.frequency.value = ROLL_DULL;
        const gain = context.createGain();
        gain.gain.value = 0;
        source.connect(soft).connect(gain).connect(output);
        source.start(now, from + Math.random() * clip.len * 0.5);
        rumble = { source, soft, gain };
      }
      rumble.gain.gain.setTargetAtTime(level, now, 0.08);
      rumble.soft.frequency.setTargetAtTime(ROLL_DULL + (ROLL_OPEN - ROLL_DULL) * open, now, 0.1);
      if (level === 0) {
        const ending = rumble;
        rumble = null;
        ending.source.stop(now + 0.5);
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
