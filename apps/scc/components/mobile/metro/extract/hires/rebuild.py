# Re-reads the network geometry from the 7089-px original: anchors, line paths, station dots.
import sys, json, numpy as np, collections
from scipy import ndimage as ndi
from scipy.spatial import cKDTree
from skimage.graph import MCP_Geometric
from skimage.measure import approximate_polygon
from skimage.morphology import disk
K=7089/2555
J='official.json'
d=json.load(open(J)); ids=[l['id'] for l in d['lines']]; kind={l['id']:l['kind'] for l in d['lines']}
cls=np.load('cls.npy'); H,W=cls.shape
DISCS=json.load(open('discs.json')); DOTS=json.load(open('dots.json'))
printed=json.load(open('printed.json')); pal=np.array([printed[i] for i in ids])
for q in DOTS: q['line']=ids[int(np.abs(pal-np.array(q['col'])).max(1).argmin())]
st={s['id']:s for s in d['stations']}
log=[]
# ---- 1. anchors
SINGLE={'구로','금천구청','병점','성수','강동','문산','가좌'}
for s in d['stations']:
    if s['name'] in SINGLE and not s['discs']: s['discs']=[{'line':s['lines'][0],'dx':0,'dy':0}]
    if s['discs']:
        P=[]
        for q in s['discs']:
            x,y=s['x']+q['dx'],s['y']+q['dy']
            c=min((np.hypot(D['x']-x,D['y']-y),D['x'],D['y']) for D in DISCS if D['line']==q['line'])
            if c[0]>6: log.append(('disc?',s['name'],q['line'])); P.append((x,y))
            else: P.append((c[1],c[2]))
        P=np.array(P); cx,cy=P.mean(0); s['x'],s['y']=float(cx),float(cy)
        for q,p in zip(s['discs'],P): q['dx'],q['dy']=float(p[0]-cx),float(p[1]-cy)
        s['branch']=False
def disc_of(sid,line):
    s=st[sid]
    for q in (s['discs'] or []):
        if q['line']==line: return np.array([s['x']+q['dx'],s['y']+q['dy']])
    return np.array([s['x'],s['y']])
dtree=cKDTree([[q['x'],q['y']] for q in DOTS])
# ---- chains
by=collections.defaultdict(list)
for e in d['edges']: by[e['line']].append(e)
exec(open('clean_lib.py').read())
_P=np.array([disc_of(s['id'],'2') for s in d['stations'] if s['discs'] and any(q['line']=='2' for q in s['discs'])])
for _ in range(3):
    cx2,cy2,r2=fit_circle(_P); dd=np.abs(np.hypot(_P[:,0]-cx2,_P[:,1]-cy2)-r2); _P=_P[dd<max(4,np.median(dd)*3)]
print('circle',cx2,cy2,r2,len(_P))
def chains():
    out=[]
    for line,es in by.items():
        adj=collections.defaultdict(list)
        for e in es:
            p=np.array(e['points']).reshape(-1,2); adj[e['a']].append((e['b'],p)); adj[e['b']].append((e['a'],p[::-1]))
        anchor=lambda s: bool(st[s]['discs']) or len(adj[s])!=2
        used=set()
        for a in adj:
            if not anchor(a): continue
            for b,p in adj[a]:
                if (a,b) in used: continue
                idsc=[a,b]; pts=[p]; used.add((a,b)); used.add((b,a))
                while not anchor(idsc[-1]):
                    cur=idsc[-1]; nb=[(n,q) for n,q in adj[cur] if n!=idsc[-2]][0]
                    idsc.append(nb[0]); pts.append(nb[1]); used.add((cur,nb[0])); used.add((nb[0],cur))
                P=[pts[0]]+[s[1:] for s in pts[1:]]
                out.append({'line':line,'ids':idsc,'old':np.concatenate(P),'deg':{k:len(v) for k,v in adj.items()}})
    return out
