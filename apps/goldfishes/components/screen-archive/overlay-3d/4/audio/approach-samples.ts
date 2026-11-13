/** Source/license and editing history: docs/0908/overlay-4.md. */
export async function loadApproachSamples(context: AudioContext, signal: AbortSignal) {
  const response = await fetch("/assets/goldfishes/audio/overlay-4/pond-feeding.wav", { signal });
  if (!response.ok) throw new Error("Pond recording unavailable");
  const decoded = await context.decodeAudioData(await response.arrayBuffer());
  if (signal.aborted) throw new Error("Audio disposed");
  if (decoded.duration < 20) throw new Error("Incomplete pond recording");
  const data = decoded.getChannelData(0);
  const rate = decoded.sampleRate;
  const samples: AudioBuffer[] = [];
  // Fixed bank, prepared once. Keep natural microstructure; smooth cut edges
  // and exclude the loudest isolated impacts rather than inventing bubble pops.
  for (let i = 0; i < 32; i++) {
    const count = Math.round(rate * (0.24 + (i % 3) * 0.025));
    const start = Math.floor((i + 0.25) * (data.length - count) / 32);
    let mean = 0;
    for (let j = 0; j < count; j++) mean += data[start + j]!;
    mean /= count;
    let energy = 0;
    let peak = 0;
    for (let j = 0; j < count; j++) {
      const value = data[start + j]! - mean;
      energy += value * value;
      peak = Math.max(peak, Math.abs(value));
    }
    const rms = Math.sqrt(energy / count);
    if (rms < 0.00001 || peak / rms > 12) continue;
    const level = Math.min(8, 0.085 / rms, 0.6 / Math.max(peak, 0.00001));
    const buffer = context.createBuffer(1, count, rate);
    const output = buffer.getChannelData(0);
    for (let j = 0; j < count; j++) {
      const fadeIn = Math.min(1, j / (rate * 0.025));
      const fadeOut = Math.min(1, (count - 1 - j) / (rate * 0.075));
      const window = (0.5 - 0.5 * Math.cos(Math.PI * fadeIn)) *
        (0.5 - 0.5 * Math.cos(Math.PI * fadeOut));
      output[j] = (data[start + j]! - mean) * level * window;
    }
    samples.push(buffer);
  }
  if (!samples.length) throw new Error("No usable pond fragments");
  return samples;
}
