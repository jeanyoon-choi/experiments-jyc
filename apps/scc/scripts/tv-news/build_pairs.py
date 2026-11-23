#!/usr/bin/env python3
"""Cuts each South/North pair into one 1216 x 1080 atlas (South left, North
right; South's sound on the left channel, North's on the right), 20 s at 30 fps.
usage: build_pairs.py <folder with the fetched sections> <out folder> [pair names]"""
import os, re, subprocess, sys
src, out = sys.argv[1], sys.argv[2]
W, H, T = 608, 1080, 20

def lerp(keys):
    """ffmpeg expression: piecewise-linear value over clip time t."""
    expr = str(keys[-1][1])
    for (t0, v0), (t1, v1) in reversed(list(zip(keys, keys[1:]))):
        expr = f"if(lt(t,{t1}),{v0}+({v1}-{v0})*(t-{t0})/({t1}-{t0}),{expr})"
    return expr

def step(keys):
    expr = str(keys[-1][1])
    for (t1, _), (_, v0) in reversed(list(zip(keys[1:], keys))):
        expr = f"if(lt(t,{t1}),{v0},{expr})"
    return expr

def crop16x9(center, w=W, h=H, y=0):
    """Vertical slice of a 1920-wide frame; `center` is an expression in 0..1."""
    return f"crop={w}:{h}:'min(1920-{w},max(0,({center})*1920-{w}/2))':{y},scale={W}:{H}:flags=lanczos"

TARGET = -17.0  # LUFS, each side

def sides(path):
    """Integrated loudness (LUFS) of the left (South) and right (North) channel."""
    found = []
    for channel in ("c0", "c1"):
        log = subprocess.run(["ffmpeg", "-v", "info", "-i", path, "-filter_complex",
            f"[0:a]pan=mono|c0={channel},ebur128=framelog=quiet", "-f", "null", "-"], capture_output=True, text=True).stderr
        found.append(float(re.findall(r"I:\s+(-?[\d.]+) LUFS", log)[-1]))
    return found

def level(path):
    """loudnorm in one pass only comes near its target; this measures what it left and
    gives each side the gain that puts both on the target, so neither is the louder one."""
    south, north = sides(path)
    gains = [max(-12.0, min(12.0, TARGET - value)) for value in (south, north)]
    if all(abs(gain) < 0.3 for gain in gains): return
    fixed = path + ".level.mp4"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", path, "-filter_complex",
        "[0:a]channelsplit=channel_layout=stereo[s][n];"
        f"[s]volume={gains[0]}dB,alimiter=limit=0.8:level=false[s2];"
        f"[n]volume={gains[1]}dB,alimiter=limit=0.8:level=false[n2];"
        "[s2][n2]join=inputs=2:channel_layout=stereo[a]",
        "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", fixed], check=True)
    os.replace(fixed, path)

PAIRS = {
    # Marching blocks, then the leader on the stand: both cut to him at 11.71 s.
    "parade": dict(
        S=("pS", 0.13, crop16x9(step([(0, .5), (2.54, .47), (11.71, .53), (15.89, .70)]))),
        N=("pN", 0.57, crop16x9(step([(0, .5), (4.37, .5), (8.87, .5), (11.71, .5), (17.15, .5)]))),
    ),
    # One man in the middle of the frame, then the country as an emblem at 14.5 s.
    "anthem": dict(
        S=("mS", 1.5, "split[a][b];"
            f"[a]{crop16x9('0.5')}[full];"
            f"[b]crop=1190:1080:365:0,scale={W}:-2:flags=lanczos,pad={W}:{H}:0:(oh-ih)/2:black[title];"
            "[full][title]overlay=enable='between(t,11.2,14.4)'"),
        N=("mN", 1.4, crop16x9(step([(0, .49), (3.64, .71), (7.2, .49), (10.92, .5), (16.64, .53), (18.4, .5)]), w=478, h=848, y=112)),
    ),
    # A woman singing in white light. The North is "'I Want to Break Free' Performed In North Korea"
    # (a re-dub: the picture is a 모란봉악단 and army chorus concert, the sound is Queen's song).
    # The South is drawn in to her upper half for the North's opening close-up, then shown whole.
    "stage": dict(
        S=("cS", 2.0, "split[a][b];"
            f"[a]scale={W}:{H}:flags=lanczos[whole];"
            f"[b]crop=540:960:292:60,scale={W}:{H}:flags=lanczos[near];"
            "[whole][near]overlay=enable='lt(t,3.12)'"),
        N=("qN", 1.44, crop16x9(step([(0, .41), (3.12, .40), (6.84, .5), (10.72, .70), (13.48, .5)]))),
    ),
}

