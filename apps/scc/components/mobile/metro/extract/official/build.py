# Assembles official.json: our topology placed on the published 2026 map.
#   1. interchanges: capsule centres (auto-matched or read by hand), then one
#      disc per line found by colour around the centre;
#   2. ends of runs (termini, branch stations) read by hand;
#   3. each line traced between placed stations over its own colour; ordinary
#      stations placed on white dots along the trace (or evenly by arc length);
#   4. edges cut from the traces.
import json, sys, numpy as np
from collections import defaultdict
from PIL import Image
from scipy import ndimage as ndi
from scipy.spatial import cKDTree
from skimage.color import rgb2lab
from skimage.graph import MCP_Geometric

IMG = 'ref/202603030941470009-scaled.jpg'
im = np.asarray(Image.open(IMG).convert('RGB'))
lab = rgb2lab(im.astype(np.float32) / 255)
H, W = lab.shape[:2]
cls = np.load('ex/line_cls.npy'); ids = list(json.load(open('ex/palette_map.json')))
pdf = json.load(open('ex/palette.json')); pmap = json.load(open('ex/palette_map.json'))
ours = json.load(open('ex/ours.json'))
DROP = {'도라산'}
st = {s['id']: s for s in ours['stations'] if s['name'] not in DROP}
for L in ours['lines']:
    L['edges'] = [e for e in L['edges'] if e[0] in st and e[1] in st]
byname = defaultdict(list)
for s in st.values(): byname[s['name']].append(s['id'])
linesAt = defaultdict(set)
for L in ours['lines']:
    for a, b in L['edges']: linesAt[a].add(L['id']); linesAt[b].add(L['id'])
manual = {byname[n][0]: tuple(v) for n, v in json.load(open('ex/manual_names.json')).items()}
tpos = json.load(open('ex/transfer_pos.json'))

def hexrgb(h): return [int(h[i:i + 2], 16) for i in (1, 3, 5)]
def lab_of(h): return rgb2lab(np.array([[hexrgb(h)]], np.float32) / 255)[0, 0]
line_labs = {i: [lab_of(pmap[i])] + ([lab_of(pdf[i])] if i in pdf else []) for i in ids}

# 1. Interchanges.
transfer_ids = [s for s in st if len(linesAt[s]) > 1]
centre = {}
for s in transfer_ids:
    if s in manual: centre[s] = manual[s]
    elif s in tpos: centre[s] = (tpos[s]['x'], tpos[s]['y'])
missing = [st[s]['name'] for s in transfer_ids if s not in centre]
print('interchanges without a place:', missing)
dark = (lab[..., 0] < 45) & (np.hypot(lab[..., 1], lab[..., 2]) < 18)

def find_discs(s):
    cx, cy = centre[s]; lines = sorted(linesAt[s]); n = len(lines)
    R = int(10 + 6 * n)
    x0, x1 = int(max(0, cx - R)), int(min(W, cx + R)); y0, y1 = int(max(0, cy - R)), int(min(H, cy + R))
    sub = lab[y0:y1, x0:x1]
    # The capsule interior: fill the dark ring near the centre.
    ring = dark[y0:y1, x0:x1]
    lb, _ = ndi.label(ring)
    found = {}
    for line in lines:
        d = np.min([((sub - c) ** 2).sum(-1) for c in line_labs[line]], axis=0)
        m = d < 24 ** 2
        m = ndi.binary_opening(m, iterations=1)
        l2, nn = ndi.label(m)
        best = None
        for k, sl in enumerate(ndi.find_objects(l2)):
            h = sl[0].stop - sl[0].start; w = sl[1].stop - sl[1].start
            if not (5 <= min(h, w) and max(h, w) <= 14 and max(h, w) <= 1.5 * min(h, w) + 1): continue
            blob = l2[sl] == k + 1
            yy, xx = ndi.center_of_mass(blob)
            px, py = x0 + sl[1].start + xx, y0 + sl[0].start + yy
            dist = np.hypot(px - cx, py - cy)
            score = dist - blob.sum() * 0.05
            if best is None or score < best[0]: best = (score, px, py)
        if best: found[line] = (best[1], best[2])
    return found

