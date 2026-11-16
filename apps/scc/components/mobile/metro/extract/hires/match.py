import json, sys, numpy as np, os
from PIL import Image, ImageDraw, ImageFont
from scipy.signal import fftconvolve
Image.MAX_IMAGE_PIXELS=None
FD=os.path.dirname(os.path.abspath(__file__))+'/fontsrc/'
WN={500:'Medium',700:'Bold',800:'ExtraBold'}
J='official.json'
K=7089/2555
def load_ink():
    if os.path.exists('ink.npy'): return np.load('ink.npy')
    im=np.asarray(Image.open('ref/orig.jpg').convert('RGB')).astype(np.int16)
    mx=im.max(2); mn=im.min(2)
    ink=(np.clip((200-mx)/165,0,1)*((mx-mn)<45)).astype(np.float32)
    np.save('ink.npy',ink); return ink
_f={}
def font(w,px):
    k=(w,round(px*4))
    if k not in _f: _f[k]=ImageFont.truetype(FD+f'SeoulAlrim-{WN[w]}.otf', k[1]/4)
    return _f[k]
_t={}
def template(text,w,size,trk):
    """size, in map units. returns arr(hi-res px), baseline y from top, pen-left x from left (px)"""
    key=(text,w,round(size,2),trk)
    if key in _t: return _t[key]
    px=size*K; f=font(w,px); asc,desc=f.getmetrics()
    adv=[f.getlength(c) for c in text]; total=sum(adv)+trk*px*(len(text)-1)
    img=Image.new('L',(int(total)+16,asc+desc+16),0); d=ImageDraw.Draw(img); x=8.0
    for c,a in zip(text,adv):
        d.text((x,8+asc),c,fill=255,font=f,anchor='ls'); x+=a+trk*px
    arr=np.asarray(img,np.float32)/255
    ys,xs=np.nonzero(arr>0.05)
    if not len(xs): r=(None,0,0)
    else: r=(arr[ys.min():ys.max()+1,xs.min():xs.max()+1],8+asc-ys.min(),xs.min()-8)
    _t[key]=r; return r
def ncc(win,t):
    h,w=t.shape; tz=t-t.mean(); tn=np.sqrt((tz*tz).sum())
    num=fftconvolve(win,tz[::-1,::-1],'valid')
    c1=np.pad(win,((1,0),(1,0))).cumsum(0).cumsum(1); c2=np.pad(win*win,((1,0),(1,0))).cumsum(0).cumsum(1)
    def box(c): return c[h:,w:]-c[:-h,w:]-c[h:,:-w]+c[:-h,:-w]
    s=box(c1); s2=box(c2); var=np.maximum(s2-s*s/(h*w),1e-6)
    return num/(np.sqrt(var)*tn+1e-6)
def find(ink,text,w,size,trk,cx,cy,R,mask=None):
    """cx,cy,R in map units. returns dict pen origin (map units), score, box(map units)"""
    t,by,lx=template(text,w,size,trk)
    if t is None: return None
    H,W=ink.shape
    x0,x1=int(max(0,(cx-R)*K)),int(min(W,(cx+R)*K)); y0,y1=int(max(0,(cy-R)*K)),int(min(H,(cy+R)*K))
    win=ink[y0:y1,x0:x1]
    if mask is not None:
        win=win.copy(); a,b,c,d=[int(v*K) for v in mask]; win[max(0,b-y0):max(0,d-y0),max(0,a-x0):max(0,c-x0)]=0
    if win.shape[0]<=t.shape[0] or win.shape[1]<=t.shape[1]: return None
    r=ncc(win,t); j=np.unravel_index(np.argmax(r),r.shape)
    tx,ty=x0+j[1],y0+j[0]
    return {'x':(tx-lx)/K,'y':(ty+by)/K,'score':float(r[j]),'box':(tx/K,ty/K,(tx+t.shape[1])/K,(ty+t.shape[0])/K)}
