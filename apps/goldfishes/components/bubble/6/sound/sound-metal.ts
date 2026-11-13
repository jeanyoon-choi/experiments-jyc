// 소리 · 금속 (user, 2026-10-26): the objects' own material — the polished chrome /
// aluminium / steel of 크롬 — as sound. Same chord, pan buses, echoes and room as
// 유리, but its own sources and gestures.
//
// Two tries tuned a bell's overtones (a vibraphone bar, then stretched and beating
// partials with a sheen) and played them with 유리's gestures: "유리랑 금속이랑 지금
// 너무 같음 … 전혀 메탈릭 하지가 않음" (user). So 금속 is built instead from what
// synthesis has long used to say "metal":
//   - FM at an irrational ratio (√2, √3) whose index stays up — 유리's index falls
//     to a sine within half its length; here the clang never resolves;
//   - ring modulation, for sidebands that belong to no harmonic series;
//   - the TR-808's metal: six square waves at inharmonic ratios through a band-pass
//     (its cymbal and cowbell) — the "tsss" of a struck sheet;
//   - a stiff pipe: a waveguide whose loop runs through all-pass filters, so its
//     overtones run sharp (dispersion), as in a struck tube;
//   - a spring's chirp: the "dwang" of a spring reverb, a sweep falling through the
//     coil again and again.
// Gestures (sound.ts): leaders a steel beam with a spring's chirp, the middle a pipe,
// the small an aluminium clang or tink; 부서짐 is a chain's rattle, off the beat.

import { addClick, bandpass, fadeOut, midiToHz, normalise, random, SYNTH_RATE } from "./synth.ts";

const TAU = 2 * Math.PI;
/** The TR-808 cymbal's six oscillator ratios (its 205.3–800 Hz square waves, over the lowest). */
const CLUSTER = [1, 1.483, 1.932, 2.546, 2.63, 3.897] as const;

/** Six band-limited square waves at the 808's ratios over `base`, band-passed, decaying with `decay`, added at `level`. */
function addCluster(out: Float32Array, base: number, centre: number, decay: number, level: number) {
  const cluster = new Float32Array(Math.min(out.length, Math.ceil(decay * 7 * SYNTH_RATE)));
  for (const ratio of CLUSTER) {
    const frequency = base * ratio;
    for (let harmonic = 1; frequency * harmonic < SYNTH_RATE * 0.45; harmonic += 2) {
      const w = (TAU * frequency * harmonic) / SYNTH_RATE;
      const c = 2 * Math.cos(w);
      let y1 = 0;
      let y2 = -Math.sin(w) / harmonic;
      for (let index = 0; index < cluster.length; index += 1) {
        const y = c * y1 - y2;
        cluster[index]! += y;
        y2 = y1;
        y1 = y;
      }
    }
  }
  bandpass(cluster, centre, 0.9);
  bandpass(cluster, centre * 1.3, 0.9);
  let peak = 1e-9;
  for (const value of cluster) peak = Math.max(peak, Math.abs(value));
  for (let index = 0; index < cluster.length; index += 1) out[index]! += (cluster[index]! / peak) * level * Math.exp(-index / (decay * SYNTH_RATE));
}

type Clang = {
  /** Modulator over carrier: irrational, so the sidebands never fall on harmonics. */
  ratio: number;
  /** FM index at the strike and the one it holds. */
  strike: number;
  hold: number;
  /** Ring modulator over the note, and its depth. */
  ring: number;
  ringLevel: number;
  cluster: readonly [base: number, centre: number, decay: number, level: number];
  click: readonly [frequency: number, q: number, level: number];
};

const ALUMINIUM: Clang = { ratio: Math.SQRT2, strike: 3.2, hold: 1.5, ring: 4.23, ringLevel: 0.3, cluster: [540, 7200, 0.16, 0.45], click: [8000, 1.1, 0.8] };
const STEEL: Clang = { ratio: Math.sqrt(3), strike: 4.5, hold: 2.3, ring: 2.89, ringLevel: 0.35, cluster: [330, 3600, 0.32, 0.35], click: [3600, 1.4, 0.7] };

/**
 * A struck clang on `note`, `seconds` long: FM whose index holds, a beating twin, a ring
 * modulator and the 808's metal. `light` is aluminium (bright, quick), otherwise steel.
 */
