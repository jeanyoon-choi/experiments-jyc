// Life-event sounds for the love society, played from real recordings (small mono MP3 takes in
// /assets/finger-network/sound, cut by scripts/cut-finger-network-sounds.py; sources in the experiment doc).
//
// - kiss: when a new couple's faces meet;
// - slap: each of the two slaps when a couple parts;
// - shatter: a betrayal breaks the heart like glass;
// - cry: a newborn, a year after its parents lay down together;
// - breath: a touch-born person's first breath as it settles;
// - requiem: the opening of Chopin's funeral march when someone dies.
// Playback picks a take other than the last one, varies its speed slightly, and pans it to where the event
// happens. Each kind is spaced and voices are capped, so a population explosion thins the sound instead of
// piling it up.

type Kind = "kiss" | "slap" | "shatter" | "cry" | "breath" | "requiem";

const takes: Record<Kind, number> = { kiss: 8, slap: 6, shatter: 2, cry: 4, breath: 3, requiem: 1 };
const minimumGap: Record<Kind, number> = { kiss: 0.09, slap: 0.06, shatter: 0.15, cry: 0.3, breath: 0.1, requiem: 12 };
const level: Record<Kind, number> = { kiss: 1, slap: 0.9, shatter: 0.7, cry: 0.6, breath: 0.8, requiem: 0.55 };
const speedSpread: Record<Kind, number> = { kiss: 0.05, slap: 0.06, shatter: 0.06, cry: 0.03, breath: 0.03, requiem: 0 };
const maximumVoices = 10;
const folder = "/assets/finger-network/sound";

export type LifeSound = ReturnType<typeof createLifeSound>;

export function createLifeSound() {
  let context: AudioContext | null = null;
  let output: GainNode | null = null;
  let voices = 0;
  const encoded = new Map<string, Promise<ArrayBuffer | null>>();
  const pools = new Map<Kind, AudioBuffer[]>();
  const lastTake = new Map<Kind, AudioBuffer>();
  const lastPlayed = new Map<Kind, number>();

  // Fetch the files right away (about 280 KB in all); decoding waits for an AudioContext.
  for (const kind of Object.keys(takes) as Kind[]) {
    for (let index = 1; index <= takes[kind]; index += 1) {
      const name = `${kind}-${index}`;
      encoded.set(name, fetch(`${folder}/${name}.mp3`).then((response) => (response.ok ? response.arrayBuffer() : null)).catch(() => null));
    }
  }

  const build = () => {
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    const audio = new Context({ latencyHint: "interactive" });
    const limiter = audio.createDynamicsCompressor();
    limiter.threshold.value = -6;
    limiter.knee.value = 4;
    limiter.ratio.value = 12;
    limiter.attack.value = 0.002;
    limiter.release.value = 0.2;
    limiter.connect(audio.destination);
    output = audio.createGain();
    output.connect(limiter);
    context = audio;
    for (const [name, data] of encoded) {
      const kind = name.slice(0, name.lastIndexOf("-")) as Kind;
      void data.then(async (buffer) => {
        if (!buffer || !context) return;
        try {
          const decoded = await context.decodeAudioData(buffer.slice(0));
          pools.set(kind, [...(pools.get(kind) ?? []), decoded]);
        } catch {
          // A take that fails to decode is simply left out.
        }
      });
    }
  };

  /** Call from a user gesture: browsers only let audio start after one. */
  const unlock = () => {
    if (!context) build();
    if (context && context.state !== "running" && context.state !== "closed") void context.resume();
  };

  const play = (kind: Kind, pan: number) => {
    if (!context || !output || context.state !== "running") return;
    const pool = pools.get(kind);
    if (!pool || pool.length === 0) return;
    const now = context.currentTime;
    if (voices >= maximumVoices || now - (lastPlayed.get(kind) ?? -Infinity) < minimumGap[kind]) return;
    const choices = pool.length > 1 ? pool.filter((take) => take !== lastTake.get(kind)) : pool;
    const take = choices[Math.floor(Math.random() * choices.length)]!;
    lastTake.set(kind, take);
    lastPlayed.set(kind, now);
    const source = context.createBufferSource();
    source.buffer = take;
    source.playbackRate.value = 1 + (Math.random() * 2 - 1) * speedSpread[kind];
    const gain = context.createGain();
    gain.gain.value = level[kind];
    const panner = context.createStereoPanner();
    panner.pan.value = kind === "requiem" ? 0 : Math.max(-0.8, Math.min(0.8, pan));
    source.connect(gain).connect(panner).connect(output);
    voices += 1;
    source.onended = () => {
      voices -= 1;
      panner.disconnect();
    };
    source.start(now + 0.005);
  };

  return {
    unlock,
    kiss: (pan: number) => play("kiss", pan),
    slap: (pan: number) => play("slap", pan),
    shatter: (pan: number) => play("shatter", pan),
    cry: (pan: number) => play("cry", pan),
    breath: (pan: number) => play("breath", pan),
    requiem: () => play("requiem", 0),
    close: () => {
      void context?.close();
      context = null;
    },
  };
}
