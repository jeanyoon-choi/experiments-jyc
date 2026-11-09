import json, numpy as np
from collections import Counter
from scipy.interpolate import RBFInterpolator
from scipy.optimize import linear_sum_assignment
ours = json.load(open('ex/ours.json')); caps = json.load(open('ex/capsules.json'))
st = {s['id']: s for s in ours['stations']}
tr = [s for s in ours['stations'] if len(s['lines']) > 1]
so = Counter(tuple(s['lines']) for s in tr); sc = Counter(tuple(c['lines']) for c in caps)
fixed = {}  # station id -> capsule index
for k in [k for k in so if so[k] == 1 and sc.get(k) == 1]:
    fixed[[x for x in tr if tuple(x['lines']) == k][0]['id']] = [j for j, c in enumerate(caps) if tuple(c['lines']) == k][0]
def tps():
    ids = list(fixed)
    src = np.array([[st[i]['x'], st[i]['y']] for i in ids]); dst = np.array([[caps[fixed[i]]['x'], caps[fixed[i]]['y']] for i in ids])
    return RBFInterpolator(src, dst, kernel='thin_plate_spline', smoothing=0.5)
for rnd, (radius, exact) in enumerate([(120, True), (200, True), (120, False)]):
    f = tps()
    rest = [s for s in tr if s['id'] not in fixed]; free = [j for j in range(len(caps)) if j not in fixed.values()]
    if not rest or not free: break
    P = f(np.array([[s['x'], s['y']] for s in rest]))
    cost = np.full((len(rest), len(free)), 1e6)
    for i, s in enumerate(rest):
        for jj, j in enumerate(free):
            c = caps[j]; d = np.hypot(c['x'] - P[i][0], c['y'] - P[i][1])
            if d > radius: continue
            sl, cl = set(s['lines']), set(c['lines'])
            if exact and sl != cl: continue
            if not (sl & cl): continue
            cost[i, jj] = d + 30 * len(sl ^ cl)
    r, c = linear_sum_assignment(cost)
    n = 0
    for i, jj in zip(r, c):
        if cost[i, jj] < 1e6: fixed[rest[i]['id']] = free[jj]; n += 1
    print('round', rnd, 'added', n, 'total', len(fixed))
f = tps()
left = [s for s in tr if s['id'] not in fixed]
P = f(np.array([[s['x'], s['y']] for s in left])) if left else []
print('unmatched', [(s['name'], s['lines'], [round(v) for v in p]) for s, p in zip(left, P)])
print('unused', [(round(c['x']), round(c['y']), c['lines']) for j, c in enumerate(caps) if j not in fixed.values()])
mism = [(st[k]['name'], st[k]['lines'], caps[j]['lines']) for k, j in fixed.items() if set(st[k]['lines']) != set(caps[j]['lines'])]
print('set mismatches', mism)
json.dump({k: caps[j] for k, j in fixed.items()}, open('ex/transfer_pos.json', 'w'))
