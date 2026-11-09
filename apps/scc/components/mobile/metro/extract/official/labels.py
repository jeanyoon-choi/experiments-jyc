# Finds where the published map sets each station's Korean and English name:
# renders the name in 서울알림체 at the map's size and matches it (normalised
# cross-correlation) against the map's dark ink near the station.
import json, sys as _s; _s.path.insert(0, 'ex'); from en import official_en
import json, numpy as np, sys
from PIL import Image, ImageDraw, ImageFont
from skimage.color import rgb2lab
from skimage.feature import match_template
from collections import defaultdict

im = np.asarray(Image.open('ref/202603030941470009-scaled.jpg').convert('RGB'))
lab = rgb2lab(im.astype(np.float32) / 255)
chroma = np.hypot(lab[..., 1], lab[..., 2])
ink = np.clip((100 - lab[..., 0]) / 100, 0, 1) * (chroma < 22)
H, W = ink.shape
ours = json.load(open('ex/ours.json'))
b = json.load(open('ex/build.json'))
pos = b['pos']
st = {s['id']: s for s in ours['stations'] if s['id'] in pos}
linesAt = defaultdict(set)
for L in ours['lines']:
    for e in L['edges']:
        for s in e: linesAt[s].add(L['id'])
SIZES = json.loads(sys.argv[1]) if len(sys.argv) > 1 else {'kt': 14.2, 'kp': 11.5, 'et': 9.5, 'ep': 7.0, 'trk': 0.03}
FONT = {w: f'font/alrim/SeoulAlrim-{w}.otf' for w in ('Medium', 'Bold', 'ExtraBold')}
_cache = {}
def font(w, size):
    key = (w, size)
    if key not in _cache: _cache[key] = ImageFont.truetype(FONT[w], size=max(1, round(size * 4)))
    return _cache[key]

