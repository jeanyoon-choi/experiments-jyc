# Cuts whole anchor links (speech start to the pause after it) out of the 30 fps
# intermediates, crops each so the eyes land on the shared place (align.json),
# and joins them into S.mov and N.mov of the same length.
import json, subprocess
from concurrent.futures import ThreadPoolExecutor
A = json.load(open("align.json"))
# (clip, first frame, frame count)
SOUTH = [("sb", 78, 689), ("sd", 324, 645), ("sc", 63, 677), ("sa", 75, 178)]
NORTH_CLIP, NORTH_START = "ne", 68
total = sum(n for _, _, n in SOUTH)
NORTH = [(NORTH_CLIP, NORTH_START, total)]

def seg(args):
    name, (f, a, n) = args
    cw, ch, x, y = A[f]["crop"]
    cw -= cw % 2; ch -= ch % 2
    fc = (f"[0:v]trim=start_frame={a}:end_frame={a+n},setpts=PTS-STARTPTS,crop={cw}:{ch}:{x}:{y},scale=608:1080:flags=lanczos,setsar=1[v];"
          f"[0:a]atrim=start={a/30}:end={(a+n)/30},asetpts=PTS-STARTPTS,pan=mono|c0=0.5*c0+0.5*c1,afade=t=in:d=0.06,afade=t=out:st={n/30-0.12}:d=0.12[a]")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", f + ".mp4", "-filter_complex", fc, "-map", "[v]", "-map", "[a]", "-r", "30",
                    "-c:v", "libx264", "-crf", "10", "-preset", "fast", "-c:a", "pcm_s16le", name + ".mov"], check=True)

jobs = [(f"S{i}", s) for i, s in enumerate(SOUTH)] + [(f"N{i}", s) for i, s in enumerate(NORTH)]
with ThreadPoolExecutor(5) as ex: list(ex.map(seg, jobs))
cuts = {}
for side, shots in (("S", SOUTH), ("N", NORTH)):
    open(side + ".txt", "w").write("".join(f"file {side}{i}.mov\n" for i in range(len(shots))))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-i", side + ".txt", "-c:v", "libx264", "-crf", "10", "-preset", "fast",
                    "-c:a", "pcm_s16le", side + ".mov"], check=True)
    edges = [0]
    for _, _, n in shots: edges.append(edges[-1] + n)
    cuts[side] = edges
json.dump(cuts, open("cuts.json", "w"))
print(cuts)
