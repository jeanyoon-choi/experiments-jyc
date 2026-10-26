// The upstream press and hit sounds in one audio context. A press sounds once
// for the whole race; hits sound only for rows on screen, at most one voice
// per frame, so a hundred runners stay listenable.
import assets from "./source/assets.json";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

type SoundName = keyof typeof assets.sounds;

function decodeDataUri(uri: string) {
  const binary = atob(uri.slice(uri.indexOf(",") + 1));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1)
    bytes[index] = binary.charCodeAt(index);
  return bytes.buffer;
}

export function createRaceAudio() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  const context = new AudioContextClass();
  const buffers = new Map<SoundName, AudioBuffer>();
  for (const name of Object.keys(assets.sounds) as SoundName[]) {
    context
      .decodeAudioData(decodeDataUri(assets.sounds[name]))
      .then((buffer) => buffers.set(name, buffer))
      .catch(() => {});
  }

  return {
    // Called inside a trusted gesture; touch grants permission on release,
    // so every gesture retries until the context runs.
    unlock() {
      if (context.state !== "running") context.resume().catch(() => {});
    },
    play(name: SoundName, volume = 1) {
      const buffer = buffers.get(name);
      if (!buffer || context.state !== "running") return;
      const voice = context.createBufferSource();
      const gain = context.createGain();
      gain.gain.value = volume;
      voice.buffer = buffer;
      voice.connect(gain).connect(context.destination);
      voice.start();
    },
    close() {
      context.close().catch(() => {});
    },
  };
}
