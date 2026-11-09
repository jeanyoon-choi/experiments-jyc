# Interchange discs: compact round single-colour blobs; clustered into capsules.
import json, sys, numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.color import rgb2lab
Image.MAX_IMAGE_PIXELS = None
src, scale = sys.argv[1], float(sys.argv[2])
im = np.asarray(Image.open(src).convert('RGB'))
lab = rgb2lab(im.astype(np.float32) / 255)
L = lab[..., 0]; chroma = np.hypot(lab[..., 1], lab[..., 2])
cls = np.load('ex/line_cls.npy'); ids = list(json.load(open('ex/palette_map.json')))
H, W = cls.shape
discs = []
for li, i in enumerate(ids):
    m = cls == li
    m = ndi.binary_opening(m, iterations=1)
    lb, nn = ndi.label(m)
    for k, sl in enumerate(ndi.find_objects(lb)):
        h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
        if not (6 * scale <= min(h, w) and max(h, w) <= 14 * scale and max(h, w) <= 1.3 * min(h, w) + 1): continue
        blob = lb[sl] == k + 1
        a = blob.sum()
        if a < 0.65 * np.pi * (max(h, w) / 2) ** 2: continue
        cy, cx = ndi.center_of_mass(blob)
        discs.append([sl[1].start + cx, sl[0].start + cy, i, float(np.sqrt(a / np.pi))])
# cluster: discs within 1.6 diameters chain into one capsule
pts = np.array([[d[0], d[1]] for d in discs])
from scipy.spatial import cKDTree
t = cKDTree(pts)
parent = list(range(len(discs)))
def f(a):
    while parent[a] != a: parent[a] = parent[parent[a]]; a = parent[a]
    return a
for a, b in t.query_pairs(15 * scale):
    parent[f(a)] = f(b)
groups = {}
for k in range(len(discs)): groups.setdefault(f(k), []).append(discs[k])
caps = []
for g in groups.values():
    xs = [d[0] for d in g]; ys = [d[1] for d in g]
    caps.append({'x': float(np.mean(xs)) / scale, 'y': float(np.mean(ys)) / scale,
                 'discs': [[d[0] / scale, d[1] / scale, d[2]] for d in sorted(g, key=lambda d: (d[1], d[0]))],
                 'lines': sorted({d[2] for d in g})})
json.dump(caps, open('ex/capsules.json', 'w'))
from collections import Counter
print(len(discs), 'discs', len(caps), 'groups', Counter(len(c['discs']) for c in caps))
