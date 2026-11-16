import sys; sys.path.insert(0,sys.argv[1])
import json, numpy as np
from scipy import ndimage as ndi
from match import *
ink=load_ink(); d=json.load(open('geo.json'))
OV=json.load(open('overrides.json'))
KP=(700,12.7); EP=(700,6.9); KT=(800,14.6); ET=(700,10.0)
SINGLE={'구로','금천구청','병점','성수','강동','문산','가좌'}
def bdist(b,pts):
    return min(float(np.hypot(max(b[0]-x,0,x-b[2]),max(b[1]-y,0,y-b[3]))) for x,y in pts)
def cands(text,w,size,cx,cy,R,masks=(),Ry=None):
    t,by,lx=template(text,w,size,0)
    if t is None: return []
    H,W=ink.shape; Rx=R+t.shape[1]/K; Ry=(Ry or R)+t.shape[0]/K
    x0,x1=int(max(0,(cx-Rx)*K)),int(min(W,(cx+Rx)*K)); y0,y1=int(max(0,(cy-Ry)*K)),int(min(H,(cy+Ry)*K))
    win=ink[y0:y1,x0:x1]
    if masks:
        win=win.copy()
        for m in masks:
            a,b,c,e=[int(v*K) for v in m]; win[max(0,b-y0):max(0,e-y0),max(0,a-x0):max(0,c-x0)]=0
    if win.shape[0]<=t.shape[0] or win.shape[1]<=t.shape[1]: return []
    r=ncc(win,t); mx=ndi.maximum_filter(r,size=9); best=float(r.max())
    ys,xs=np.nonzero((r==mx)&(r>max(0.25,0.6*best)))
    out=[]
    for j,i in zip(ys,xs):
        tx,ty=x0+i,y0+j
        out.append({'t':text,'w':w,'s':size,'x':(tx-lx)/K,'y':(ty+by)/K,'score':float(r[j,i]),'box':(tx/K,ty/K,(tx+t.shape[1])/K,(ty+t.shape[0])/K)})
    return sorted(out,key=lambda c:-c['score'])
def rows_near(texts,w,size,first,masks):
    rows=[first]
    for t in texts[1:]:
        b=rows[-1]['box']; cs=cands(t,w,size,(b[0]+b[2])/2,b[3]+size*0.75,size*1.6+20,list(masks)+[r['box'] for r in rows],Ry=size*1.2)
        cs=[c for c in cs if c['box'][1]>b[1]+size*0.5 and c['box'][1]<b[3]+size*1.2]
        if not cs: return None
        rows.append(cs[0])
    return rows
def union(rows): 
    bs=[r['box'] for r in rows]; return (min(b[0] for b in bs),min(b[1] for b in bs),max(b[2] for b in bs),max(b[3] for b in bs))
def kr_match(name,s,pts,styles,ov,M=()):
    best=None
    for w,size in styles:
        D=38 if size>13 else 30
        opts=[ov] if ov else [[name]]+([[name[:i],name[i:]] for i in range(2,len(name)-1)] if len(name)>=4 else [])
        for parts in opts:
            cs=[c for c in cands(parts[0],w,size,s['x'],s['y'],70,list(M)) if bdist(c['box'],pts)<=D+(size*1.3 if len(parts)>1 else 0)]
            if not cs: continue
            rows=rows_near(parts,w,size,cs[0],list(M)) if len(parts)>1 else [cs[0]]
            if not rows: continue
            sc=min(r['score'] for r in rows)
            if best is None or sc>best[0]+(0.08 if len(parts)>1 and not ov else 0): best=(sc,rows)
            if len(parts)==1 and sc>0.8 and not ov: break
    return best
def bonus(c,kb):
    bx0,by0,bx1,by1=kb; ex0,ey0,ex1,ey1=c['box']
    below=-2<=ey0-by1<=8 and (abs(ex0-bx0)<6 or abs((ex0+ex1)-(bx0+bx1))/2<6 or abs(ex1-bx1)<6)
    side=(0<=ex0-bx1<=9 or 0<=bx0-ex1<=9) and (abs(ey1-by1)<6 or (ey0>by0-2 and ey1<by1+4))
    return 0.2 if (below or side) else 0
def en_match(opts,krows,styles,extra,wide=0,M=()):
    kb=union(krows+extra); masks=[r['box'] for r in krows+extra]+list(M)
    cx,cy=(kb[0]+kb[2])/2,(kb[1]+kb[3])/2
    best=None
    for w,size in styles:
        for parts in opts:
            cs=cands(parts[0],w,size,cx,cy,(kb[2]-kb[0])/2+14+wide,masks,Ry=(kb[3]-kb[1])/2+16+wide/2)
            if not cs: continue
            cs=sorted(cs,key=lambda c:-(c['score']+bonus(c,kb))); f=cs[0]
            rows=rows_near(parts,w,size,f,masks) if len(parts)>1 else [f]
            if not rows: continue
            sc=min(r['score'] for r in rows); adj=sc+bonus(f,kb)-(0.06*(len(parts)-1))
            if best is None or adj>best[2]: best=(sc,rows,adj)
    return best
