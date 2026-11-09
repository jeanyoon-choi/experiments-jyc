# official.json for metro/2.
import json, sys as _s; _s.path.insert(0, 'ex'); from en import official_en
import json, sys, numpy as np
from collections import defaultdict
from skimage.measure import approximate_polygon

ours = json.load(open('ex/ours.json'))
b = json.load(open('ex/build.json'))
labels = json.load(open('ex/labels.json'))
ground = json.load(open('ex/ground.json'))
pdf = json.load(open('ex/palette.json'))
SIZES = {'kt': 14.2, 'kp': 11.5, 'et': 9.5, 'ep': 7.0}
pos = b['pos']; discs = b['discs']
st = {s['id']: s for s in ours['stations'] if s['id'] in pos}
linesAt = defaultdict(set); deg = defaultdict(lambda: defaultdict(int))
for L in ours['lines']:
    for x, y in L['edges']:
        if x in st and y in st:
            linesAt[x].add(L['id']); linesAt[y].add(L['id']); deg[x][L['id']] += 1; deg[y][L['id']] += 1

META = {
    '1': ('1호선', 'Line 1', ['1'], 'metro'), '2': ('2호선', 'Line 2', ['2'], 'metro'), '3': ('3호선', 'Line 3', ['3'], 'metro'),
    '4': ('4호선', 'Line 4', ['4'], 'metro'), '5': ('5호선', 'Line 5', ['5'], 'metro'), '6': ('6호선', 'Line 6', ['6'], 'metro'),
    '7': ('7호선', 'Line 7', ['7'], 'metro'), '8': ('8호선', 'Line 8', ['8'], 'metro'), '9': ('9호선', 'Line 9', ['9'], 'metro'),
    'gyeongui-jungang': ('경의·중앙선', 'Gyeongui Jungang Line', ['경의', '중앙'], 'double'),
    'shinbundang': ('신분당선', 'Shinbundang Line', ['신분당'], 'double'),
    'suin-bundang': ('수인분당선', 'Suin Bundang Line', ['수인', '분당'], 'double'),
    'airport': ('공항철도', 'Airport Railroad', ['공항', '철도'], 'double'),
    'incheon-1': ('인천1호선', 'Incheon Line 1', ['인천', '1'], 'double'),
    'gtx-a': ('수도권광역급행철도A선', 'GTX-A', ['GTX', 'A'], 'double'),
    'uijeongbu': ('의정부경전철', 'Uijeongbu Lrt', ['의정부'], 'light'),
    'ui-sinseol': ('우이신설선', 'Ui Sinseol Line', ['우이', '신설'], 'light'),
    'gimpo-gold': ('김포골드라인', 'Gimpo Goldline', ['김포', '골드'], 'light'),
    'incheon-2': ('인천2호선', 'Incheon Line 2', ['인천', '2'], 'light'),
    'everline': ('용인에버라인', 'Yongin Everline', ['용인', '에버'], 'light'),
    'sillim': ('신림선', 'Sillim Line', ['신림'], 'light'),
    'gyeongchun': ('경춘선', 'Gyeongchun Line', ['경춘'], 'dashed'),
    'gyeonggang': ('경강선', 'Gyeonggang Line', ['경강'], 'dashed'),
    'seohae': ('서해선', 'Seohae Line', ['서해'], 'dashed'),
}
COLOUR = dict(pdf); COLOUR['gtx-a'] = '#956382'
lines = [{'id': L['id'], 'name': META[L['id']][0], 'en': META[L['id']][1], 'badge': META[L['id']][2], 'colour': COLOUR[L['id']], 'kind': META[L['id']][3]}
         for L in ours['lines']]

