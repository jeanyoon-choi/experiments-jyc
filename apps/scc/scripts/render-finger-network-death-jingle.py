# finger-network/5 death jingle: an original ~1.4 s chiptune "you died" cue in the 8-bit game genre
# (pulse-wave lead, triangle bass, final pitch slide down). Writes 16-bit WAVs; encode with ffmpeg.
# Usage: python3 scripts/render-finger-network-death-jingle.py <out folder>
import array, math, sys, wave, os

RATE = 32000
out = sys.argv[1]
os.makedirs(out, exist_ok=True)

def freq(midi):
    return 440 * 2 ** ((midi - 69) / 12)

def pulse(phase, duty):
    return 1.0 if (phase % 1.0) < duty else -1.0

def triangle(phase):
    p = phase % 1.0
    return 4 * p - 1 if p < 0.5 else 3 - 4 * p

def render(lead, bass, transpose, path):
    # lead/bass: lists of (midi or None, beats); slide: last lead note bends down an octave.
    beat = 0.115
    total = sum(d for _, d in lead) * beat + 0.25
    n = int(total * RATE)
    samples = [0.0] * n
    for voice, notes, gain in (("lead", lead, 0.32), ("bass", bass, 0.38)):
        t0 = 0.0
        phase = 0.0
        for index, (midi, beats) in enumerate(notes):
            length = beats * beat
            start, end = int(t0 * RATE), int((t0 + length) * RATE)
            last = voice == "lead" and index == len(notes) - 1
            for i in range(start, min(end, n)):
                local = (i - start) / RATE
                if midi is None:
                    continue
                f = freq(midi + transpose - (12 if voice == "bass" else 0))
                if last:
                    f *= 2 ** (-12 * min(1, local / length) / 12)  # slide down an octave
                phase += f / RATE
                # short attack, slight decay, gap at the end of each note for 8-bit articulation
                env = min(1, local / 0.004) * (0.75 + 0.25 * math.exp(-local / 0.08))
                if not last and local > length - 0.012:
                    env = 0
                if last:
                    env *= 1 - (local / length) ** 2
                value = pulse(phase, 0.25 if not last else 0.5) if voice == "lead" else triangle(phase)
                samples[i] += value * env * gain
            t0 += length
    # gentle one-pole lowpass to take the edge off the raw pulse
    y = 0.0
    a = 1 - math.exp(-2 * math.pi * 7000 / RATE)
    data = array.array("h")
    for value in samples:
        y += (value - y) * a
        data.append(int(max(-1, min(1, y)) * 30000))
    with wave.open(path, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(data.tobytes())

# Original melody: a hopeful little hop up, a stumble, then a falling minor line that slides off the end.
lead = [(76, 1), (None, 0.5), (79, 1), (78, 1), (77, 1), (74, 2), (70, 2), (67, 4)]
bass = [(52, 2.5), (49, 2), (46, 3), (43, 5)]
render(lead, bass, 0, f"{out}/death-1.wav")
render(lead, bass, -2, f"{out}/death-2.wav")
lead2 = [(72, 1), (75, 1), (None, 0.5), (74, 1), (71, 1), (68, 2), (65, 2), (60, 4)]
bass2 = [(48, 2), (47, 2.5), (44, 3), (36, 5)]
render(lead2, bass2, 0, f"{out}/death-3.wav")
