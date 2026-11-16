// The clip's sound, played through Web Audio from its own file. An audio
// context resumed inside a tap stays allowed to sound afterwards. While it is
// live the video is muted and only gives picture; whenever it is not, the
// caller lets the video's own sound through instead.

// The reel is already levelled (peaks just under full scale): full gain at the
// widest mouth.
const GAIN = 1;
// How quickly loudness follows the mouth, seconds.
const FOLLOW = 0.04;
const RAMP = 0.012;
/** Picture and sound further apart than this (seconds) are lined up again. */
const DRIFT = 0.25;

type AudioSessionNavigator = Navigator & { audioSession?: { type: string } };

// iOS: sound like a video does, through the speaker and also with the ringer
// switched to silent, while the camera is running.
function setPlaybackSession() {
  const session = (navigator as AudioSessionNavigator).audioSession;
  try {
    if (session && session.type !== "playback") session.type = "playback";
  } catch { /* the default session still plays */ }
}

type Voice = { source: AudioBufferSourceNode; gain: GainNode; offset: number; startedAt: number };

export type ClipSound = NonNullable<ReturnType<typeof createClipSound>>;

/** Call inside a tap. Returns null where Web Audio does not exist. */
export function createClipSound(url: string) {
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return null;
  setPlaybackSession();
  const context = new Context();
  let buffer: AudioBuffer | null = null;
  let voice: Voice | null = null;
  let failed = false;
  let lastResume = 0;

  fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`Clip sound answered ${response.status}`);
      return response.arrayBuffer();
    })
    .then((data) => context.decodeAudioData(data))
    .then((decoded) => { buffer = decoded; })
    .catch((error: unknown) => {
      console.error("Politician lie sound could not be decoded", error);
      failed = true;
    });

  const stop = () => {
    if (!voice) return;
    const { source, gain } = voice;
    voice = null;
    const now = context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0, now, RAMP);
    source.stop(now + RAMP * 5);
    source.onended = () => { source.disconnect(); gain.disconnect(); };
  };

  const start = (at: number, level: number) => {
    if (!buffer) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    const now = context.currentTime;
    const offset = ((at % buffer.duration) + buffer.duration) % buffer.duration;
    source.buffer = buffer;
    source.loop = true;
    gain.gain.setValueAtTime(0, now);
    gain.gain.setTargetAtTime(GAIN * level, now, RAMP);
    source.connect(gain).connect(context.destination);
    source.start(now, offset);
    voice = { source, gain, offset, startedAt: now };
  };

  return {
    /** Whether the sound can be heard this way right now; if not, the caller uses the video's own. */
    get live() { return buffer !== null && context.state === "running"; },
    /** Inside a tap: lets the context sound, also after the page was left and returned to. */
    unlock() {
      setPlaybackSession();
      if (context.state !== "running") void context.resume().catch(() => {});
      // One silent sample started inside the tap: what iOS needs before it lets the context out.
      try {
        const kick = context.createBufferSource();
        kick.buffer = context.createBuffer(1, 1, context.sampleRate);
        kick.connect(context.destination);
        kick.start();
      } catch { /* resume alone is enough elsewhere */ }
    },
    /** One line of state, for the ?sound readout. */
    describe() {
      const session = (navigator as AudioSessionNavigator).audioSession;
      return `context ${context.state} ${context.sampleRate} · buffer ${buffer ? buffer.duration.toFixed(1) : failed ? "failed" : "loading"} · voice ${voice ? "on" : "off"} · session ${session ? session.type : "none"}`;
    },
    /**
     * Once per frame: `audible` is whether the clip is running, `at` its
     * current time and `level` (0–1) how loud, from how far the mouth is open.
     * Starts, stops, and keeps the sound on the picture.
     */
    follow(audible: boolean, at: number, now: number, level: number) {
      if (!audible || failed) {
        stop();
        return;
      }
      if (context.state !== "running") {
        // Suspended or interrupted (a call, the page left): ask again, sparingly.
        if (now - lastResume > 500) {
          lastResume = now;
          void context.resume().catch(() => {});
        }
        stop();
        return;
      }
      if (!buffer) return;
      if (voice) {
        const playing = (voice.offset + context.currentTime - voice.startedAt) % buffer.duration;
        const apart = Math.abs(playing - (at % buffer.duration));
        if (Math.min(apart, buffer.duration - apart) < DRIFT) {
          voice.gain.gain.setTargetAtTime(GAIN * level, context.currentTime, FOLLOW);
          return;
        }
        stop();
      }
      start(at, level);
    },
    stop,
    close() {
      stop();
      void context.close().catch(() => {});
    },
  };
}