r1 = lambda v: round(float(v), 1)
stations = []
for sid, s in st.items():
    x, y = pos[sid]
    transfer = len(linesAt[sid]) > 1
    d = None
    if transfer and sid in discs:
        items = sorted(discs[sid].items(), key=lambda kv: (round(kv[1][1] / 3), kv[1][0]))
        d = [{'line': l, 'dx': r1(p[0] - x), 'dy': r1(p[1] - y)} for l, p in items]
    lab = labels.get(sid)
    ks = SIZES['kt'] if transfer else SIZES['kp']; es = SIZES['et'] if transfer else SIZES['ep']
    if lab:
        label = {'kx': r1(lab['kx']), 'ky': r1(lab['ky']), 'split': lab.get('split'), 'ks': r1(lab['ksize']), 'kt': lab['ktrk']}
        if lab['ex'] is not None: label.update(ex=r1(lab['ex']), ey=r1(lab['ey']), es=r1(lab['esize']), et=lab['etrk'])
        else: label.update(ex=label['kx'], ey=r1(label['ky'] + es * 1.15), es=es, et=0)
    else:
        reach = (max(np.hypot(p['dx'], p['dy']) for p in d) + 10) if d else 6
        label = {'kx': r1(reach), 'ky': r1(ks * 0.35), 'split': None, 'ks': ks, 'kt': 0.1 if not transfer else 0,
                 'ex': r1(reach), 'ey': r1(ks * 0.35 + es * 1.15), 'es': es, 'et': 0}
    branch = (not transfer) and any(v >= 3 for v in deg[sid].values())
    stations.append({'id': sid, 'name': s['name'], 'en': official_en(s.get('en')), 'x': r1(x), 'y': r1(y), 'lines': sorted(linesAt[sid]),
                     'discs': d, 'branch': branch, 'label': label})

edges = []
for e in b['edges']:
    p = np.array(e['trace'])
    if len(p) >= 3: p = approximate_polygon(p, 0.35)
    edges.append({'line': e['line'], 'a': e['a'], 'b': e['b'], 'points': [r1(v) for q in p for v in q]})

BADGES = [('gyeongui-jungang', 49, 285), ('gyeongui-jungang', 2432, 988), ('gtx-a', 165, 415), ('gtx-a', 1364, 2382), ('3', 255, 439), ('3', 1887, 1863),
          ('gimpo-gold', 50, 617), ('incheon-2', 125, 767), ('incheon-2', 436, 2037), ('incheon-1', 232, 844), ('incheon-1', 214, 2362),
          ('5', 369, 798), ('5', 2432, 1112), ('5', 2173, 1728), ('9', 273, 954), ('9', 2122, 1462), ('1', 2431, 71), ('1', 214, 2473),
          ('7', 2015, 318), ('7', 87, 1454), ('4', 2254, 415), ('6', 1856, 584), ('6', 858, 646), ('2', 1773, 1193), ('2', 746, 1405),
          ('8', 2131, 857), ('ui-sinseol', 1466, 262), ('uijeongbu', 2312, 302), ('gyeongchun', 2431, 225), ('gyeonggang', 2487, 2404),
          ('seohae', 821, 2382), ('everline', 2368, 2401), ('sillim', 1123, 1933), ('shinbundang', 1418, 2228), ('airport', 48, 2267),
          ('suin-bundang', 1603, 1177)]
badges = [{'line': l, 'x': x, 'y': y} for l, x, y in BADGES]
out = {'source': '서울특별시 서울 지하철 노선도 (2026-03), news.seoul.go.kr/culture/archives/522224; topology OpenStreetMap contributors (ODbL)',
       'size': [2555, 2560],
       'ground': {'seoul': ground['seoul'], 'river': ground['water'], 'sea': []},
       'lines': lines, 'stations': stations, 'edges': edges, 'badges': badges}
json.dump(out, open(sys.argv[1], 'w'), ensure_ascii=False, separators=(',', ':'))
import os; print('stations', len(stations), 'edges', len(edges), 'points', sum(len(e['points']) // 2 for e in edges), 'bytes', os.path.getsize(sys.argv[1]))