discs = {}
problems = []
MANUAL_DISCS = {'서울역': {'gyeongui-jungang': (1190, 1086), 'gtx-a': (1203, 1086), 'airport': (1216, 1086), '1': (1229, 1086), '4': (1242, 1086)}}
for s in transfer_ids:
    if s not in centre: continue
    f = dict(MANUAL_DISCS[st[s]['name']]) if st[s]['name'] in MANUAL_DISCS else find_discs(s)
    lines = sorted(linesAt[s])
    if len(f) < len(lines):
        # Missing lines: continue the row of found discs.
        pts = np.array(list(f.values())) if f else np.array([centre[s]])
        if len(pts) >= 2:
            dvec = pts[-1] - pts[0]; dvec = dvec / (np.linalg.norm(dvec) or 1)
        else:
            dvec = np.array([0.0, 1.0])
        step = 10.4
        proj = sorted(((p - pts.mean(0)) @ dvec for p in pts))
        slots = []
        k = 1
        while len(slots) < len(lines) - len(f):
            for sgn in (1, -1):
                t = (proj[-1] if sgn > 0 else proj[0]) + sgn * step * k
                slots.append(pts.mean(0) + dvec * t)
            k += 1
        missing_lines = [l for l in lines if l not in f]
        for l, p in zip(missing_lines, slots):
            f[l] = (float(p[0]), float(p[1]))
        problems.append((st[s]['name'], missing_lines))
    # Duplicate positions (two lines found on one disc) are a problem too.
    pos = list(f.values())
    if len({(round(x), round(y)) for x, y in pos}) < len(pos): problems.append((st[s]['name'], 'shared disc'))
    discs[s] = f
print('interchanges with guessed discs:', problems)

# Station positions.
pos = {}
for s, f in discs.items():
    xy = np.array(list(f.values())); pos[s] = (float(xy[:, 0].mean()), float(xy[:, 1].mean()))
marks = json.load(open('ex/marks.json'))['ordinary']
mxy = np.array([[m['x'], m['y']] for m in marks]); mtree = cKDTree(mxy)
for s, p in manual.items():
    if s in pos: continue
    d, j = mtree.query(p)
    pos[s] = (float(mxy[j][0]), float(mxy[j][1])) if d < 5 else p

# 3. Traces.
BADGE_XY = [('6', 858, 646), ('6', 1856, 584), ('2', 1773, 1193), ('2', 746, 1405), ('3', 1887, 1863), ('8', 2131, 857), ('suin-bundang', 1603, 1177)]
def route(line, a, b, pad=170, avoid=()):
    li = ids.index(line)
    x0 = int(max(0, min(a[0], b[0]) - pad)); x1 = int(min(W, max(a[0], b[0]) + pad))
    y0 = int(max(0, min(a[1], b[1]) - pad)); y1 = int(min(H, max(a[1], b[1]) + pad))
    c = cls[y0:y1, x0:x1]
    sub = lab[y0:y1, x0:x1]
    near = np.min([((sub - cc) ** 2).sum(-1) for cc in line_labs[line]], axis=0) < 30 ** 2
    cost = np.where(c == li, 1.0, np.where(near, 2.0, np.where(c < 0, 30.0, 14.0)))
    yy, xx = np.mgrid[y0:y1, x0:x1]
    for (bl, bx_, by_) in BADGE_XY:
        if bl == line: cost[(xx - bx_) ** 2 + (yy - by_) ** 2 < 16 ** 2] = 1.0
    for (ax_, ay_) in avoid:
        if x0 - 12 < ax_ < x1 + 12 and y0 - 12 < ay_ < y1 + 12:
            cost[(xx - ax_) ** 2 + (yy - ay_) ** 2 < 10 ** 2] = 400.0
    m = MCP_Geometric(cost)
    s0 = (int(round(a[1])) - y0, int(round(a[0])) - x0); e0 = (int(round(b[1])) - y0, int(round(b[0])) - x0)
    m.find_costs([s0], [e0])
    path = np.array(m.traceback(e0), float)
    on = near[path[:, 0].astype(int), path[:, 1].astype(int)].mean()
    return np.stack([path[:, 1] + x0, path[:, 0] + y0], 1), float(on)

