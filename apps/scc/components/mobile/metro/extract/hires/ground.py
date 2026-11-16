import json, numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.measure import find_contours, approximate_polygon
Image.MAX_IMAGE_PIXELS=None
im=Image.open('ref/orig.jpg').convert('RGB'); im=im.resize((im.width//2,im.height//2),Image.BOX); a=np.asarray(im).astype(np.int16)
K2=a.shape[1]/2555
r,g,b=a[...,0],a[...,1],a[...,2]
grey=(np.abs(r-247)<=3)&(np.abs(g-247)<=3)&(np.abs(b-247)<=3)
white=(r>=252)&(g>=252)&(b>=252)
water=(b-r>=10)&(r>=195)&(b>=235)&(g>=215)
print('share',grey.mean().round(3),white.mean().round(3),water.mean().round(3))
L=np.full(a.shape[:2],255,np.uint8); L[grey]=0; L[white]=1; L[water]=2
# thin slivers of a class inside strokes (anti-aliasing) are not ground: keep only solid areas
for c in (0,1,2):
    m=L==c; solid=ndi.binary_opening(m,np.ones((5,5),bool)); L[m&~solid]=255
unk=L==255
idx=ndi.distance_transform_edt(unk,return_distances=False,return_indices=True)
L=L[idx[0],idx[1]]
L=ndi.median_filter(L,size=11)
# the legend panel at the top and the frame are paper
out={}
for name,c in (('seoul',1),('water',2)):
    m=(L==c)
    lab,n=ndi.label(m); area=ndi.sum(m,lab,np.arange(1,n+1)); keep=np.isin(lab,1+np.nonzero(area>(30*K2)**2)[0])
    # holes smaller than 20 u across are closed
    inv=~keep; lab2,n2=ndi.label(inv); area2=ndi.sum(inv,lab2,np.arange(1,n2+1)); small=np.isin(lab2,1+np.nonzero(area2<(22*K2)**2)[0]); keep|=small
    polys=[]
    for cnt in find_contours(np.pad(keep,1).astype(float),0.5):
        p=approximate_polygon(cnt-1,0.9)
        if len(p)>=4: polys.append([round(float(v)/K2+0.25,1) for q in p for v in (q[1],q[0])])
    out[name]=polys; print(name,len(polys),sum(len(p) for p in polys)//2)
json.dump(out,open('ground2.json','w'))
