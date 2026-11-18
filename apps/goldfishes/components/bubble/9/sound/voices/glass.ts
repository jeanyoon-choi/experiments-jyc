// 소리 · 유리 (user, 2026-10-12): one glassy FM tone, rendered through an offline WebAudio graph at
// each note it is asked for (a bank pitched from one low octave sounded wrong, the user said).
// The tick's noise is Math.random, so no two renders are the same sample for sample.

import { SYNTH_RATE } from "../synth.ts";

/** A glassy (ratio 3.5) or warm (ratio 2) FM tone with a tick at its start, rendered offline. */
export async function renderTone(frequency: number, glass: boolean, seconds: number) {
  const context = new OfflineAudioContext(1, Math.floor(SYNTH_RATE * seconds), SYNTH_RATE);
  const carrier = context.createOscillator();
  carrier.frequency.value = frequency;
  const modulator = context.createOscillator();
  modulator.frequency.value = frequency * (glass ? 3.5 : 2);
  const depth = context.createGain();
  depth.gain.setValueAtTime(frequency * (glass ? 2.6 : 1.1), 0);
  depth.gain.exponentialRampToValueAtTime(frequency * 0.02, seconds * 0.5);
  modulator.connect(depth).connect(carrier.frequency);
  const envelope = context.createGain();
  envelope.gain.setValueAtTime(0, 0);
  envelope.gain.linearRampToValueAtTime(1, 0.004);
  envelope.gain.exponentialRampToValueAtTime(0.0008, seconds);
  carrier.connect(envelope).connect(context.destination);
  // The tick: a few milliseconds of band-passed noise.
  const noise = context.createBuffer(1, Math.floor(SYNTH_RATE * 0.02), SYNTH_RATE);
  const data = noise.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  const tick = context.createBufferSource();
  tick.buffer = noise;
  const band = context.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = glass ? 9000 : 4500;
  band.Q.value = 4;
  const tickLevel = context.createGain();
  tickLevel.gain.setValueAtTime(0.35, 0);
  tickLevel.gain.exponentialRampToValueAtTime(0.002, 0.012);
  tick.connect(band).connect(tickLevel).connect(context.destination);
  carrier.start();
  modulator.start();
  tick.start();
  return context.startRendering();
}
