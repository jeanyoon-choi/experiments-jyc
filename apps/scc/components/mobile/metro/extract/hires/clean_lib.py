def arclen(p): return np.concatenate([[0], np.cumsum(np.hypot(*np.diff(p, axis=0).T))])
def fit_circle(P):
    x, y = P[:, 0], P[:, 1]
    A = np.c_[2 * x, 2 * y, np.ones(len(x))]; bb = x ** 2 + y ** 2
    c, *_ = np.linalg.lstsq(A, bb, rcond=None)
    r = np.sqrt(c[2] + c[0] ** 2 + c[1] ** 2); return c[0], c[1], r
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
        # The line is hidden under the capsules at both ends: fit on what shows.
        far = pts[(np.hypot(*(pts - pa).T) > FREE_A) & (np.hypot(*(pts - pb).T) > FREE_B)] if len(pts) else pts
        if len(far) >= 4: pts = far
        c = pts.mean(0) if len(pts) else (path[i0] + path[i1]) / 2
        lines_.append((c, d))
    foot = lambda p, ln: ln[0] + ln[1] * ((p - ln[0]) @ ln[1])
    if len(segs) == 1:
        return np.array([foot(pa, lines_[0]), foot(pb, lines_[0])])
    V = [foot(pa, lines_[0])]
    for n_ in range(len(lines_) - 1):
        (c0, d0), (c1, d1) = lines_[n_], lines_[n_ + 1]
        q = intersect(c0, d0, c1, d1)
        ref = path[segs[n_][2]]
        if q is None or np.linalg.norm(q - ref) > 30:
            V.append(c0 + d0 * ((ref - c0) @ d0)); V.append(c1 + d1 * ((ref - c1) @ d1))
        else:
            V.append(q)
    V.append(foot(pb, lines_[-1]))
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
