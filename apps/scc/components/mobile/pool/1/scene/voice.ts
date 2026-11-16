/** One short recording, played each time it is called for; overlapping calls overlap. */
export function createVoice(url: string) {
  let context: AudioContext | null = null;
  let recording: AudioBuffer | null = null;

  /** Browsers only let sound start from a touch: call this from one. */
  const unlock = () => {
    if (context) {
      if (context.state === "suspended") void context.resume();
      return;
    }
    const Context = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Context) return;
    const made = new Context();
    context = made;
    fetch(url)
      .then((response) => response.arrayBuffer())
      .then((bytes) => made.decodeAudioData(bytes))
      .then((decoded) => {
        recording = decoded;
      })
      .catch(() => {});
  };

  /** Plays the recording `delay` seconds from now. */
  const say = (delay = 0) => {
    if (!context || !recording) return;
    const source = context.createBufferSource();
    source.buffer = recording;
    source.connect(context.destination);
    source.start(context.currentTime + delay);
  };

  const close = () => {
    void context?.close();
    context = null;
  };

  return { unlock, say, close };
}