def end_of(s, line):
    if s in discs and line in discs[s]: return discs[s][line]
    return pos.get(s)

def arclen(p): return np.concatenate([[0], np.cumsum(np.hypot(*np.diff(p, axis=0).T))])

def smooth(p, k=2):
    if len(p) < 2 * k + 3: return p
    q = p.copy()
    for i in range(k, len(p) - k): q[i] = p[i - k:i + k + 1].mean(0)
    return q


from scipy.ndimage import map_coordinates
KIND = {'suin-bundang': 'double', 'shinbundang': 'double', 'gyeongui-jungang': 'double', 'airport': 'double', 'incheon-1': 'double', 'gtx-a': 'double',
        'gyeongchun': 'dashed', 'gyeonggang': 'dashed', 'seohae': 'dashed'}
def resample(p, step=0.5):
    s = arclen(p); t = np.arange(0, s[-1], step)
    return np.stack([np.interp(t, s, p[:, 0]), np.interp(t, s, p[:, 1])], 1), t
def sample_lab(x, y):
    return np.stack([map_coordinates(lab[..., c], [y, x], order=1, mode='nearest') for c in range(3)], -1)
def likeness(x, y, line):
    v = sample_lab(x, y)
    d = np.min([((v - c) ** 2).sum(-1) for c in line_labs[line]], axis=0)
    return np.exp(-d / (22 ** 2))
def station_peaks(path, line, m0=9, m1=9):
    q, t = resample(path)
    if len(q) < 8: return q, t, []
    g = np.gradient(ndi.gaussian_filter1d(q, 4, axis=0), axis=0)
    g /= np.linalg.norm(g, axis=1, keepdims=True) + 1e-9
    nrm = np.stack([-g[:, 1], g[:, 0]], 1)
    offs = np.arange(-8, 8.01, 0.5)
    X = q[:, 0:1] + nrm[:, 0:1] * offs; Y = q[:, 1:2] + nrm[:, 1:2] * offs
    C = likeness(X.ravel(), Y.ravel(), line).reshape(X.shape)
    w = np.where(C > 0.45, C, 0)
    centre = (w * offs).sum(1) / (w.sum(1) + 1e-9)
    centre = ndi.median_filter(centre, 9)
    q = q + nrm * centre[:, None]
    kind = KIND.get(line, 'solid')
    if kind == 'solid':
        best = np.zeros(len(q))
        for o in (-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2):
            v = sample_lab(q[:, 0] + nrm[:, 0] * o, q[:, 1] + nrm[:, 1] * o)
            best = np.maximum(best, np.where(np.hypot(v[:, 1], v[:, 2]) < 22, v[:, 0], 0))
        sig = best > 72
    else:
        r = 4.1
        a = likeness(q[:, 0] + nrm[:, 0] * r, q[:, 1] + nrm[:, 1] * r, line)
        b = likeness(q[:, 0] - nrm[:, 0] * r, q[:, 1] - nrm[:, 1] * r, line)
        v = sample_lab(q[:, 0], q[:, 1])
        sig = (a > 0.35) & (b > 0.35) & (v[:, 0] > 75)
    lbl, n = ndi.label(sig)
    peaks = []
    for k in range(1, n + 1):
        idx = np.nonzero(lbl == k)[0]
        if len(idx) * 0.5 < 1.0 or len(idx) * 0.5 > 9: continue
        m = t[idx].mean()
        if m < m0 or m > t[-1] - m1: continue
        peaks.append(float(m))
    return q, t, peaks