export function clang(note: number, light: boolean, seconds: number) {
  const metal = light ? ALUMINIUM : STEEL;
  const out = new Float32Array(Math.floor(SYNTH_RATE * seconds));
  const frequency = midiToHz(note);
  const decay = seconds / 5;
  let carrier = 0;
  let twin = 0;
  let modulator = 0;
  let ring = 0;
  for (let index = 0; index < out.length; index += 1) {
    const t = index / SYNTH_RATE;
    const depth = metal.hold + (metal.strike - metal.hold) * Math.exp(-t / 0.25);
    modulator += (TAU * frequency * metal.ratio) / SYNTH_RATE;
    const swing = depth * Math.sin(modulator);
    carrier += (TAU * frequency) / SYNTH_RATE;
    twin += (TAU * frequency * 1.004) / SYNTH_RATE;
    ring += (TAU * frequency * metal.ring) / SYNTH_RATE;
    const tone = Math.sin(carrier + swing) + 0.6 * Math.sin(twin + swing * 0.9);
    const envelope = Math.min(1, t / 0.001) * Math.exp(-t / decay);
    out[index] = envelope * tone * (1 + metal.ringLevel * Math.exp(-t / 0.4) * (Math.sin(ring) - 1));
  }
  const [base, centre, clusterDecay, clusterLevel] = metal.cluster;
  addCluster(out, base, centre, clusterDecay, clusterLevel);
  const [click, q, level] = metal.click;
  addClick(out, note * 97 + (light ? 1 : 2), click, q, level, 0.0015);
  fadeOut(out, 0.03);
  return normalise(out);
}

/**
 * A struck pipe on `note`: a waveguide (Karplus–Strong) whose loop runs through four
 * all-pass filters, so its overtones run sharp, as a stiff metal tube's do.
 */
export function pipe(note: number, seconds: number) {
  const out = new Float32Array(Math.floor(SYNTH_RATE * seconds));
  const frequency = midiToHz(note);
  const coefficient = -0.45;
  // Each all-pass delays low frequencies by (1 − a)/(1 + a) samples; the damping about half a sample.
  const loop = SYNTH_RATE / frequency - (4 * (1 - coefficient)) / (1 + coefficient) - 0.2;
  const length = Math.max(2, Math.floor(loop));
  const fraction = loop - length;
  const line = new Float32Array(length + 1);
  const gain = 0.001 ** (1 / (frequency * seconds * 0.8));
  const next = random(note * 53 + 9);
  const states = [0, 0, 0, 0];
  const inputs = [0, 0, 0, 0];
  let low = 0;
  let read = 0;
  let previous = 0;
  for (let index = 0; index < out.length; index += 1) {
    const excitation = index < SYNTH_RATE * 0.003 ? (next() * 2 - 1) * (1 - index / (SYNTH_RATE * 0.003)) : 0;
    // The line holds `length + 1` samples: the oldest two, blended, are `loop` samples ago.
    const oldest = line[read]!;
    const older = line[(read + 1) % line.length]!;
    let x = older * (1 - fraction) + oldest * fraction;
    low += (x - low) * 0.85;
    x = low;
    for (let stage = 0; stage < 4; stage += 1) {
      const y = coefficient * x + inputs[stage]! - coefficient * states[stage]!;
      inputs[stage] = x;
      states[stage] = y;
      x = y;
    }
    const y = excitation + gain * x;
    line[read] = y;
    read = (read + 1) % line.length;
    out[index] = y - previous * 0.5;
    previous = y;
  }
  addClick(out, note * 59 + 3, 5000, 1.2, 0.3, 0.0012);
  addCluster(out, 410, 5200, 0.08, 0.15);
  fadeOut(out, 0.03);
  return normalise(out);
}

/** A spring's chirp: a sweep falling 4 kHz → 300 Hz in 45 ms, coming round again every 55 ms, each pass quieter. */
function addSpring(out: Float32Array, level: number, start = 0) {
  const sweep = Math.floor(0.045 * SYNTH_RATE);
  for (let pass = 0; pass < 9; pass += 1) {
    const first = Math.floor((start + pass * 0.055) * SYNTH_RATE);
    let phase = 0;
    for (let index = 0; index < sweep && first + index < out.length; index += 1) {
      const t = index / sweep;
      phase += (TAU * 4000 * (300 / 4000) ** t) / SYNTH_RATE;
      out[first + index]! += level * 0.62 ** pass * Math.sin(phase) * Math.sin(Math.PI * t);
    }
  }
}

/** A steel beam on `note`: the steel clang, a spring's chirp, and a tube's flutter (a 17 ms comb). */
export function beam(note: number, seconds: number) {
  const out = clang(note, false, seconds);
  addSpring(out, 0.35, 0.004);
  const delay = Math.floor(0.017 * SYNTH_RATE);
  for (let index = out.length - 1; index >= delay; index -= 1) out[index]! += 0.45 * out[index - delay]!;
  fadeOut(out, 0.05);
  return normalise(out);
}

/** An aluminium tink: a third of a second of clang, mostly strike and 808 metal. */
export function tink(note: number) {
  return clang(note, true, 0.3);
}