PAIRS.update({
    # The leader among his people, his name sung: a campaign song and a hymn.
    "leader": dict(
        S=("lS", 3.0, crop16x9(step([(0, .60), (1.34, .5), (4.64, .5), (8.08, .42), (9.65, .66), (13.0, .62), (14.68, .5)]))),
        N=("lN", 0.48, crop16x9(step([(0, .40), (4.08, .60), (5.92, .5), (7.72, .38), (9.56, .5), (12.28, .30), (15.0, .60), (15.92, .40), (16.84, .5)]), w=478, h=848, y=112)),
    ),
})

UP = "scale=1920:1080:flags=lanczos,"  # a 720p source, brought to the same frame first

PAIRS.update({
    # Walking down a pavement, the camera at eye height, people coming the other way.
    "street": dict(
        S=("sS", 2.0, crop16x9("0.45")),
        N=("sN", 2.0, crop16x9("0.35")),
    ),
    # Lit towers at night: an apartment brand's film and the state broadcast's last shots.
    "towers": dict(
        S=("aS", 2.0, crop16x9("0.5")),
        N=("aN", 1.6, UP + crop16x9(step([(0, .5), (12.07, .42)]))),
    ),
    # A curved beach from the air.
    "beach": dict(
        S=("bS", 0.5, crop16x9(lerp([(0, .34), (6, .36), (9, .33), (11.5, .30), (13.5, .55), (20, .55)]))),
        N=("bN", 2.84, crop16x9(step([(0, .55), (6.08, .5), (8.2, .45), (10.36, .5)]))),
    ),
    # A woman at a table for 4.5 s, then the bowls.
    "noodles": dict(
        S=("fS", 1.36, crop16x9("0.5")),
        N=("fN", 2.24, crop16x9(step([(0, .47), (4.48, .5), (10.68, .52), (16.84, .5)]))),
    ),
    # People dancing in the open in front of a monumental building.
    "dance": dict(
        S=("dS", 0.3, crop16x9(step([(0, .47), (4.0, .5)]))),
        N=("dN", 2.2, crop16x9("0.5")),
    ),
    # The largest missile of each parade on its carrier, seen from the front quarter.
    "missile": dict(
        S=("tS", 0.5, crop16x9("0.68")),
        N=("tN", 3.0, crop16x9(step([(0, .5), (3.97, .62), (14.02, .5)]))),
    ),
})

ONLY = [name for name in sys.argv[3:] if name != "--level"]
if "--level" in sys.argv:  # only level the atlases already in the out folder
    for name in PAIRS:
        if ONLY and name not in ONLY: continue
        before = sides(f"{out}/{name}.mp4"); level(f"{out}/{name}.mp4")
        print(name, before, "->", sides(f"{out}/{name}.mp4"))
    sys.exit(0)
for name, pair in PAIRS.items():
    if ONLY and name not in ONLY: continue
    (sf, ss, sv), (nf, ns, nv) = pair["S"], pair["N"]
    graph = (
        f"[0:v]fps=30,setpts=PTS-STARTPTS,{sv},setsar=1[s];"
        f"[1:v]fps=30,setpts=PTS-STARTPTS,{nv},setsar=1[n];"
        "[s][n]hstack=inputs=2,fps=30[v];"
        "[0:a]aresample=48000,pan=mono|c0=0.5*c0+0.5*c1,highpass=f=80,loudnorm=I=-17:TP=-2:LRA=11[sa];"
        "[1:a]aresample=48000,pan=mono|c0=0.5*c0+0.5*c1,highpass=f=80,loudnorm=I=-17:TP=-2:LRA=11[na];"
        "[sa][na]join=inputs=2:channel_layout=stereo,aresample=48000[a]"
    )
    subprocess.run(["ffmpeg", "-y", "-v", "error",
        "-ss", str(ss), "-t", str(T), "-i", f"{src}/{sf}.mp4",
        "-ss", str(ns), "-t", str(T), "-i", f"{src}/{nf}.mp4",
        "-filter_complex", graph, "-map", "[v]", "-map", "[a]", "-t", str(T),
        "-c:v", "libx264", "-preset", "slow", "-r", "30", "-crf", "25", "-pix_fmt", "yuv420p", "-profile:v", "high",
        "-g", "30", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", f"{out}/{name}.mp4"], check=True)
    level(f"{out}/{name}.mp4")
    print(name, "done", sides(f"{out}/{name}.mp4"))
