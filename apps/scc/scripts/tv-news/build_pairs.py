#!/usr/bin/env python3
"""Cuts each South/North pair into one 1216 x 1080 atlas (South left, North
right; South's sound on the left channel, North's on the right), 20 s at 30 fps.
usage: build_pairs.py <folder with the fetched sections> <out folder> [pair names]"""
import subprocess, sys
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
    # One woman singing, whole figure, the camera holding her.
    "stage": dict(
        S=("cS", 2.0, f"scale={W}:{H}:flags=lanczos"),
        N=("cN", 1.0, crop16x9(lerp([(0, .50), (3, .52), (6.2, .56), (6.6, .42), (11.0, .40), (11.6, .55), (13.5, .58), (16, .57), (17, .54), (20, .53)]), w=560, h=994, y=86)),
    ),
}

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

ONLY = sys.argv[3:]
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
    print(name, "done")