CH=chains()
# plain anchors (termini, junction dots): snap to the nearest dot of the line
for c in CH:
    for i in (c['ids'][0],c['ids'][-1]):
        s=st[i]
        if s['discs'] or s.get('_snapped'): continue
        cand=[(np.hypot(q['x']-s['x'],q['y']-s['y']),q) for q in DOTS if q['line']==c['line']]
        dd,q=min(cand,key=lambda t:t[0]) if cand else (99,None)
        if dd<25: s['x'],s['y']=q['x'],q['y']; s['_snapped']=True
        else: log.append(('anchor dot?',s['name'],c['line'],round(float(dd),1)))
SE=disk(8)
def local(line,pa,pb,pad=170):
    li=ids.index(line)
    x0=int(max(0,(min(pa[0],pb[0])-pad)*K)); x1=int(min(W,(max(pa[0],pb[0])+pad)*K)); y0=int(max(0,(min(pa[1],pb[1])-pad)*K)); y1=int(min(H,(max(pa[1],pb[1])+pad)*K))
    c=cls[y0:y1,x0:x1]; m=ndi.binary_closing(np.pad(c==li,10),SE)[10:-10,10:-10]
    return x0,y0,c,m
def route(line,pa,pb,avoid):
    x0,y0,c,m=local(line,pa,pb)
    dt=ndi.distance_transform_edt(m); hw={'metro':9.5,'double':7.5,'dashed':7.5,'light':5.5}[kind[line]]
    cost=np.where(m,1+3*np.clip(1-dt/hw,0,1),np.where(c!=255,14.0,45.0))
    yy,xx=np.mgrid[0:c.shape[0],0:c.shape[1]]
    for a in avoid:
        ax,ay=a[0]*K-x0,a[1]*K-y0
        if -40<ax<c.shape[1]+40 and -40<ay<c.shape[0]+40: cost[(xx-ax)**2+(yy-ay)**2<(10*K)**2]=600.0
    s0=(int(pa[1]*K)-y0,int(pa[0]*K)-x0); e0=(int(pb[1]*K)-y0,int(pb[0]*K)-x0)
    mcp=MCP_Geometric(cost); mcp.find_costs([s0],[e0]); p=np.array(mcp.traceback(e0),float)
    return np.stack([(p[:,1]+x0+0.5)/K,(p[:,0]+y0+0.5)/K],1)
def smooth(p,k=6):
    if len(p)<2*k+3: return p
    c=np.cumsum(np.vstack([[0,0],p]),0); q=p.copy(); q[k:len(p)-k]=(c[2*k+1:]-c[:-2*k-1])/(2*k+1); return q
def resamp(P,step=0.7):
    s=arclen(P); t=np.arange(0,s[-1],step); return np.stack([np.interp(t,s,P[:,0]),np.interp(t,s,P[:,1])],1)
def frac(line,P,trim=11):
    """share of the path lying on the line's own colour"""
    if len(P)<2: return 0
    S=resamp(np.asarray(P,float)); s=arclen(S)
    S=S[(s>trim)&(s<s[-1]-trim)] if s[-1]>3*trim else S
    if not len(S): return 1.0
    li=ids.index(line); r=2 if kind[line] in('metro','light') else 7
    ok=0
    for x,y in S:
        yy,xx=int(y*K),int(x*K)
        ok+= (cls[max(0,yy-r):yy+r+1,max(0,xx-r):xx+r+1]==li).any()
    return ok/len(S)