def choose(peaks, n, total):
    # n of the peaks closest to even spacing (DP over order).
    if len(peaks) == n: return peaks
    if len(peaks) < n: return None
    ideal = np.linspace(0, total, n + 2)[1:-1]
    P = len(peaks); INF = 1e18
    D = np.full((n + 1, P + 1), INF); D[0, :] = 0
    for i in range(1, n + 1):
        for j in range(i, P + 1):
            D[i, j] = min(D[i, j - 1], D[i - 1, j - 1] + (peaks[j - 1] - ideal[i - 1]) ** 2)
    out = []; i, j = n, P
    while i > 0:
        if D[i, j] == D[i, j - 1] and j > i: j -= 1
        else: out.append(peaks[j - 1]); i -= 1; j -= 1
    return out[::-1]


from skimage.measure import approximate_polygon
# 2호선's circle, fitted to its interchange discs on the loop.
def fit_circle(P):
    x, y = P[:, 0], P[:, 1]
    A = np.c_[2 * x, 2 * y, np.ones(len(x))]; bb = x ** 2 + y ** 2
    c, *_ = np.linalg.lstsq(A, bb, rcond=None)
    r = np.sqrt(c[2] + c[0] ** 2 + c[1] ** 2); return c[0], c[1], r
_P = np.array([discs[s]['2'] for s in discs if '2' in discs[s]])
for _ in range(3):
    cx2, cy2, r2 = fit_circle(_P)
    d = np.abs(np.hypot(_P[:, 0] - cx2, _P[:, 1] - cy2) - r2)
    _P = _P[d < max(4, np.median(d) * 3)]
print('2호선 circle', round(cx2, 1), round(cy2, 1), round(r2, 1), 'from', len(_P))
def on_circle(p): return abs(np.hypot(p[0] - cx2, p[1] - cy2) - r2) < 7
def arc(pa, pb, mid):
    a0 = np.arctan2(pa[1] - cy2, pa[0] - cx2); a1 = np.arctan2(pb[1] - cy2, pb[0] - cx2); am = np.arctan2(mid[1] - cy2, mid[0] - cx2)
    d = (a1 - a0 + np.pi) % (2 * np.pi) - np.pi
    dm = (am - a0 + np.pi) % (2 * np.pi) - np.pi
    if np.sign(dm) != np.sign(d) or abs(dm) > abs(d): d = d - np.sign(d) * 2 * np.pi
    n = max(2, int(abs(d) * r2 / 2))
    t = a0 + d * np.linspace(0, 1, n)
    out = np.stack([cx2 + r2 * np.cos(t), cy2 + r2 * np.sin(t)], 1)
    out[0] = pa; out[-1] = pb
    return out
def snap_dir(v):
    a = np.arctan2(v[1], v[0]); k = np.round(a / (np.pi / 4)) * (np.pi / 4)
    return np.array([np.cos(k), np.sin(k)]) if abs(a - k) < np.radians(9) else v / (np.linalg.norm(v) or 1)
def intersect(p, u, q, v):
    M = np.array([u, -v]).T
    if abs(np.linalg.det(M)) < 1e-6: return None
    t = np.linalg.solve(M, q - p); return p + u * t[0]
def fillet(P, R=14):
    if len(P) < 3: return P
    out = [P[0]]
    for i in range(1, len(P) - 1):
        a, b, c = P[i - 1], P[i], P[i + 1]
        u = (a - b); lu = np.linalg.norm(u); v = (c - b); lv = np.linalg.norm(v)
        if lu < 1e-6 or lv < 1e-6: continue
        u /= lu; v /= lv
        ang = np.arccos(np.clip(u @ v, -1, 1))
        if ang > np.radians(175): out.append(b); continue
        r = min(R, 0.45 * lu * np.tan(ang / 2), 0.45 * lv * np.tan(ang / 2))
        dlen = r / np.tan(ang / 2)
        p1 = b + u * dlen; p2 = b + v * dlen
        bis = (u + v); bis /= np.linalg.norm(bis)
        cen = b + bis * (r / np.sin(ang / 2))
        a1 = np.arctan2(*(p1 - cen)[::-1]); a2 = np.arctan2(*(p2 - cen)[::-1])
        da = (a2 - a1 + np.pi) % (2 * np.pi) - np.pi
        n = max(2, int(abs(da) * r / 1.5))
        for t in np.linspace(0, 1, n):
            ang_t = a1 + da * t; out.append(cen + r * np.array([np.cos(ang_t), np.sin(ang_t)]))
    out.append(P[-1])
    return np.array(out)
