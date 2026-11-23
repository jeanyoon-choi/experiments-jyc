import { voiceGains } from "./tilt";

// Every part's sound is one stereo track: the South on the left channel, the
// North on the right. A few video elements take turns playing the parts; each
// is split, its two sides weighed by the tilt and sent to both ears, and only
// the one playing is let through. One audio context serves them all. Browsers
// only let sound start from a touch or a key, so the videos play silent until
// `unlock` is called from one.

type AudioContextConstructor = typeof AudioContext;
type Line = { south: GainNode; north: GainNode; level: GainNode };

export function createVoices(videos: HTMLVideoElement[]) {
  let context: AudioContext | null = null;
  let lines: Line[] = [];
  let share = 0.5;
  let active = 0;

  const apply = () => {
    if (!context) return;
    const now = context.currentTime;
    const [southGain, northGain] = voiceGains(share);
    lines.forEach((line, index) => {
      line.south.gain.setTargetAtTime(southGain, now, 0.03);
      line.north.gain.setTargetAtTime(northGain, now, 0.03);
      line.level.gain.setTargetAtTime(index === active ? 1 : 0, now, 0.04);
    });
  };

  return {
    /** Builds the graph once. Returns whether there is sound to be had. */
    unlock() {
      if (!context) {
        const Context = window.AudioContext
          ?? (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
        if (!Context) return false;
        const created = new Context();
        context = created;
        const [southGain, northGain] = voiceGains(share);
        lines = videos.map((video, index) => {
          const source = created.createMediaElementSource(video);
          const splitter = created.createChannelSplitter(2);
          const south = created.createGain();
          const north = created.createGain();
          const level = created.createGain();
          source.connect(splitter);
          splitter.connect(south, 0);
          splitter.connect(north, 1);
          south.connect(level);
          north.connect(level);
          level.connect(created.destination);
          south.gain.value = southGain;
          north.gain.value = northGain;
          level.gain.value = index === active ? 1 : 0;
          return { south, north, level };
        });
      }
      void context.resume();
      return true;
    },
    /** share: 0 the South's sound alone, 1 the North's alone. */
    setShare(next: number) {
      if (Math.abs(next - share) < 0.002) return;
      share = next;
      apply();
    },
    /** Which of the videos is the one heard. */
    setActive(index: number) {
      if (index === active) return;
      active = index;
      apply();
    },
    close() {
      void context?.close();
      context = null;
      lines = [];
    },
  };
}
