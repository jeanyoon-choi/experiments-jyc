import { voiceGains } from "./tilt";

// The video's sound is one stereo track: the South's anchor on the left
// channel, the North's on the right. The two are split, weighed by the tilt
// and sent to both ears. Browsers only let sound start from a touch or a key,
// so the video plays silent until `unlock` is called from one.

type AudioContextConstructor = typeof AudioContext;

export function createVoices(video: HTMLVideoElement) {
  let context: AudioContext | null = null;
  let south: GainNode | null = null;
  let north: GainNode | null = null;
  let share = 0.5;

  const apply = () => {
    if (!context || !south || !north) return;
    const [southGain, northGain] = voiceGains(share);
    south.gain.setTargetAtTime(southGain, context.currentTime, 0.03);
    north.gain.setTargetAtTime(northGain, context.currentTime, 0.03);
  };

  return {
    unlock() {
      if (!context) {
        const Context = window.AudioContext
          ?? (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
        if (!Context) return;
        context = new Context();
        const source = context.createMediaElementSource(video);
        const splitter = context.createChannelSplitter(2);
        south = context.createGain();
        north = context.createGain();
        source.connect(splitter);
        splitter.connect(south, 0);
        splitter.connect(north, 1);
        south.connect(context.destination);
        north.connect(context.destination);
        const [southGain, northGain] = voiceGains(share);
        south.gain.value = southGain;
        north.gain.value = northGain;
      }
      void context.resume();
      video.muted = false;
      void video.play().catch(() => undefined);
    },
    /** share: 0 the South's voice alone, 1 the North's alone. */
    setShare(next: number) {
      if (Math.abs(next - share) < 0.002) return;
      share = next;
      apply();
    },
    close() {
      void context?.close();
      context = null;
    },
  };
}