def dejog(V):
    V = [np.array(v, float) for v in V]
    changed = True
    while changed and len(V) > 2:
        changed = False
        # Z-jog: a short piece between two parallel runs.
        for i in range(1, len(V) - 2):
            a, b, c, d = V[i - 1], V[i], V[i + 1], V[i + 2]
            u, w = b - a, d - c
            if np.linalg.norm(c - b) < 14 and np.linalg.norm(u) > 1e-6 and np.linalg.norm(w) > 1e-6:
                un, wn = u / np.linalg.norm(u), w / np.linalg.norm(w)
                if un @ wn > 0.995:
                    V = V[:i] + V[i + 2:]; changed = True; break
        if changed: continue
        # A short off-angle stub at either pinned end.
        for i in (1, len(V) - 2):
            if 0 < i < len(V) - 1 and len(V) > 3:
                seg = V[i] - V[i - 1] if i == 1 else V[i + 1] - V[i]
                if np.linalg.norm(seg) < 12:
                    V = V[:i] + V[i + 1:]; changed = True; break
    return np.array(V)
def merge_runs(V):
    # Two runs in the same direction, a short piece between them and a small
    # sideways offset are one straight line on the map: refit them as one.
    V = [np.array(v, float) for v in V]
    for _ in range(50):
        done = True
        # Several short pieces between two parallel runs: collapse them first.
        for i in range(0, len(V) - 3):
            for j in range(i + 2, min(len(V) - 1, i + 8)):
                u = V[i + 1] - V[i]; w = V[j + 1] - V[j]
                lu, lw = np.linalg.norm(u), np.linalg.norm(w)
                if lu < 1e-6 or lw < 1e-6: continue
                mid = sum(np.linalg.norm(V[k + 1] - V[k]) for k in range(i + 1, j))
                un, wn = u / lu, w / lw
                off = abs(un[0] * (V[j] - V[i])[1] - un[1] * (V[j] - V[i])[0])
                if un @ wn > 0.995 and mid < 45 and off < 14 and j > i + 2:
                    V = V[:i + 1] + V[j:]
                    done = False
                    break
            if not done: break
        if not done: continue
        for i in range(0, len(V) - 3):
            a, b, c, d = V[i], V[i + 1], V[i + 2], V[i + 3]
            u, w, m = b - a, d - c, c - b
            lu, lw, lm = np.linalg.norm(u), np.linalg.norm(w), np.linalg.norm(m)
            if lu < 1e-6 or lw < 1e-6: continue
            un, wn = u / lu, w / lw
            if un @ wn < 0.995 or lm > 40: continue
            off = abs(un[0] * (c - a)[1] - un[1] * (c - a)[0])
            if off > 14: continue
            pinned_a, pinned_d = i == 0, i + 3 == len(V) - 1
            if pinned_a and pinned_d:
                V = V[:i + 1] + V[i + 3:]
            elif pinned_a:
                # keep a; continue the first run's direction to meet the line after d
                V = V[:i + 1] + V[i + 3:]
            elif pinned_d:
                V = V[:i + 1] + V[i + 3:]
            else:
                # one line through the length-weighted centre of both runs
                cen = ((a + b) / 2 * lu + (c + d) / 2 * lw) / (lu + lw)
                prev, nxt = V[i - 1], V[i + 4] if i + 4 < len(V) else None
                q1 = intersect(prev, a - prev, cen, un)
                q2 = intersect(cen, un, d, nxt - d) if nxt is not None else None
                if q1 is None or q2 is None:
                    V = V[:i + 1] + V[i + 3:]
                else:
                    V = V[:i] + [q1, q2] + V[i + 4:]
            done = False
            break
        if done: break
    return np.array(V)