def solve(s,M=()):
    ov=OV.get(s['name'],{}); name=ov.get('name',s['name'])
    tr=bool(s['discs']); pts=[(s['x']+q['dx'],s['y']+q['dy']) for q in s['discs']] if tr else [(s['x'],s['y'])]
    single=s['name'] in SINGLE
    k=kr_match(name,s,pts,[KT,KP] if single else [KT] if tr else [KP],ov.get('k'),M)
    rec={'name':name,'en':s.get('en'),'ks':0,'k':None,'es':0,'e':None,'x':[]}
    if not k: return rec
    rec['ks'],rec['k']=k
    extra=[]
    for t in ov.get('x',[]):
        b=union(k[1]+extra); bestx=None
        for size in (4.5,5.0,5.5,6.0,6.5,7.0,7.5,8.0,8.5,9.0):
            for c in cands(t,700,size,(b[0]+b[2])/2,b[3]+6,(b[2]-b[0])/2+12,[r['box'] for r in k[1]+extra]+list(M),Ry=10):
                if bestx is None or c['score']>bestx['score']: bestx=c
        if bestx: extra.append(bestx)
    rec['x']=extra
    eo=ov.get('e')
    if eo: opts=eo if isinstance(eo[0],list) else [eo]
    elif s.get('en'):
        en=s['en']; words=en.split(' '); opts=[[en]]
        for i in range(1,len(words)): opts.append([' '.join(words[:i]),' '.join(words[i:])])
        for i in range(1,len(words)):
            for j in range(i+1,len(words)): opts.append([' '.join(words[:i]),' '.join(words[i:j]),' '.join(words[j:])])
    else: opts=None
    if opts:
        sty=[(700,z) for z in ov['es']] if ov.get('es') else [ET,EP] if single else [ET] if tr else [EP]
        e=en_match(opts,k[1],sty,extra,M=M)
        if not e or e[0]<0.5:
            e2=en_match(opts,k[1],[ET,EP] if single else [ET] if tr else [EP],extra,wide=50,M=M)
            if e2 and (not e or e2[0]>e[0]+0.15): e=e2
        if e:
            rows=[]
            for r in e[1]:
                words=r['t'].split(' ')
                if r['score']<0.66 and len(words)>1:
                    # word spacing on the map differs from the font's: place each word on its own
                    ws=[]; b0=r['box']; okw=True
                    for wd in words:
                        cs=[c for c in cands(wd,r['w'],r['s'],(b0[0]+b0[2])/2,(b0[1]+b0[3])/2,(b0[2]-b0[0])/2+6,[q['box'] for q in k[1]+extra+ws]+list(M),Ry=2.5) if abs(c['y']-r['y'])<1.6]
                        if ws: cs=[c for c in cs if c['box'][0]>ws[-1]['box'][2]-1]
                        if not cs or cs[0]['score']<0.55: okw=False; break
                        ws.append(cs[0])
                    if okw: rows+=ws; continue
                rows.append(r)
            rec['es'],rec['e']=min(r['score'] for r in rows),rows
    else: rec['es']=1.0; rec['e']=[]
    return rec
out={s['id']:solve(s) for s in d['stations']}
def boxes(v): return [r['box'] for r in (v['k'] or [])+(v['x'] or [])+(v['e'] or [])]
def hit(a,b): 
    w=min(a[2],b[2])-max(a[0],b[0]); h=min(a[3],b[3])-max(a[1],b[1])
    return w>1 and h>1 and w*h>0.25*min((a[2]-a[0])*(a[3]-a[1]),(b[2]-b[0])*(b[3]-b[1]))
st_={s['id']:s for s in d['stations']}
for rnd in range(3):
    ids=list(out); conf=set()
    for a in range(len(ids)):
        for b in range(a+1,len(ids)):
            sa,sb=st_[ids[a]],st_[ids[b]]
            if abs(sa['x']-sb['x'])>220 or abs(sa['y']-sb['y'])>120: continue
            if any(hit(p,q) for p in boxes(out[ids[a]]) for q in boxes(out[ids[b]])):
                # the weaker of the two looks again with the other's place taken
                wa=min(out[ids[a]]['ks'],out[ids[a]]['es']); wb=min(out[ids[b]]['ks'],out[ids[b]]['es'])
                conf.add((ids[a],ids[b]) if wa<wb else (ids[b],ids[a]))
    print('round',rnd,'conflicts',[(out[a]['name'],out[b]['name']) for a,b in conf])
    if not conf: break
    for a,b in conf: out[a]=solve(st_[a],M=boxes(out[b]))
json.dump(out,open('labels.json','w'),ensure_ascii=False)
print('KR low',sorted([(round(v['ks'],2),v['name'],[r['t'] for r in v['k']] if v['k'] else None) for v in out.values() if v['ks']<0.7]))
print('X',[(v['name'],[(r['t'],r['s'],round(r['score'],2)) for r in v['x']]) for v in out.values() if v['x']])
lo=sorted([(round(v['es'],2),v['name'],[r['t'] for r in v['e']] if v['e'] else v.get('en')) for v in out.values() if v['es']<0.5]); print('EN low',len(lo),lo)
print('multi-en',[(v['name'],[r['t'] for r in v['e']]) for v in out.values() if v['e'] and len(v['e'])>1])
print('multi-kr',[[r['t'] for r in v['k']] for v in out.values() if v['k'] and len(v['k'])>1])
