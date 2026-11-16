import json, numpy as np
from PIL import Image
from scipy import ndimage as ndi
Image.MAX_IMAGE_PIXELS=None
K=7089/2555
J='official.json'
im=np.asarray(Image.open('ref/orig.jpg').convert('RGB')).astype(np.int16)
white=im.min(2)>=228
lab,n=ndi.label(white)
objs=ndi.find_objects(lab)
area=ndi.sum(white,lab,np.arange(1,n+1))
d=json.load(open(J)); lines=d['lines']
pal=np.array([[int(l['colour'][i:i+2],16) for i in (1,3,5)] for l in lines])
dots=[]
for i,sl in enumerate(objs):
    a=area[i]
    if not(45<=a<=700): continue
    h=sl[0].stop-sl[0].start; w=sl[1].stop-sl[1].start
    if not(0.75<=w/h<=1.34) or a/(w*h)<0.66: continue
    cy=(sl[0].start+sl[0].stop-1)/2; cx=(sl[1].start+sl[1].stop-1)/2; r=(w+h)/4
    # ring just outside the blob
    th=np.linspace(0,2*np.pi,24,endpoint=False); cols=[]
    for rr in (r+1.6,r+2.6):
        ys=np.clip((cy+rr*np.sin(th)).round().astype(int),0,im.shape[0]-1); xs=np.clip((cx+rr*np.cos(th)).round().astype(int),0,im.shape[1]-1)
        cols.append(im[ys,xs])
    cols=np.concatenate(cols); chroma=cols.max(1)-cols.min(1); dark=cols.max(1)<90
    colored=(chroma>40)|((cols.max(1)<200)&~dark)   # line colours incl. greys (9호선 등)
    if colored.mean()<0.55: continue
    med=np.median(cols[colored],0)
    j=int(np.argmin(((pal-med)**2).sum(1)))
    dots.append({'x':round(cx/K+0.18,2),'y':round(cy/K+0.18,2),'r':round(r/K,2),'col':[int(v) for v in med],'line':lines[j]['id'],'dist':float(np.sqrt(((pal[j]-med)**2).sum())),'frac':float(colored.mean())})
json.dump(dots,open('dots.json','w'))
import collections
print(len(dots),'plain stations',sum(1 for s in d['stations'] if not s['discs']))
print(collections.Counter(q['line'] for q in dots))
print('expected',collections.Counter(s['lines'][0] for s in d['stations'] if not s['discs']))
print('r hist',np.histogram([q['r'] for q in dots],bins=[0,1.5,2,2.5,3,3.5,4,5,8])[0])
