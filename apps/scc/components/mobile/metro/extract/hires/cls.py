# Per-pixel line class of the 7089-px map (255 = none), and every capsule disc on it.
import json, numpy as np
from PIL import Image
from scipy import ndimage as ndi
Image.MAX_IMAGE_PIXELS=None
K=7089/2555
J='official.json'
d=json.load(open(J)); ids=[l['id'] for l in d['lines']]
printed=json.load(open('printed.json')); pal=np.array([printed[i] for i in ids],np.int16)
im=np.asarray(Image.open('ref/orig.jpg').convert('RGB')).astype(np.int16)
H,Wd=im.shape[:2]; cls=np.full((H,Wd),255,np.uint8)
for y in range(0,H,256):
    blk=im[y:y+256]; dist=np.abs(blk[:,:,None,:]-pal[None,None]).max(-1)
    j=dist.argmin(-1); m=np.take_along_axis(dist,j[...,None],-1)[...,0]
    cls[y:y+256]=np.where(m<34,j,255)
np.save('cls.npy',cls)
dark=(im.max(2)<95)
white=(im.min(2)>=225)
discs=[]
for li,lid in enumerate(ids):
    lab,n=ndi.label(cls==li)
    if not n: continue
    objs=ndi.find_objects(lab); area=ndi.sum(np.ones_like(lab,np.uint8),lab,np.arange(1,n+1))
    for i,sl in enumerate(objs):
        a=area[i]
        if not(380<=a<=900): continue
        h=sl[0].stop-sl[0].start; w=sl[1].stop-sl[1].start
        if not(0.85<=w/h<=1.18) or a/(w*h)<0.7: continue
        cy=(sl[0].start+sl[0].stop-1)/2; cx=(sl[1].start+sl[1].stop-1)/2
        th=np.linspace(0,2*np.pi,36,endpoint=False)
        def ring(r,m):
            ys=np.clip((cy+r*K*np.sin(th)).round().astype(int),0,H-1); xs=np.clip((cx+r*K*np.cos(th)).round().astype(int),0,Wd-1); return m[ys,xs].mean()
        wr=ring(6.6,white); dk=ring(9.2,dark)
        if wr<0.5: continue
        discs.append({'line':lid,'x':round(cx/K+0.18,2),'y':round(cy/K+0.18,2),'white':round(float(wr),2),'dark':round(float(dk),2),'area':int(a)})
json.dump(discs,open('discs.json','w'))
print(len(discs),'discs; expected', sum(len(s['discs']) for s in d['stations'] if s['discs']))
