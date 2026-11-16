# Offline twin of metro/2's render.ts + labels.ts, for side-by-side checks against the published map.
import json, sys, math
from PIL import Image, ImageDraw, ImageFont
FD='fonts/'
_f={}
def font(w,size):
    k=(w,round(size,2))
    if k not in _f: _f[k]=ImageFont.truetype(FD+f'alrim-{w}.woff2', size)
    return _f[k]
WIDTH={'metro':7.0,'double':5.6,'dashed':5.6,'light':4.0}
def hexrgb(h): n=int(h[1:],16); return ((n>>16)&255,(n>>8)&255,n&255)
def tint(h,a): return tuple(round(255-(255-c)*a) for c in hexrgb(h))
def text_w(f,t,trk,size): return sum(f.getlength(c) for c in t)+trk*size*max(0,len(t)-1)
def label_rows(s,S=1.0):
    return [(t,x,y,w,size,0) for t,x,y,size,w in s['label']['rows']]
def row_box(r):
    t,x,y,w,size,trk=r; f=font(w,size*8); wd=text_w(f,t,trk,size*8)/8
    return (x,y-size*0.82,x+wd,y+size*0.12)
def draw_text(dr,S,ox,oy,r,sx,sy,fill=(35,31,32)):
    t,x,y,w,size,trk=r; f=font(w,size*S); px=(sx+x-ox)*S; py=(sy+y-oy)*S
    for ch in t:
        dr.text((px,py),ch,font=f,fill=fill,anchor='ls'); px+=f.getlength(ch)+trk*size*S
def render(d,x0,y0,x1,y1,S,names=True):
    SS=2; S2=S*SS
    im=Image.new('RGB',(int((x1-x0)*S2),int((y1-y0)*S2)),(247,247,247)); dr=ImageDraw.Draw(im)
    T=lambda x,y:((x-x0)*S2,(y-y0)*S2)
    for key,colr in (('seoul',(255,255,255)),('water',(232,243,251))):
        m=Image.new('1',im.size,0); md=ImageDraw.Draw(m)
        for poly in d['ground'][key]:
            t=Image.new('1',im.size,0); ImageDraw.Draw(t).polygon([T(poly[i],poly[i+1]) for i in range(0,len(poly),2)],fill=1)
            from PIL import ImageChops
            m=ImageChops.logical_xor(m,t)
        im.paste(colr,mask=m)
    dr=ImageDraw.Draw(im)
    kind={l['id']:l['kind'] for l in d['lines']}; col={l['id']:l['colour'] for l in d['lines']}
    st={s['id']:s for s in d['stations']}
    def off(sid,line):
        for q in (st[sid]['discs'] or []):
            if q['line']==line: return q['dx'],q['dy']
        return 0,0
    order={'light':0,'dashed':1,'double':2,'metro':3}
    for e in sorted(d['edges'],key=lambda e:order[kind[e['line']]]):
        p=e['points']; pts=[[p[i],p[i+1]] for i in range(0,len(p),2)]
        q=[T(*v) for v in pts]; w=WIDTH[kind[e['line']]]
        dr.line(q,fill=hexrgb(col[e['line']]),width=max(1,round(w*S2)),joint='curve')
        if kind[e['line']]=='double': dr.line(q,fill=tint(col[e['line']],0.32),width=max(1,round((w-2.7)*S2)),joint='curve')
        if kind[e['line']]=='dashed': dr.line(q,fill=(255,255,255),width=max(1,round(1.0*S2)))
    def circ(cx,cy,r,**k):
        cx,cy=T(cx,cy); r*=S2; dr.ellipse([cx-r,cy-r,cx+r,cy+r],**k)
    for s in d['stations']:
        if s['discs']: continue
        k=kind[s['lines'][0]]
        if k in('double','dashed'): circ(s['x'],s['y'],3.6,fill='white',outline=hexrgb(col[s['lines'][0]]),width=round(1.2*S2))
        else: circ(s['x'],s['y'],2.2,fill='white')
    for r,c in((10.2,(35,31,32)),(8.0,'white')):
        for s in d['stations']:
            for q in (s['discs'] or []): circ(s['x']+q['dx'],s['y']+q['dy'],r,fill=c)
    for s in d['stations']:
        for q in (s['discs'] or []): circ(s['x']+q['dx'],s['y']+q['dy'],5.0,fill=hexrgb(col[q['line']]))
    for b in d['badges']: circ(b['x'],b['y'],14,fill=hexrgb(col[b['line']]))
    if names:
        for s in d['stations']:
            if not(x0-150<s['x']<x1+150 and y0-150<s['y']<y1+150): continue
            for r in label_rows(s): draw_text(dr,S2,x0,y0,r,s['x'],s['y'])
    return im.resize((im.width//SS,im.height//SS),Image.LANCZOS)
if __name__=='__main__':
    d=json.load(open(sys.argv[1])); x0,y0,x1,y1=map(float,sys.argv[2:6]); S=float(sys.argv[6]); out=sys.argv[7]
    im=render(d,x0,y0,x1,y1,S)
    Image.MAX_IMAGE_PIXELS=None
    ref=Image.open('ref/orig.jpg').convert('RGB'); k=ref.width/2555
    rc=ref.crop((int(x0*k),int(y0*k),int(x1*k),int(y1*k))).resize(im.size,Image.LANCZOS)
    c=Image.new('RGB',(im.width*2+8,im.height),'black'); c.paste(rc,(0,0)); c.paste(im,(im.width+8,0)); c.save(out,quality=88)
