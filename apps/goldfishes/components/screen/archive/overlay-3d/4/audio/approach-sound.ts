import { loadApproachSamples } from "./approach-samples";

type Voice = { gain: GainNode; pan: StereoPannerNode; source: AudioBufferSourceNode | null };

/** Short, unpitched fragments of one real pond recording. No oscillator fallback. */
export class ApproachSound {
  private readonly context = new AudioContext({ latencyHint: "interactive" });
  private readonly master = this.context.createGain();
  private readonly abort = new AbortController();
  private readonly voices: Voice[] = [];
  private samples: AudioBuffer[] = [];
  private loading: Promise<void> | null = null;
  private enabled = false;
  private disposed = false;
  private revision = 0;
  private volume = 0.35;
  private nextAt = 0;
  private lastEntry = 0;
  private pressure = 0;
  private cursor = 0;
  private readonly targetTimes = new Float64Array(4096).fill(-Infinity);

  constructor() {
    const c = this.context;
    const compressor = c.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.knee.value = 12;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.006;
    compressor.release.value = 0.12;
    compressor.connect(this.master);
    this.master.connect(c.destination);
    this.master.gain.value = 0;
    for (let i = 0; i < 8; i++) {
      const gain = c.createGain();
      const pan = c.createStereoPanner();
      gain.connect(pan);
      pan.connect(compressor);
      this.voices.push({ gain, pan, source: null });
    }
  }

  async enable() {
    if (this.disposed || this.enabled && this.context.state === "running") return;
    const revision = this.revision;
    // Resume is invoked synchronously in the gesture; fetching must not consume
    // activation first. One local fetch/decode, never on individual arrivals.
    const resume = this.context.resume();
    if (!this.loading) {
      this.loading = loadApproachSamples(this.context, this.abort.signal)
        .then(samples => { if (!this.disposed) this.samples = samples; })
        .catch(error => { this.loading = null; throw error; });
    }
    await Promise.all([resume, this.loading]);
    if (this.disposed || revision !== this.revision) return;
    this.enabled = this.context.state === "running";
    if (this.enabled) this.master.gain.setTargetAtTime(this.volume / 0.7, this.context.currentTime, 0.025);
  }

  async pause() {
    if (this.disposed) return;
    this.revision++;
    this.enabled = false;
    this.master.gain.cancelScheduledValues(this.context.currentTime);
    this.master.gain.value = 0;
    for (const voice of this.voices) {
      if (voice.source) {
        voice.source.onended = null;
        voice.source.stop();
        voice.source.disconnect();
        voice.source = null;
      }
    }
    this.pressure = 0;
    this.nextAt = this.lastEntry = this.context.currentTime;
    this.targetTimes.fill(-Infinity);
    await this.context.suspend();
  }

  setVolume(value: number) {
    this.volume = Number.isFinite(value) ? Math.max(0, Math.min(0.7, value)) : 0;
    if (this.enabled) this.master.gain.setTargetAtTime(this.volume / 0.7, this.context.currentTime, 0.025);
  }

  play(target: number, position: number, speed: number) {
    if (!this.enabled || this.context.state !== "running" || !this.samples.length) return;
    if (!Number.isInteger(target) || target < 0 || target >= this.targetTimes.length) return;
    const now = this.context.currentTime;
    this.pressure = Math.min(80, this.pressure * Math.exp(-(now - this.lastEntry) / 1.4) + 1);
    this.lastEntry = now;
    if (now < this.nextAt || now - this.targetTimes[target]! < 0.16) return;
    const voice = this.voices.find(v => v.source === null);
    if (!voice) return;
    const motion = Number.isFinite(speed) ? Math.max(0, Math.min(1, speed / 44)) : 0;
    const density = Math.min(1, this.pressure / 30);
    const source = this.context.createBufferSource();
    // Traverse adjacent fragments of the SAME material. No note/pitch mapping,
    // random SFX families, resonant bubble synth, reverse or time stretching.
    source.buffer = this.samples[this.cursor++ % this.samples.length]!;
    this.cursor %= this.samples.length;
    source.connect(voice.gain);
    voice.gain.gain.setValueAtTime((0.48 + motion * 0.16) / Math.sqrt(1 + density * 2), now);
    voice.pan.pan.setValueAtTime(Number.isFinite(position) ?
      (Math.max(0, Math.min(1, position)) - 0.5) * 0.5 : 0, now);
    voice.source = source;
    source.onended = () => {
      source.disconnect();
      source.onended = null;
      if (voice.source === source) voice.source = null;
    };
    this.nextAt = now + 0.075;
    this.targetTimes[target] = now;
    source.start(now + 0.005);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.revision++;
    this.enabled = false;
    this.abort.abort();
    for (const voice of this.voices) {
      if (voice.source) {
        voice.source.onended = null;
        voice.source.stop();
        voice.source.disconnect();
        voice.source = null;
      }
    }
    this.samples = [];
    void this.context.close().catch(() => undefined);
  }
}