def clean_chain(path, line, pa, pb):
    pa = np.array(pa, float); pb = np.array(pb, float)
    if line == '2' and on_circle(pa) and on_circle(pb):
        mid = path[len(path) // 2]
        if on_circle(mid): return arc(pa, pb, mid)
    P = approximate_polygon(path, 2.5)
    if len(P) < 2: P = np.array([pa, pb])
    # Path index of each simplified vertex, to fit each run to its own trace points.
    tree_ = cKDTree(path)
    idx = [int(tree_.query(v)[1]) for v in P]
    idx[0] = 0; idx[-1] = len(path) - 1
    segs = []  # [dir, i0, i1, snapped]
    for k in range(len(P) - 1):
        v = P[k + 1] - P[k]
        if np.linalg.norm(v) < 1e-6: continue
        d = snap_dir(v)
        vn = v / np.linalg.norm(v); snapped = abs(d[0] * vn[1] - d[1] * vn[0]) < np.sin(np.radians(9.5))
        if segs and segs[-1][3] and snapped and abs(segs[-1][0][0] * d[1] - segs[-1][0][1] * d[0]) < 1e-3 and segs[-1][0] @ d > 0:
            segs[-1][2] = idx[k + 1]
        else:
            segs.append([d, idx[k], idx[k + 1], snapped])
    if not segs: return np.array([pa, pb])
    # Each run: a line with its direction through the centroid of its trace points; ends pinned.
    lines_ = []
    for n_, (d, i0, i1, snapped) in enumerate(segs):
        pts = path[min(i0, i1):max(i0, i1) + 1]
        c = pts.mean(0) if len(pts) else (path[i0] + path[i1]) / 2
        if n_ == 0: c = pa
        if n_ == len(segs) - 1: c = pb if len(segs) > 1 else c
        lines_.append((c, d))
    if len(segs) == 1:
        return np.array([pa, pb])
    V = [pa]
    for n_ in range(len(lines_) - 1):
        (c0, d0), (c1, d1) = lines_[n_], lines_[n_ + 1]
        q = intersect(c0, d0, c1, d1)
        ref = path[segs[n_][2]]
        if q is None or np.linalg.norm(q - ref) > 30:
            V.append(c0 + d0 * ((ref - c0) @ d0)); V.append(c1 + d1 * ((ref - c1) @ d1))
        else:
            V.append(q)
    V.append(pb)
    V = np.array(V)
    V = dejog(V)
    V = merge_runs(V)
    if len(V) > 2: V = approximate_polygon(V, 2.0)
    return fillet(V, 14)
def project(poly, pt):
    best = (1e18, 0, None)
    s_ = arclen(poly)
    for i in range(len(poly) - 1):
        a, b = poly[i], poly[i + 1]; ab = b - a; L2 = ab @ ab
        t = 0 if L2 == 0 else np.clip((pt - a) @ ab / L2, 0, 1)
        q = a + ab * t; d = np.sum((pt - q) ** 2)
        if d < best[0]: best = (d, s_[i] + t * np.sqrt(L2), q)
    return best[1], best[2]
def cut(poly, svals):
    s_ = arclen(poly); pieces = []; prev = 0
    pts_at = lambda v: np.array([np.interp(v, s_, poly[:, 0]), np.interp(v, s_, poly[:, 1])])
    bounds = [0] + list(svals) + [s_[-1]]
    for k in range(len(bounds) - 1):
        a, b = bounds[k], bounds[k + 1]
        inside = poly[(s_ > a + 1e-6) & (s_ < b - 1e-6)]
        pieces.append(np.vstack([pts_at(a), inside, pts_at(b)]) if len(inside) else np.vstack([pts_at(a), pts_at(b)]))
    return pieces

edges_out = []
report = []
for L in ours['lines']:
    line = L['id']; adj = defaultdict(list)
    for a, b in L['edges']: adj[a].append(b); adj[b].append(a)
    anchor = lambda s: s in pos and (len(linesAt[s]) > 1 or len(adj[s]) != 2 or s in manual)
    seen = set()
    for s0 in list(adj):
        if not anchor(s0): continue
        for nb in adj[s0]:
            if (s0, nb) in seen: continue
            chain = [s0, nb]
            while not anchor(chain[-1]):
                nxt = [x for x in adj[chain[-1]] if x != chain[-2]]
                if not nxt: break
                chain.append(nxt[0])
            seen.add((s0, nb)); seen.add((chain[-1], chain[-2]))
            A, B = chain[0], chain[-1]
            if B not in pos:
                report.append((line, st[A]['name'], st[B]['name'], 'unplaced end')); continue
            pa, pb = end_of(A, line), end_of(B, line)
            avoid = []
            for o in adj:
                if o in (A, B) or o not in pos: continue
                if o in discs: avoid += list(discs[o].values())
                elif anchor(o) or o in pos: avoid.append(pos[o])
            avoid = [q for q in avoid if q is not None and np.hypot(q[0] - pa[0], q[1] - pa[1]) > 12 and np.hypot(q[0] - pb[0], q[1] - pb[1]) > 12]
            path, on = route(line, pa, pb, avoid=avoid)
            path = smooth(path, 2); path[0] = pa; path[-1] = pb
            s_ = arclen(path)
            inner = chain[1:-1]
            if inner:
                def margin(sid, p):
                    if sid not in discs: return 7
                    return 9 + max(np.hypot(x - p[0], y - p[1]) for x, y in discs[sid].values())
                q, t, peaks = station_peaks(path, line, margin(A, pa), margin(B, pb))
                path = q if len(q) >= 2 else path
                path[0] = pa; path[-1] = pb
                s_ = arclen(path)
                total = s_[-1]
                merged = []
                for pk in sorted(peaks):
                    if merged and pk - merged[-1][-1] < 12: merged[-1].append(pk)
                    else: merged.append([pk])
                peaks = [float(np.mean(g)) for g in merged]
                pick = choose(peaks, len(inner), total)
                if pick is not None:
                    gaps = np.diff([0] + list(pick) + [total])
                    if gaps.min() < 0.4 * total / (len(inner) + 1): pick = None
                if pick is not None:
                    at = pick; how = 'dots' if len(peaks) == len(inner) else f'dots {len(peaks)}>{len(inner)}'
                    if len(peaks) != len(inner): report.append((line, st[A]['name'], st[B]['name'], how))
                else:
                    even = np.linspace(0, total, len(inner) + 2)[1:-1]
                    at = []
                    for v in even:
                        near = [pk for pk in peaks if abs(pk - v) < 10]
                        at.append(min(near, key=lambda pk: abs(pk - v)) if near else v)
                    report.append((line, st[A]['name'], st[B]['name'], f'even ({len(peaks)} dots for {len(inner)})'))
                cp = clean_chain(path, line, pa, pb)
                # Keep the traced spacing: the same fraction of the way along the clean run.
                cs = arclen(cp)
                svals = sorted(float(v) / float(s_[-1]) * float(cs[-1]) for v in at)
                for sid, sv in zip(inner, svals):
                    pos[sid] = (float(np.interp(sv, cs, cp[:, 0])), float(np.interp(sv, cs, cp[:, 1])))
                pieces = cut(cp, svals)
            else:
                pieces = [clean_chain(path, line, pa, pb)]
            if on < 0.6: report.append((line, st[A]['name'], st[B]['name'], f'trace off-colour {on:.2f}'))
            for k in range(len(chain) - 1):
                edges_out.append({'line': line, 'a': chain[k], 'b': chain[k + 1], 'trace': pieces[k].tolist()})
print('placed stations', len(pos), 'of', len(st))
print('unplaced:', [st[s]['name'] for s in st if s not in pos])
for r in report: print('  ', r)
json.dump({'pos': pos, 'discs': discs, 'edges': edges_out}, open('ex/build.json', 'w'))
