import json, sys
sys.path.insert(0,sys.argv[1])
from render import *
Image.MAX_IMAGE_PIXELS=None
d=json.load(open(sys.argv[2])); ref=Image.open('ref/orig.jpg').convert('RGB'); k=ref.width/2555
N=6; T=2560/N; S=2.3
want=sys.argv[3:] 
for r in range(N):
    for c in range(N):
        tag=f'{r}{c}'
        if want and tag not in want: continue
        x0,y0=c*T-12,r*T-12; x1,y1=x0+T+24,y0+T+24
        im=render(d,x0,y0,x1,y1,S)
        rc=ref.crop((int(x0*k),int(y0*k),int(x1*k),int(y1*k))).resize(im.size,Image.LANCZOS)
        o=Image.new('RGB',(im.width*2+8,im.height),'black'); o.paste(rc,(0,0)); o.paste(im,(im.width+8,0)); o.save(f'tiles/t{tag}.jpg',quality=86)