all_discs=[(s['id'],q['line'],disc_of(s['id'],q['line'])) for s in d['stations'] for q in (s['discs'] or [])]
new_edges=[]; rep=[]
plain_new={}
for c in CH:
    line=c['line']; A,B=c['ids'][0],c['ids'][-1]; pa,pb=disc_of(A,line),disc_of(B,line)
    avoid=[p for sid,l,p in all_discs if l==line and sid not in (A,B)]
    avoid+=[np.array([s['x'],s['y']]) for s in d['stations'] if not s['discs'] and s.get('_snapped') and line in s['lines'] and s['id'] not in (A,B)]
    try:
        full=route(line,pa,pb,avoid); raw=smooth(full); raw[0]=pa; raw[-1]=pb
        raw=raw[::3] if len(raw)>12 else raw; raw[-1]=pb
        soft=smooth(smooth(full,10),10); soft[0]=pa; soft[-1]=pb; soft=approximate_polygon(soft,0.25)
        nA=len(st[A]['discs'] or []); nB=len(st[B]['discs'] or [])
        FREE_A=(17 if nA>=3 else 12.5) if nA else 0; FREE_B=(17 if nB>=3 else 12.5) if nB else 0
        # what lies under the capsules is not the line: drop it from the trace
        keep=(np.hypot(*(raw-pa).T)>FREE_A)&(np.hypot(*(raw-pb).T)>FREE_B)
        if keep.sum()>=6: raw=raw[keep]
        new=clean_chain(raw,line,pa,pb)
    except Exception as ex:
        new=None; log.append(('route fail',line,st[A]['name'],st[B]['name'],str(ex)[:60]))
    old=c['old'].copy()
    fo=frac(line,old); fn=frac(line,new) if new is not None else -1; fr=frac(line,soft) if new is not None else -1
    if fn>=fo-0.08 and fn>=fr-0.06: P,src=new,'new'
    elif fr>fo+0.03: P,src=soft,'raw'
    else: P,src=old,'old'
    c['path']=np.asarray(P,float); rep.append((line,st[A]['name'],st[B]['name'],round(fo,3),round(fn,3),round(fr,3),src))
    # ---- stations on the dots along the path
    P=c['path']; s_=arclen(P); inner=c['ids'][1:-1]
    if inner:
        near=[]
        for j in dtree.query_ball_point(P[::1].tolist(),4.0) if False else [range(len(DOTS))]:
            pass
        pts=np.array([[q['x'],q['y']] for q in DOTS])
        bb=(pts[:,0]>P[:,0].min()-5)&(pts[:,0]<P[:,0].max()+5)&(pts[:,1]>P[:,1].min()-5)&(pts[:,1]<P[:,1].max()+5)
        for k in np.nonzero(bb)[0]:
            sv,qq=project(P,pts[k]); dd=float(np.hypot(*(qq-pts[k])))
            if dd<(3.2 if src=='raw' else 2.4) and 5<sv<s_[-1]-5: near.append((sv,k,dd))
        near.sort()
        if len(near)!=len(inner):
            same=[n for n in near if DOTS[n[1]]['line']==line]
            if len(same)==len(inner): near=same
        if len(near)==len(inner):
            for sid,(sv,k,dd) in zip(inner,near): plain_new[sid]=(float(pts[k][0]),float(pts[k][1]),sv)
            c['cuts']=[n[0] for n in near]
        else:
            log.append(('dots',line,st[A]['name'],st[B]['name'],'need',len(inner),'found',len(near),src,[st[i]['name'] for i in inner]))
            c['cuts']=[project(P,np.array([st[i]['x'],st[i]['y']]))[0] for i in inner]
            c['cuts']=sorted(c['cuts'])
    else: c['cuts']=[]
    pieces=cut(P,c['cuts'])
    for k,pc in enumerate(pieces):
        new_edges.append({'line':line,'a':c['ids'][k],'b':c['ids'][k+1],'points':[round(float(v),2) for q in pc for v in q]})
for sid,(x,y,sv) in plain_new.items(): st[sid]['x'],st[sid]['y']=x,y
for s in d['stations']:
    s.pop('_snapped',None); s['x']=round(s['x'],2); s['y']=round(s['y'],2)
    for q in (s['discs'] or []): q['dx']=round(q['dx'],2); q['dy']=round(q['dy'],2)
d['edges']=new_edges
json.dump(d,open('geo.json','w'),ensure_ascii=False)
cnt=collections.Counter(r[-1] for r in rep); print(cnt)
print('low:'); [print(r) for r in sorted(rep,key=lambda r:max(r[3],r[4],r[5]) ) if max(r[3:6])<0.93]
print('LOG'); [print(l) for l in log]
json.dump(rep,open('rep.json','w'),ensure_ascii=False)
