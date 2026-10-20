"""Dense optical flow for a moving-image cube (moving-image/3).

    python3 build-cube-flow.py <clip-dir> [--scale 4]

Reads <clip-dir>/manifest.json and clip.mp4 (written by build-cube.sh) and
writes, beside them (the clip's own files are not touched):

  flow.bin.gz   frames x 4 planes x (H/scale) x (W/scale) bytes, gzip. Layer
                i holds the flow between frame i and i + 1: planes 0, 1 =
                forward flow F01 (where a pixel of frame i is in frame i + 1,
                on frame i's grid), planes 2, 3 = backward flow F10 (where a
                pixel of frame i + 1 is in frame i, on frame i + 1's grid).
                Units: full-resolution pixels, companded: byte b ->
                s = (b - 127.5) / 127.5, v = sign(s) * |s|^1.5 * range.
                Each plane is stored filtered for compression (PNG-like):
                d[y][x] = e[y][x] - e[y][x-1] - e[y-1][x] + e[y-1][x-1]
                (mod 256, zero outside), i.e. undo with a prefix sum down
                the columns, then along the rows.
                The last layer (no next frame) and shot cuts are zero.
  flow.json     { width, height, scale, range, cuts: [i, ...] }

Needs numpy and OpenCV (opencv-python-headless) and ffmpeg on PATH.
Flow is DIS (Kroeger et al. 2016) at half resolution, median-filtered and
area-downsampled to the stored grid; it fades to zero where standing still
explains the next frame at least as well (black bars, flat or static areas
that DIS only fills in by propagation). Cuts are intervals that ffmpeg's scene
score (> 0.25) marks, or where the frames differ and following the flow
explains almost none of it (fades, flashes).
"""

import argparse
import gzip
import json
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np

FLOW_W_DIV = 2  # DIS runs at half resolution


def read_frames(video: Path, width: int, height: int):
    process = subprocess.Popen(
        ["ffmpeg", "-loglevel", "error", "-i", str(video),
         "-vf", f"scale={width}:{height}:flags=area", "-f", "rawvideo", "-pix_fmt", "gray", "-"],
        stdout=subprocess.PIPE,
    )
    size = width * height
    while True:
        data = process.stdout.read(size)
        if len(data) < size:
            break
        yield np.frombuffer(data, np.uint8).reshape(height, width)
    process.wait()


def scene_cuts(video: Path, fps: float, threshold=0.25):
    """Intervals i (frame i -> i + 1) that ffmpeg's scene score calls a cut."""
    result = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(video), "-vf", f"select='gt(scene,{threshold})',metadata=print",
         "-f", "null", "-"],
        capture_output=True, text=True,
    )
    cuts = set()
    for line in result.stderr.splitlines():
        if "pts_time:" in line:
            cuts.add(round(float(line.split("pts_time:")[1].split()[0]) * fps) - 1)
    return cuts


def warp(image, flow):
    h, w = image.shape
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    return cv2.remap(image, gx + flow[..., 0], gy + flow[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)


COMPANDING = 1.5


def explained(flow, a, b):
    """Flow faded towards zero wherever standing still explains b better than the flow
    does (black bars, flat or static areas the flow only filled in by propagation)."""
    box = (9, 9)
    moved = cv2.blur(np.abs(warp(b, flow).astype(np.float32) - a), box)
    still = cv2.blur(np.abs(b.astype(np.float32) - a), box)
    keep = np.clip((still - moved + 1.0) / 3.0, 0.0, 1.0)
    keep = cv2.GaussianBlur(keep, (0, 0), 2.0)
    return flow * keep[..., None]


def encode(flow, value_range):
    s = np.sign(flow) * (np.minimum(np.abs(flow), value_range) / value_range) ** (1 / COMPANDING)
    return np.clip(np.round(127.5 + 127.5 * s), 0, 255).astype(np.uint8)


def filtered_planes(layer):
    """(H, W, 4) bytes -> 4 planes, each differenced along x then y (mod 256)."""
    planes = layer.astype(np.int16).transpose(2, 0, 1)
    planes = np.diff(planes, axis=2, prepend=0)
    planes = np.diff(planes, axis=1, prepend=0)
    return np.ascontiguousarray(planes.astype(np.uint8))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("clip_dir")
    parser.add_argument("--scale", type=int, default=4, help="stored grid = full size / scale")
    args = parser.parse_args()

    clip_dir = Path(args.clip_dir)
    manifest = json.loads((clip_dir / "manifest.json").read_text())
    full_w, full_h = manifest["full"]["width"], manifest["full"]["height"]
    frames = manifest["frames"]
    work_w, work_h = full_w // FLOW_W_DIV, full_h // FLOW_W_DIV
    out_w, out_h = full_w // args.scale, full_h // args.scale
    to_full = full_w / work_w

    images = list(read_frames(clip_dir / manifest["full"]["video"], work_w, work_h))
    if len(images) != frames:
        sys.exit(f"decoded {len(images)} frames, manifest says {frames}")

    scene = scene_cuts(clip_dir / manifest["full"]["video"], manifest["fps"])
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    pairs = []
    cuts = []
    for i in range(frames - 1):
        a, b = images[i], images[i + 1]
        forward = dis.calc(a, b, None)
        backward = dis.calc(b, a, None)
        raw = float(np.abs(b.astype(np.float32) - a).mean())
        residual = float(np.abs(warp(b, forward).astype(np.float32) - a).mean())
        # A shot cut: the frames differ and following the flow explains none of it.
        if i in scene or (raw > 12 and residual > 0.8 * raw):
            cuts.append(i)
            pairs.append(None)
            continue
        stored = []
        for flow in (explained(forward, a, b), explained(backward, b, a)):
            flow = np.dstack([cv2.medianBlur(flow[..., k], 5) for k in range(2)])
            flow = cv2.resize(flow, (out_w, out_h), interpolation=cv2.INTER_AREA) * to_full
            stored.append(flow)
        pairs.append(np.dstack(stored).astype(np.float32))
        print(f"\r{i + 1}/{frames - 1}", end="", file=sys.stderr)
    print(file=sys.stderr)

    magnitudes = np.concatenate([np.abs(p).ravel()[::7] for p in pairs if p is not None] or [np.zeros(1)])
    value_range = float(max(8.0, np.ceil(np.percentile(magnitudes, 99.8))))

    zero = np.full((out_h, out_w, 4), 128, np.uint8)
    with gzip.open(clip_dir / "flow.bin.gz", "wb", compresslevel=9) as out:
        for i in range(frames):
            pair = pairs[i] if i < len(pairs) else None
            out.write(filtered_planes(zero if pair is None else encode(pair, value_range)).tobytes())

    (clip_dir / "flow.json").write_text(json.dumps({
        "width": out_w,
        "height": out_h,
        "scale": args.scale,
        "range": value_range,
        "companding": COMPANDING,
        "cuts": cuts,
    }) + "\n")
    size = (clip_dir / "flow.bin.gz").stat().st_size
    print(f"{clip_dir.name}: {out_w}x{out_h}x{frames} flow, range {value_range:.0f} px, "
          f"{len(cuts)} cuts, {size / 1e6:.1f} MB gz ({out_w * out_h * 4 * frames / 1e6:.0f} MB on GPU)")


if __name__ == "__main__":
    main()
