# Quick geometry preview of official.json beside the published map.
import json, sys
from PIL import Image, ImageDraw
d = json.load(open(sys.argv[1])); x0, y0, x1, y1 = map(int, sys.argv[2:6]); S = float(sys.argv[6]); out = sys.argv[7]
col = {l['id']: l['colour'] for l in d['lines']}; kind = {l['id']: l['kind'] for l in d['lines']}
W = {'metro': 7, 'double': 5.6, 'dashed': 5.6, 'light': 4}
im = Image.new('RGB', (int((x1 - x0) * S), int((y1 - y0) * S)), 'white'); dr = ImageDraw.Draw(im)
T = lambda x, y: ((x - x0) * S, (y - y0) * S)
st = {s['id']: s for s in d['stations']}
for e in d['edges']:
    p = e['points']; pts = [T(p[i], p[i + 1]) for i in range(0, len(p), 2)]
    dr.line(pts, fill=col[e['line']], width=max(1, int(W[kind[e['line']]] * S)), joint='curve')
for s in d['stations']:
    if s['discs']:
        for q in s['discs']:
            cx, cy = T(s['x'] + q['dx'], s['y'] + q['dy']); r = 10.2 * S
            dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill='#231F20')
        for q in s['discs']:
            cx, cy = T(s['x'] + q['dx'], s['y'] + q['dy']); r = 8 * S
            dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill='white')
        for q in s['discs']:
            cx, cy = T(s['x'] + q['dx'], s['y'] + q['dy']); r = 5 * S
            dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col[q['line']])
    else:
        cx, cy = T(s['x'], s['y']); r = 2.2 * S
        dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill='white')
ref = Image.open('ref/202603030941470009-scaled.jpg').convert('RGB').crop((x0, y0, x1, y1)).resize(im.size, Image.LANCZOS)
c = Image.new('RGB', (im.width * 2 + 10, im.height), 'black'); c.paste(ref, (0, 0)); c.paste(im, (im.width + 10, 0)); c.save(out)
