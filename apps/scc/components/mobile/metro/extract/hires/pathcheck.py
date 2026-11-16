import json, numpy as np, collections
from PIL import Image
Image.MAX_IMAGE_PIXELS=None
K=7089/2555
J='official.json'
d=json.load(open(J)); st={s['id']:s for s in d['stations']}
im=np.asarray(Image.open('ref/orig.jpg').convert('RGB')).astype(np.int16)
kind={l['id']:l['kind'] for l in d['lines']}
def samples(p,step=1.0):
    P=np.array(p).reshape(-1,2); out=[]
    for a,b in zip(P[:-1],P[1:]):
        n=max(1,int(np.hypot(*(b-a))/step))
        for t in np.linspace(0,1,n,endpoint=False): out.append(a+(b-a)*t)
    out.append(P[-1]); return np.array(out)
def px(x,y): return im[min(im.shape[0]-1,max(0,int(round(y*K)))),min(im.shape[1]-1,max(0,int(round(x*K))))]
# printed colour per line: median of non-white, non-dark samples (centre for solid lines; offset ±2.1u for double)
cols=collections.defaultdict(list); per={}
offs=[(dx,dy) for dx in (-2.2,-1.1,0,1.1,2.2) for dy in (-2.2,-1.1,0,1.1,2.2)]
for e in d['edges']:
    S=samples(e['points'])
    for x,y in S[::3]:
        c=px(x,y)
        if kind[e['line']]=='double':
            best=None
            for dx,dy in offs:
                q=px(x+dx,y+dy)
                if q.max()-q.min()>50 and (best is None or q.max()-q.min()>best.max()-best.min()): best=q
            if best is not None: cols[e['line']].append(best)
        elif c.min()<215 and c.max()>70: cols[e['line']].append(c)
printed={l:np.median(np.array(v),0) for l,v in cols.items()}
json.dump({l:[int(x) for x in v] for l,v in printed.items()},open('printed.json','w'))
print({l:[int(x) for x in v] for l,v in printed.items()})
bad=[]
for e in d['edges']:
    S=samples(e['points']); c0=printed[e['line']]; ok=0
    S=S[8:-8] if len(S)>30 else S
    for x,y in S:
        hit=False
        for dx,dy in (offs if kind[e['line']]!='metro' else [(0,0),(1.1,0),(-1.1,0),(0,1.1),(0,-1.1)]):
            q=px(x+dx,y+dy)
            if np.abs(q-c0).max()<38: hit=True; break
        ok+=hit
    f=ok/len(S)
    if f<0.8: bad.append((round(f,2),e['line'],st[e['a']]['name'],st[e['b']]['name'],len(S)))
print(len(bad),'of',len(d['edges'])); [print(b) for b in sorted(bad)]
