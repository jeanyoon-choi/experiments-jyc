import type { Tier } from "../feed/types";

// The sounds of a news app on a mobile, synthesised (interface tones, not
// recordings of anything):
// - `tick`: a piece arriving at the top of the list. A soft blip that gets
//   higher, louder and harsher with the tier. Pieces closer together than
//   TICK_GAP_MS share one, as a mobile coalesces them.
// - `alert`: the mobile reaching a further tier. 강경 a single push-alert
//   ding, 극단 two, 선동 the three rising notes of a 속보, 광란 the buzzing
//   two-tone of an emergency alert. Each lasts under a second and plays once
//   per step up, never on the way back down.
// Browsers start audio only after a gesture, so `unlock` runs on the first
// tap or key.

const TICK_GAP_MS = 90;
const ALERT_GAP_MS = 600;

export function createSound() {
  let context: AudioContext | null = null;
  let out: GainNode | null = null;
  let lastTick = 0;
  let lastAlert = 0;

  const unlock = () => {
    if (!context) {
      const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Context) return;
      context = new Context();
      out = context.createGain();
      out.gain.value = 0.5;
      out.connect(context.destination);
    }
    if (context.state === "suspended") void context.resume();
  };

  /** One enveloped note: a quick strike and a decay over `length` seconds. */
  const note = (audio: AudioContext, to: AudioNode, type: OscillatorType, frequency: number, at: number, length: number, level: number) => {
    const tone = audio.createOscillator();
    const gain = audio.createGain();
    tone.type = type;
    tone.frequency.value = frequency;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level, at + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0008, at + length);
    tone.connect(gain).connect(to);
    tone.start(at);
    tone.stop(at + length + 0.02);
  };

  const ready = () => (context && out && context.state === "running" ? { audio: context, to: out } : null);

  return {
    unlock,

    /** A piece arrived. */
    tick(tier: Tier) {
      const live = ready();
      const now = performance.now();
      if (!live || now - lastTick < TICK_GAP_MS) return;
      lastTick = now;
      const at = live.audio.currentTime + 0.005;
      note(live.audio, live.to, tier >= 4 ? "square" : tier >= 3 ? "triangle" : "sine", 620 + tier * 170, at, 0.05 + tier * 0.008, 0.07 + tier * 0.03);
    },

    /** The mobile reached a further tier. */
    alert(tier: Tier) {
      const live = ready();
      const now = performance.now();
      if (!live || tier < 1 || now - lastAlert < ALERT_GAP_MS) return;
      lastAlert = now;
      const { audio, to } = live;
      const at = audio.currentTime + 0.01;
      if (tier === 1) {
        note(audio, to, "sine", 1174.7, at, 0.4, 0.3);
      } else if (tier === 2) {
        note(audio, to, "sine", 1174.7, at, 0.3, 0.32);
        note(audio, to, "sine", 1568, at + 0.13, 0.42, 0.32);
      } else if (tier === 3) {
        // 속보: three rising notes, struck hard.
        [880, 1108.7, 1480].forEach((frequency, index) => {
          note(audio, to, "triangle", frequency, at + index * 0.11, 0.3, 0.5);
          note(audio, to, "sine", frequency * 2, at + index * 0.11, 0.2, 0.12);
        });
      } else {
        // 긴급 경보: two close tones buzzing together, in four bursts.
        const filter = audio.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.value = 3200;
        filter.connect(to);
        for (let burst = 0; burst < 4; burst += 1) {
          const start = at + burst * 0.22;
          for (const frequency of [853, 960]) {
            const tone = audio.createOscillator();
            const gain = audio.createGain();
            tone.type = "sawtooth";
            tone.frequency.value = frequency;
            gain.gain.setValueAtTime(0, start);
            gain.gain.linearRampToValueAtTime(0.3, start + 0.008);
            gain.gain.setValueAtTime(0.3, start + 0.14);
            gain.gain.linearRampToValueAtTime(0, start + 0.16);
            tone.connect(gain).connect(filter);
            tone.start(start);
            tone.stop(start + 0.18);
          }
        }
      }
    },

    close() {
      void context?.close();
      context = null;
      out = null;
    },
  };
}
