import json, numpy as np, sys
d=json.load(open(sys.argv[1])); st={s['id']:s['name'] for s in d['stations']}
bad=[]
for e in d['edges']:
    p=np.array(e['points']).reshape(-1,2)
    for a,b in zip(p[:-1],p[1:]):
        v=b-a; L=np.hypot(*v)
        if L<8 or e['line']=='2': continue
        ang=np.degrees(np.arctan2(v[1],v[0]))%45; off=min(ang,45-ang)
        if off>1.0: bad.append((e['line'],st[e['a']],st[e['b']],round(L),round(off,1)))
print('off-octilinear pieces', len(bad)); print(bad[:50])
