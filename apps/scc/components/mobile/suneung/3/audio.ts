// Key clicks for the swarm's typing, synthesized (no files): a few ms of
// band-passed noise for the key's click and a short low sine for its body,
// each at its own pitch and level, so parallel writers rattle rather than
// drone. Browsers hold audio until a person's first gesture; the context is
// opened then. Clicks closer together than MIN_GAP are dropped, so many
// writers at once stay a rattle and never a buzz.

const MIN_GAP = 0.016;
const LEVEL = 0.16;

let context: AudioContext | null = null;
let noise: AudioBuffer | null = null;
let last = 0;

function open() {
  if (context) {
    void context.resume();
    return;
  }
  const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Context) return;
  context = new Context();
  noise = context.createBuffer(1, Math.ceil(context.sampleRate * 0.03), context.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (data.length * 0.18));
}

const gestures = ["pointerdown", "touchstart", "keydown"] as const;

/** Opens audio on the first gesture; returns a function that stops listening. */
export function listenForGesture() {
  const on = () => open();
  for (const type of gestures) window.addEventListener(type, on, { passive: true });
  return () => {
    for (const type of gestures) window.removeEventListener(type, on);
  };
}

/** One key. `pitch` shifts it (0.6 for a softer, lower key). */
export function click(pitch = 1) {
  if (!context || !noise || context.state !== "running") return;
  const t = context.currentTime;
  if (t - last < MIN_GAP) return;
  last = t;
  const level = LEVEL * (0.6 + 0.4 * Math.random());

  const source = context.createBufferSource();
  source.buffer = noise;
  source.playbackRate.value = 0.85 + 0.3 * Math.random();
  const band = context.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = (2200 + 2400 * Math.random()) * pitch;
  band.Q.value = 1.4;
  const gain = context.createGain();
  gain.gain.setValueAtTime(level, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
  source.connect(band).connect(gain).connect(context.destination);
  source.start(t);
  source.stop(t + 0.035);

  const body = context.createOscillator();
  body.frequency.value = (140 + 60 * Math.random()) * pitch;
  const bodyGain = context.createGain();
  bodyGain.gain.setValueAtTime(level * 0.5, t);
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);
  body.connect(bodyGain).connect(context.destination);
  body.start(t);
  body.stop(t + 0.025);
}
