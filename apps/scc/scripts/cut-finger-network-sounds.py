# finger-network/5 sounds: cuts takes from the downloaded recordings (see docs/experiments/mobile/finger-network-5.md),
# peak-normalizes them, and encodes small mono MP3s.
# Usage: python3 scripts/cut-finger-network-sounds.py <folder of downloaded originals> public/assets/finger-network/sound
import subprocess, sys, re, os
raw, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
# name: (source, start, end, peak dBFS, fade-out seconds, rate, kbps)
takes = {}
k1 = [(1.01, 1.10), (2.10, 2.135), (3.16, 3.255), (4.257, 4.354), (5.355, 5.504), (6.508, 6.697)]
for i, (a, b) in enumerate(k1): takes[f"kiss-{i+1}"] = ("bsb-0178-kisses-1.wav", a - 0.04, b + 0.22, -3, 0.12, 32000, 48)
takes["kiss-7"] = ("bsb-2201-kiss-3.wav", 0, 0.29, -3, 0.08, 32000, 48)
takes["kiss-8"] = ("bsb-2202-kisses-5.wav", 0, 0.545, -3, 0.1, 32000, 48)
slaps = [0.271, 1.1475, 2.0425, 2.9419, 3.9236, 4.8012]
for i, a in enumerate(slaps): takes[f"slap-{i+1}"] = ("bsb-0597-slaps.wav", a - 0.025, a + 0.36, -1, 0.15, 32000, 48)
takes["cry-1"] = ("bsb-0873-baby-crying.wav", 0.33, 2.97, -3, 0.25, 32000, 48)
takes["cry-2"] = ("bsb-0873-baby-crying.wav", 3.27, 5.07, -3, 0.25, 32000, 48)
takes["cry-3"] = ("bsb-0873-baby-crying.wav", 5.80, 7.93, -3, 0.25, 32000, 48)
takes["cry-4"] = ("crying-newborn-baby.ogg", 0.0, 2.45, -3, 0.25, 32000, 48)
takes["shatter-1"] = ("bsb-0148-glass-burst.wav", 0, 1.81, -1, 0.4, 32000, 56)
takes["shatter-2"] = ("bsb-1591-champagne-glass.wav", 0, 1.34, -1, 0.3, 32000, 56)
takes["breath-1"] = ("bsb-1405-sigh.wav", 0.44, 4.22, -4, 0.5, 32000, 48)
takes["breath-2"] = ("bsb-1103-breathless-man.wav", 7.65, 9.05, -4, 0.25, 32000, 48)
takes["breath-3"] = ("bsb-1103-breathless-man.wav", 4.85, 6.25, -4, 0.25, 32000, 48)
takes["requiem-1"] = ("chopin-funeral-march-pitman.ogg", 2.4, 16.4, -3, 3.0, 32000, 48)
for name, (src, a, b, peak, fade, rate, kbps) in takes.items():
    length = b - a
    probe = subprocess.run(["ffmpeg", "-hide_banner", "-ss", str(a), "-t", str(length), "-i", f"{raw}/{src}", "-af", "volumedetect", "-f", "null", "-"], capture_output=True, text=True).stderr
    top = float(re.search(r"max_volume: (-?[0-9.]+) dB", probe).group(1))
    gain = peak - top
    filters = f"volume={gain}dB,afade=t=in:d=0.004,afade=t=out:st={max(0, length - fade)}:d={fade}"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(a), "-t", str(length), "-i", f"{raw}/{src}", "-af", filters, "-ac", "1", "-ar", str(rate), "-c:a", "libmp3lame", "-b:a", f"{kbps}k", f"{out}/{name}.mp3"], check=True)
    print(f"{name:10s} {length:5.2f}s gain {gain:+.1f}dB {os.path.getsize(f'{out}/{name}.mp3')/1024:.1f}KB")
