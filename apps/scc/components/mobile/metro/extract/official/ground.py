import json, numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.color import rgb2lab
from skimage.measure import find_contours, approximate_polygon
im = np.asarray(Image.open('ref/202603030941470009-scaled.jpg').convert('RGB')).astype(int)
lab = rgb2lab(im.astype(np.float32) / 255)
H, W = lab.shape[:2]
L = lab[..., 0]; a = lab[..., 1]; b = lab[..., 2]; chroma = np.hypot(a, b)
# Ground outside Seoul is #F7F7F7; inside, #FFFFFF.
white = (im.min(-1) >= 251)
grey = (np.abs(im - 247).max(-1) <= 3)
water = (b < -3) & (L > 85) & (L < 98.5) & (chroma > 3) & (chroma < 25) & (np.abs(a) < 12)
def clean(m, close, open_=2, keep_min=4000):
    m = ndi.binary_opening(m, iterations=open_)
    m = ndi.binary_closing(m, iterations=close)
    m = ndi.binary_fill_holes(m)
    lb, n = ndi.label(m)
    sizes = ndi.sum(m, lb, range(1, n + 1))
    keep = np.isin(lb, [i + 1 for i, s in enumerate(sizes) if s >= keep_min])
    return keep
# Seoul: where white field outvotes the grey ground nearby.
wf = (im.mean(-1) >= 250.5).astype(np.float32); gf = grey.astype(np.float32)
ws = ndi.uniform_filter(wf, 41); gs = ndi.uniform_filter(gf, 41)
seoul = (ws > gs) & ((ws + gs) > 0.02)
seoul = clean(seoul | (ws > 0.05) & (gs < 0.005), 6, 3, 200000)
wat = clean(water, 8, 1, 3000)
def polys(m, eps):
    out = []
    for c in find_contours(np.pad(m, 1).astype(float), 0.5):
        c = approximate_polygon(c, eps) - 1
        if len(c) < 4: continue
        out.append([round(float(v), 1) for p in c for v in (p[1], p[0])])
    return out
g = {'seoul': polys(seoul, 1.2), 'water': polys(wat, 1.2)}
print({k: (len(v), sum(len(p) // 2 for p in v)) for k, v in g.items()})
json.dump(g, open('ex/ground.json', 'w'))
viz = np.full((H, W, 3), 240, np.uint8); viz[seoul] = 255; viz[wat] = (200, 225, 245)
Image.fromarray(viz).resize((W // 3, H // 3)).save('ground.png')
