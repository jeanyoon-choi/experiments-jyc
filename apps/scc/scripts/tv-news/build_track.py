# Builds the morph track of the two aligned clips: for every frame, the same
# list of corresponding points on each side (face landmarks, silhouette from the
# person mask, fixed frame anchors), plus one triangulation of their mean.
# Writes track.bin (int16, coord * 8192) and track.json; renders a preview.
import json, sys
import numpy as np
from scipy.ndimage import gaussian_filter1d, label
from scipy.spatial import Delaunay
from PIL import Image

W, H = 608, 1080
MW, MH = 152, 270
CUTS = [0, 408, 657]  # shot boundaries: smoothing never crosses them
SCALE = 8192


def load(side):
    rows = [json.loads(l) for l in open(side + ".jsonl")]
    face = np.array([r["face"] for r in rows], dtype=np.float64).reshape(len(rows), 87, 2)
    mask = np.fromfile(side + ".mask", dtype=np.uint8).reshape(-1, MH, MW)
    return face, mask


def silhouette(face, mask):
    """Head top, head sides, neck and body widths read off the person mask."""
    out = []
    for f in range(len(face)):
        pts = face[f]
        eye = (pts[41] + pts[42]) / 2
        chin = pts[8]
        io = abs(pts[42, 0] - pts[41, 0])
        m = mask[f] > 110
        lab, _ = label(m)
        cx, cy = int(eye[0] * MW), int((eye[1] + chin[1]) / 2 * MH)
        if lab[cy, cx]:
            m = lab == lab[cy, cx]

        def extent(y):
            row = m[min(MH - 1, max(0, int(round(y * MH))))]
            xs = np.flatnonzero(row)
            if len(xs) == 0:
                return eye[0] - io, eye[0] + io
            return xs[0] / MW, (xs[-1] + 1) / MW

        band = m[:, max(0, int((eye[0] - io * 0.5) * MW)):int((eye[0] + io * 0.5) * MW) + 1].any(axis=1)
        top = np.flatnonzero(band)[0] / MH if band.any() else eye[1] - 2 * io
        p = [(eye[0], top)]
        for k in (0.1, 0.3, 0.55, 0.8):  # head sides, top of head to chin
            y = top + (chin[1] - top) * k
            l, r = extent(y)
            p += [(l, y), (r, y)]
        # neck: the narrowest row just under the chin
        ys = np.linspace(chin[1], chin[1] + 1.1 * io, 12)
        widths = [extent(y) for y in ys]
        i = int(np.argmin([r - l for l, r in widths]))
        neck = ys[i]
        p += [(widths[i][0], neck), (widths[i][1], neck)]
        for k in (0.12, 0.25, 0.4):  # body widths, neck down to the chest
            y = neck + (1 - neck) * k
            l, r = extent(y)
            p += [(l, y), (r, y)]
        out.append(p)
    return np.array(out)


def smooth(a, sigma):
    out = a.copy()
    for s, e in zip(CUTS[:-1], CUTS[1:]):
        out[s:e] = gaussian_filter1d(a[s:e], sigma, axis=0, mode="nearest")
    return out


def anchors():
    pts = [(0, 0), (1, 0), (0, 1), (1, 1), (1 / 3, 0), (2 / 3, 0), (0, 0.12), (1, 0.12)]
    # The lower-third band (captions, desk) stays where it is on both sides.
    pts += [(x, y) for y in (0.86, 1) for x in (0, 0.25, 0.5, 0.75, 1) if (x, y) not in pts]
    return np.array(pts, dtype=np.float64)


sides = {}
for side in "SN":
    face, mask = load(side)
    sil = silhouette(face, mask)
    sides[side] = (smooth(face, 0.9), smooth(sil, 2.5))

# Vision repeats some landmarks across regions: keep one of each.
mean_face = (sides["S"][0].mean(axis=0) + sides["N"][0].mean(axis=0)) / 2
keep = []
for i, p in enumerate(mean_face):
    if all(np.hypot(*(p - mean_face[j])) > 0.004 for j in keep):
        keep.append(i)

frames = len(sides["S"][0])
anc = np.broadcast_to(anchors(), (frames, len(anchors()), 2))
track = {s: np.concatenate([sides[s][0][:, keep], sides[s][1], anc], axis=1) for s in "SN"}
points = track["S"].shape[1]

