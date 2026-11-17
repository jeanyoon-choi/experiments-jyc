# Finds each anchor shot's stable run and writes ffmpeg crop parameters that put
# the eyes of every shot at the same place of a 608x1080 frame.
import json, statistics as st, sys
W,H=608,1080; IO=87.0; EY=0.266
SRC={"sb":(1920,1080),"sc":(1920,1080),"sd":(1920,1080),"sa":(1920,1080),"na":(1280,720),"nb":(1280,720),"ne":(1280,720)}
out={}
for f,(sw,sh) in SRC.items():
    rows=[json.loads(l) for l in open(f+".jsonl")]
    eyes=[]
    for r in rows:
        fa=r.get("face")
        eyes.append(((fa[82]+fa[84])/2,(fa[83]+fa[85])/2,abs(fa[84]-fa[82])) if fa and len(fa)==174 else None)
    good=[e for e in eyes if e]
    mx=st.median(e[0] for e in good); mio=st.median(e[2] for e in good)
    ok=[bool(e) and abs(e[0]-mx)<0.03 and abs(e[2]-mio)<0.2*mio for e in eyes]
    # longest run allowing 3-frame gaps
    best=(0,0);s=None;gap=0
    for i,o in enumerate(ok+[False]*5):
        if o:
            if s is None: s=i
            last=i;gap=0
        elif s is not None:
            gap+=1
            if gap>3:
                if last-s>best[1]-best[0]: best=(s,last)
                s=None
    a,b=best
    sel=[eyes[i] for i in range(a,b+1) if eyes[i]]
    ex=st.median(e[0] for e in sel)*sw; ey=st.median(e[1] for e in sel)*sh; io=st.median(e[2] for e in sel)*sw
    sc=IO/io; cw=W/sc; ch=H/sc; x=ex-cw/2; y=ey-EY*ch
    out[f]=dict(a=a,b=b,n=b-a+1,scale=round(sc,4),crop=[round(cw),round(ch),round(x),round(y)],fits=(x>=0 and y>=0 and x+cw<=sw and y+ch<=sh))
    print(f,out[f])
json.dump(out,open("align.json","w"))
