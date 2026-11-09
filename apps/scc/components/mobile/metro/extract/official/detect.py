# Finds station marks on the official map: white dots sitting inside one line
# colour (ordinary stations) and coloured discs inside dark-ringed white capsules
# (interchanges).
import json, sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.color import rgb2lab
Image.MAX_IMAGE_PIXELS = None
src, scale = sys.argv[1], float(sys.argv[2])   # scale = image px per 2555-px unit
im = np.asarray(Image.open(src).convert('RGB'))
H, W, _ = im.shape
pdf = json.load(open('ex/palette.json')); mp = json.load(open('ex/palette_map.json'))
ids = list(mp)
protos = []
for i in ids:
    for h in {pdf.get(i, mp[i]), mp[i]}:
        protos.append((i, tuple(int(h[k:k+2], 16) for k in (1, 3, 5))))
lab = rgb2lab(im.astype(np.float32) / 255)
plab = rgb2lab(np.array([[c for _, c in protos]], np.float32) / 255)[0]
best = np.full((H, W), -1, np.int16); bestd = np.full((H, W), 1e9, np.float32)
for k, c in enumerate(plab):
    d = ((lab - c) ** 2).sum(-1); m = d < bestd; best[m] = ids.index(protos[k][0]); bestd[m] = d[m]
chroma = np.hypot(lab[..., 1], lab[..., 2])
best[(bestd > 22 ** 2) | (chroma < 10) & (lab[..., 0] > 60)] = -1
L = lab[..., 0]
white = (L > 85) & (chroma < 15)
dark = (L < 30) & (chroma < 12)
np.save('ex/line_cls.npy', best)

# Ordinary stations: small white blobs, ring around them mostly one line colour.
lbl, n = ndi.label(white)
objs = ndi.find_objects(lbl)
areas = ndi.sum(np.ones_like(lbl), lbl, index=np.arange(1, n + 1))
ordinary = []
r_ring = max(2, round(2 * scale))
for k, sl in enumerate(objs):
    a = areas[k]
    if not (3 * scale * scale <= a <= 60 * scale * scale): continue
    h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
    if max(h, w) > 2.2 * min(h, w) + 2: continue
    y0, y1 = max(0, sl[0].start - r_ring), min(H, sl[0].stop + r_ring)
    x0, x1 = max(0, sl[1].start - r_ring), min(W, sl[1].stop + r_ring)
    blob = lbl[y0:y1, x0:x1] == k + 1
    ring = ndi.binary_dilation(blob, iterations=r_ring) & ~ndi.binary_dilation(blob, iterations=1)
    c = best[y0:y1, x0:x1][ring]
    c = c[c >= 0]
    if len(c) < ring.sum() * 0.35: continue
    vals, cnt = np.unique(c, return_counts=True)
    if cnt.max() < len(c) * 0.5: continue
    cy, cx = ndi.center_of_mass(blob)
    ordinary.append({'x': (x0 + cx) / scale, 'y': (y0 + cy) / scale, 'line': ids[vals[cnt.argmax()]], 'r': float(np.sqrt(a / np.pi) / scale)})

# Interchange discs: compact single-colour blobs not touching long line runs, with white around.
discs = []
for li, i in enumerate(ids):
    m = best == li
    lb, nn = ndi.label(m)
    for k, sl in enumerate(ndi.find_objects(lb)):
        h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
        if not (6 * scale <= min(h, w) and max(h, w) <= 20 * scale and max(h, w) < 1.35 * min(h, w) + 2): continue
        blob = lb[sl] == k + 1
        a = blob.sum()
        if a < 0.6 * np.pi * (min(h, w) / 2) ** 2: continue
        y0, y1 = max(0, sl[0].start - 3), min(H, sl[0].stop + 3); x0, x1 = max(0, sl[1].start - 3), min(W, sl[1].stop + 3)
        bb = np.zeros((y1 - y0, x1 - x0), bool); bb[sl[0].start - y0:sl[0].stop - y0, sl[1].start - x0:sl[1].stop - x0] = blob
        ring = ndi.binary_dilation(bb, iterations=2) & ~bb
        wr = white[y0:y1, x0:x1][ring].mean()
        if wr < 0.45: continue
        cy, cx = ndi.center_of_mass(bb)
        discs.append({'x': (x0 + cx) / scale, 'y': (y0 + cy) / scale, 'line': i, 'r': float(np.sqrt(a / np.pi) / scale)})
json.dump({'ordinary': ordinary, 'discs': discs}, open('ex/marks.json', 'w'))
print(len(ordinary), 'ordinary', len(discs), 'discs')
from collections import Counter
print(Counter(o['line'] for o in ordinary)); print(Counter(o['line'] for o in discs))