mean = (track["S"].mean(axis=0) + track["N"].mean(axis=0)) / 2
tri = Delaunay(mean * [1, H / W]).simplices
# drop slivers of the mean triangulation
def area(t):
    a, b, c = (mean[t] * [1, H / W])
    return abs((b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1])) / 2
tri = np.array([t for t in tri if area(t) > 1e-7])

packed = np.stack([track["S"], track["N"]], axis=1)  # frames, side, points, xy
np.round(packed * SCALE).astype("<i2").tofile("track.bin")
json.dump({"fps": 30, "frames": frames, "points": int(points), "scale": SCALE, "width": W, "height": H,
           "cuts": CUTS[1:-1], "triangles": tri.flatten().tolist()}, open("track.json", "w"), separators=(",", ":"))
print("frames", frames, "points", points, "face kept", len(keep), "triangles", len(tri))

# Folded triangles per frame at the halfway geometry (should be none).
mid = (track["S"] + track["N"]) / 2
def signed(p):
    a, b, c = p[:, tri[:, 0]], p[:, tri[:, 1]], p[:, tri[:, 2]]
    return (b[..., 0] - a[..., 0]) * (c[..., 1] - a[..., 1]) - (c[..., 0] - a[..., 0]) * (b[..., 1] - a[..., 1])
ref = np.sign(signed(mean[None]))
for name, p in (("S", track["S"]), ("N", track["N"]), ("mid", mid)):
    flips = (np.sign(signed(p)) != ref).sum(axis=1)
    print(name, "frames with folded triangles", int((flips > 0).sum()), "max", int(flips.max()))

if len(sys.argv) > 1:
    # Preview: rasterise the morph at a few amounts for the listed frames.
    import subprocess
    def frame(side, f):
        raw = subprocess.run(["ffmpeg", "-v", "error", "-i", side + ".mov", "-vf", f"select=eq(n\\,{f}),scale=304:540", "-frames:v", "1",
                              "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], capture_output=True).stdout
        return np.frombuffer(raw, dtype=np.uint8).reshape(540, 304, 3).astype(np.float64)
    def warp(img, src, dst):
        h, w = img.shape[:2]
        out = np.zeros_like(img)
        for t in tri:
            d = dst[t] * [w, h]; s = src[t] * [w, h]
            x0, x1 = int(max(0, np.floor(d[:, 0].min()))), int(min(w, np.ceil(d[:, 0].max()) + 1))
            y0, y1 = int(max(0, np.floor(d[:, 1].min()))), int(min(h, np.ceil(d[:, 1].max()) + 1))
            if x1 <= x0 or y1 <= y0: continue
            xs, ys = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
            den = (d[1, 1] - d[2, 1]) * (d[0, 0] - d[2, 0]) + (d[2, 0] - d[1, 0]) * (d[0, 1] - d[2, 1])
            if abs(den) < 1e-9: continue
            l0 = ((d[1, 1] - d[2, 1]) * (xs - d[2, 0]) + (d[2, 0] - d[1, 0]) * (ys - d[2, 1])) / den
            l1 = ((d[2, 1] - d[0, 1]) * (xs - d[2, 0]) + (d[0, 0] - d[2, 0]) * (ys - d[2, 1])) / den
            l2 = 1 - l0 - l1
            inside = (l0 >= -1e-6) & (l1 >= -1e-6) & (l2 >= -1e-6)
            sx = np.clip(l0 * s[0, 0] + l1 * s[1, 0] + l2 * s[2, 0], 0, w - 1).astype(int)
            sy = np.clip(l0 * s[0, 1] + l1 * s[1, 1] + l2 * s[2, 1], 0, h - 1).astype(int)
            out[y0:y1, x0:x1][inside] = img[sy, sx][inside]
        return out
    rows = []
    for f in map(int, sys.argv[1:]):
        a, b = frame("S", f), frame("N", f)
        cells = []
        for t in (0, 0.25, 0.5, 0.75, 1):
            geo = track["S"][f] * (1 - t) + track["N"][f] * t
            cells.append(warp(a, track["S"][f], geo) * (1 - t) + warp(b, track["N"][f], geo) * t)
        cells.append((a + b) / 2)  # plain cross-fade, for comparison
        rows.append(np.hstack(cells))
    Image.fromarray(np.vstack(rows).clip(0, 255).astype(np.uint8)).save("preview.jpg", quality=88)
