// The in-app message sound. KakaoTalk's own '카톡' voice is Kakao's registered
// sound mark, so it is not shipped here: a recording the user supplies at
// SOUND_URL plays when present; otherwise a short two-note chime in the
// manner of the app's 알림음 category. Browsers start audio only after a
// gesture, so `unlock` runs on the first tap or key.

const SOUND_URL = "/audio/kakao-talk/notify.m4a";
/** Messages closer together than this share one sound, as a phone coalesces them. */
const MIN_GAP_MS = 220;

export function createNotifier() {
  let context: AudioContext | null = null;
  let sample: AudioBuffer | null = null;
  let probed = false;
  let last = 0;

  const unlock = () => {
    if (!context) {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      context = new Context();
    }
    if (context.state === "suspended") void context.resume();
    if (!probed) {
      probed = true;
      const audio = context;
      fetch(SOUND_URL)
        .then((response) => (response.ok ? response.arrayBuffer() : null))
        .then((data) => (data ? audio.decodeAudioData(data) : null))
        .then((buffer) => { sample = buffer; })
        .catch(() => { sample = null; });
    }
  };

  const chime = (audio: AudioContext) => {
    const start = audio.currentTime + 0.01;
    const out = audio.createGain();
    out.gain.value = 0.22;
    out.connect(audio.destination);
    // Two bright sine notes, the second a fourth higher, each with a quick
    // strike and a soft tail.
    ([[1046.5, 0], [1396.9, 0.11]] as const).forEach(([frequency, offset]) => {
      const tone = audio.createOscillator();
      const overtone = audio.createOscillator();
      const gain = audio.createGain();
      tone.type = "sine";
      overtone.type = "sine";
      tone.frequency.value = frequency;
      overtone.frequency.value = frequency * 2;
      const at = start + offset;
      gain.gain.setValueAtTime(0, at);
      gain.gain.linearRampToValueAtTime(1, at + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.001, at + 0.32);
      const overtoneGain = audio.createGain();
      overtoneGain.gain.value = 0.18;
      tone.connect(gain);
      overtone.connect(overtoneGain).connect(gain);
      gain.connect(out);
      tone.start(at);
      overtone.start(at);
      tone.stop(at + 0.34);
      overtone.stop(at + 0.34);
    });
  };

  return {
    unlock,
    play() {
      if (!context || context.state !== "running") return;
      const now = performance.now();
      if (now - last < MIN_GAP_MS) return;
      last = now;
      if (sample) {
        const source = context.createBufferSource();
        source.buffer = sample;
        source.connect(context.destination);
        source.start();
      } else {
        chime(context);
      }
    },
    close() {
      void context?.close();
      context = null;
    },
  };
}