def template1(text, w, size, tracking):
    # Rendered 4× then reduced, so sub-pixel sizes match the 1× map.
    f = font(w, size)
    asc, desc = f.getmetrics()
    x = 0; widths = []
    for ch in text:
        widths.append(f.getlength(ch))
    total = sum(widths) + tracking * size * 4 * (len(text) - 1)
    img = Image.new('L', (int(total) + 8, asc + desc + 8), 0)
    d = ImageDraw.Draw(img)
    for ch, cw in zip(text, widths):
        d.text((4 + x, 4), ch, fill=255, font=f)
        x += cw + tracking * size * 4
    arr = np.asarray(img, np.float32) / 255
    ys, xs = np.nonzero(arr > 0.05)
    if not len(xs): return None, 0, 0
    arr = arr[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    # Baseline offset of the cropped template's top-left, in 4× px.
    base_y = 4 + asc - ys.min()
    left = xs.min() - 4
    small = Image.fromarray((arr * 255).astype(np.uint8)).resize((max(1, round(arr.shape[1] / 4)), max(1, round(arr.shape[0] / 4))), Image.LANCZOS)
    return np.asarray(small, np.float32) / 255, base_y / 4, left / 4

def template(text, w, size, tracking, align='left'):
    if '\n' not in text: return template1(text, w, size, tracking)
    parts = [template1(t, w, size, tracking) for t in text.split('\n')]
    if any(p[0] is None for p in parts): return None, 0, 0
    lh = 1.25 * size
    # Place each line's pen origin; first line's origin is (0, 0).
    boxes = []
    widths = [p[0].shape[1] for p in parts]
    maxw = max(widths)
    for i, (arr, by, lx) in enumerate(parts):
        off = 0 if align == 'left' else (maxw - widths[i]) / 2 if align == 'center' else (maxw - widths[i])
        boxes.append((arr, off, i * lh - by))   # top-left of the line's ink, relative to first-line baseline, x relative to block left
    top = min(b[2] for b in boxes); bottom = max(b[2] + b[0].shape[0] for b in boxes)
    canvas = np.zeros((int(np.ceil(bottom - top)) + 1, int(np.ceil(maxw)) + 1), np.float32)
    for arr, ox, oy in boxes:
        y = int(round(oy - top)); x = int(round(ox))
        canvas[y:y + arr.shape[0], x:x + arr.shape[1]] = np.maximum(canvas[y:y + arr.shape[0], x:x + arr.shape[1]], arr)
    first_off = boxes[0][1]
    return canvas, -top, parts[0][2] - first_off

def find(text, w, size, tracking, cx, cy, R, exclude=None, align='left'):
    t, by, lx = template(text, w, size, tracking, align)
    if t is None or t.shape[0] < 3: return None
    x0, x1 = int(max(0, cx - R)), int(min(W, cx + R)); y0, y1 = int(max(0, cy - R)), int(min(H, cy + R))
    win = ink[y0:y1, x0:x1].copy()
    if exclude is not None:
        ex0, ey0, ex1, ey1 = exclude
        win[max(0, int(ey0) - y0):max(0, int(ey1) - y0), max(0, int(ex0) - x0):max(0, int(ex1) - x0)] = 0
    if win.shape[0] < t.shape[0] or win.shape[1] < t.shape[1]: return None
    r = match_template(win, t)
    j = np.unravel_index(np.argmax(r), r.shape)
    score = float(r[j])
    tx, ty = x0 + j[1], y0 + j[0]
    # baseline-left of the text (pen origin), in map units
    return {'x': tx - lx, 'y': ty + by, 'score': score, 'box': (tx, ty, tx + t.shape[1], ty + t.shape[0])}

out = {}
weak = []
for sid, s in st.items():
    x, y = pos[sid]
    transfer = len(linesAt[sid]) > 1
    kw = 'ExtraBold' if transfer else 'Bold'
    base = SIZES['kt'] if transfer else SIZES['kp']
    name = s['name']
    best = None
    for f in (0.8, 0.9, 1.0):
        for trk in (0.0, 0.1, 0.2, 0.3):
            r = find(name, kw, base * f, trk, x, y, 75)
            if r and (best is None or r['score'] > best[0]['score']): best = (r, base * f, trk, None)
    single = best
    if best[0]['score'] < 0.6 and len(name) >= (7 if transfer else 4):
        for i in range(2, len(name) - 1):
            for al in ('left', 'center', 'right'):
                for f in (0.9, 1.0):
                    r = find(name[:i] + '\n' + name[i:], kw, base * f, 0.03, x, y, 75, align=al)
                    if r and r['score'] > best[0]['score'] + 0.1: best = (r, base * f, 0.03, (i, al))
    kr, ksize, ktrk, split = best
    if kr['score'] < 0.45:
        weak.append((name, round(kr['score'], 2))); out[sid] = None; continue
    en = None
    s = dict(s, en=official_en(s.get('en')))
    if s.get('en'):
        bx0, by0, bx1, by1 = kr['box']
        ebase = SIZES['et'] if transfer else SIZES['ep']
        for f in (0.85, 1.0, 1.15):
            for trk in (0.0, 0.08):
                e = find(s['en'], 'Bold' if transfer else 'Medium', ebase * f, trk, (bx0 + bx1) / 2, (by0 + by1) / 2, 60, exclude=kr['box'])
                if e and e['score'] > 0.45 and (en is None or e['score'] > en[0]['score']): en = (e, ebase * f, trk)
    if split and en:
        # The English must sit clear of the second Korean line.
        second_base = kr['y'] + 1.25 * ksize
        if en[0]['y'] - en[1] * 0.75 < second_base + 0.5 and en[0]['y'] > kr['y']:
            kr, ksize, ktrk, split = single
            bx0, by0, bx1, by1 = kr['box']
            en = None
            ebase = SIZES['et'] if transfer else SIZES['ep']
            for f in (0.85, 1.0, 1.15):
                for trk in (0.0, 0.08):
                    e = find(s['en'], 'Bold' if transfer else 'Medium', ebase * f, trk, (bx0 + bx1) / 2, (by0 + by1) / 2, 60, exclude=kr['box'])
                    if e and e['score'] > 0.45 and (en is None or e['score'] > en[0]['score']): en = (e, ebase * f, trk)
    out[sid] = {'split': split, 'kx': kr['x'] - x, 'ky': kr['y'] - y, 'ks': kr['score'], 'ksize': ksize, 'ktrk': ktrk,
                'ex': (en[0]['x'] - x) if en else None, 'ey': (en[0]['y'] - y) if en else None, 'es': en[0]['score'] if en else None,
                'esize': en[1] if en else None, 'etrk': en[2] if en else None}
json.dump(out, open('ex/labels.json', 'w'))
ok = [v for v in out.values() if v]
print('placed', len(ok), 'of', len(out), 'mean score', np.mean([v['ks'] for v in ok]).round(3),
      'with english', sum(1 for v in ok if v['ex'] is not None))
print('weak', len(weak), weak[:60])
