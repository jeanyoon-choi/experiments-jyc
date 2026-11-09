import json, numpy as np
from PIL import Image
im = np.asarray(Image.open('ref/202603030941470009-scaled.jpg').convert('RGB')).astype(int)
rows = [72, 99, 126, 153, 180, 208]
spec = [(583, ['1','2','3','4','5','6'], 'bar'), (742, ['7','8','9'], 'bar'),
        (870, ['gyeongui-jungang','shinbundang','suin-bundang','airport','incheon-1','gtx-a'], 'badge'),
        (1165, ['uijeongbu','ui-sinseol','gimpo-gold','incheon-2','everline','sillim'], 'bar'),
        (1386, ['gyeongchun','gyeonggang','seohae'], 'badge')]
out = {}
for x, ids, kind in spec:
    for y, i in zip(rows, ids):
        r = 1 if kind == 'bar' else 7
        w = im[y-r:y+r+1, x-(12 if kind == 'bar' else r):x+(12 if kind == 'bar' else r)+1].reshape(-1, 3)
        sat = w.max(1) - w.min(1)
        w = w[(sat > 18) & (w.min(1) < 235)]
        q = (w // 8) * 8
        vals, counts = np.unique(q, axis=0, return_counts=True)
        top = vals[counts.argmax()]
        sel = w[(np.abs(w - top - 4).max(1) <= 10)]
        out[i] = '#%02X%02X%02X' % tuple(np.median(sel, 0).astype(int))
pdf = json.load(open('ex/palette.json'))
for k, v in out.items(): print(k, v, 'pdf', pdf.get(k))
json.dump(out, open('ex/palette_map.json', 'w'), indent=1)
# Thin double-line badges sample pale; their official sRGB is the better prototype.
for k in ['gyeongui-jungang', 'shinbundang', 'suin-bundang', 'airport']: out[k] = pdf[k]
json.dump(out, open('ex/palette_map.json', 'w'), indent=1)
