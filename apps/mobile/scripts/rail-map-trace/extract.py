import warnings; warnings.filterwarnings("ignore")
import json, sys, os
REFERENCE = os.environ.get("RAIL_MAP_REFERENCE", "reference.png")
from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage as ndi
from skimage.morphology import skeletonize, binary_closing, disk, remove_small_objects
from skimage.measure import label, regionprops

im=np.array(Image.open(REFERENCE).convert("RGB")).astype(int)
H,W,_=im.shape
COLOURS={ # name -> reference rgb
 "red":(0xE8,0x00,0x00),"orange":(0xF8,0x78,0x00),"green":(0x18,0xC0,0x40),"lime":(0xB0,0xD8,0x18),
 "purple":(0xD0,0x70,0xF8),"blue":(0x00,0x80,0xC8),"lightblue":(0x30,0xC0,0xF8),"pink":(0xF8,0x58,0xB8),
 "magenta":(0xF8,0x00,0x98),"teal":(0x88,0xD0,0xC8)}
def cmask(rgb,tol=48):
    d=np.abs(im-np.array(rgb)).sum(-1)
    m=d<tol
    if rgb==COLOURS["lightblue"]:
        pale=np.abs(im-np.array((0xC3,0xED,0xFF))).sum(-1)<24
        win=np.zeros_like(pale); win[820:1160,330:420]=True
        m=m|(pale&win)
    if rgb==COLOURS["red"]:
        m[1318:1562,352:366]=False  # the original's second red lane (the one with the Bat Yam dots): the app keeps one straight lane
    if rgb==COLOURS["blue"]:
        yy,xx=np.mgrid[0:H,0:W]
        stub=(xx>=455)&(xx<=492)&(yy>=1660)&(yy<=1716)&((yy-1693)>-(xx-456)+7)
        m[stub]=False  # the Rehovot stub is traced separately (see below)
    if rgb==COLOURS["purple"]:
        m[456:476,505:600]=False  # second purple band at the valley junction (drawing artefact)
    return m
# station dots: near-black blobs
black=(im.max(-1)<80)
lab=label(black,connectivity=2)
dots=[]
for rp in regionprops(lab):
    a=rp.area; h=rp.bbox[2]-rp.bbox[0]; w=rp.bbox[3]-rp.bbox[1]
    if 25<=a<=260 and 0.6<=w/max(h,1)<=1.6 and rp.solidity>0.85:
        cy,cx=rp.centroid; dots.append({"x":round(cx,1),"y":round(cy,1),"area":int(a),"w":int(w),"h":int(h)})
dotmask=np.zeros_like(black)
for d in dots:
    pass
dotlab=np.isin(lab,[i+1 for i,rp in enumerate(regionprops(lab)) if 25<=rp.area<=260 and 0.6<=(rp.bbox[3]-rp.bbox[1])/max(rp.bbox[2]-rp.bbox[0],1)<=1.6 and rp.solidity>0.85])
print("dots",len(dots))

def trace(mask):
    sk=skeletonize(mask,method="lee")>0
    ys,xs=np.nonzero(sk)
    pts=set(zip(xs.tolist(),ys.tolist()))
    def nb(p):
        x,y=p; return [(x+dx,y+dy) for dx in(-1,0,1) for dy in(-1,0,1) if (dx or dy) and (x+dx,y+dy) in pts]
    deg={p:len(nb(p)) for p in pts}
    nodes={p for p in pts if deg[p]!=2}
    # trace edges
    edges=[]; seen=set()
    for n in nodes:
        for m in nb(n):
            key=(n,m)
            if key in seen: continue
            path=[n,m]; seen.add(key); prev=n; cur=m
            while cur not in nodes:
                nx=[q for q in nb(cur) if q!=prev]
                if not nx: break
                # prefer continuing (avoid 8-conn double counting)
                prev,cur=cur,nx[0]; path.append(cur)
            seen.add((cur,prev))
            edges.append(path)
    # dedupe reversed duplicates
    uniq={}
    for e in edges:
        k=(e[0],e[-1],len(e)) if e[0]<=e[-1] else (e[-1],e[0],len(e))
        if k not in uniq: uniq[k]=e
    edges=list(uniq.values())
    # isolated loops (no nodes) are dropped; fine for this map
    return edges,nodes,deg

def prune(edges,minlen=12,rounds=3):
    for _ in range(rounds):
        cnt={}
        for e in edges:
            for p in (e[0],e[-1]): cnt[p]=cnt.get(p,0)+1
        keep=[]
        for e in edges:
            spur=(cnt[e[0]]==1 or cnt[e[-1]]==1) and len(e)<minlen and not (cnt[e[0]]==1 and cnt[e[-1]]==1)
            if not spur: keep.append(e)
        edges=keep
        # merge degree-2 chains
        cnt={}
        for e in edges:
            for p in (e[0],e[-1]): cnt[p]=cnt.get(p,0)+1
        merged=True
        while merged:
            merged=False
            for i,e in enumerate(edges):
                for endi in (0,-1):
                    p=e[endi]
                    if cnt.get(p,0)==2:
                        for j,f in enumerate(edges):
                            if j==i: continue
                            if f[0]==p or f[-1]==p:
                                a=e if endi==-1 else e[::-1]
                                b=f if f[0]==p else f[::-1]
                                edges[i]=a+b[1:]; edges.pop(j); cnt[p]=0; merged=True; break
                    if merged: break
                if merged: break
    return edges

def simplify(pts,tol):
    if len(pts)<3: return pts
    P=np.array(pts,float)
    def rdp(a,b):
        if b-a<2: return [a,b]
        s=P[a]; e=P[b]; v=e-s; L=np.hypot(*v)
        if L==0: d=np.hypot(*(P[a:b+1]-s).T)
        else: d=np.abs(np.cross(v,P[a:b+1]-s))/L
        i=int(np.argmax(d))
        if d[i]>tol:
            l=rdp(a,a+i); r=rdp(a+i,b); return l[:-1]+r
        return [a,b]
    idx=rdp(0,len(pts)-1)
    return [pts[i] for i in idx]

out={"dots":dots,"colours":{},"badges":{}}
vis=Image.open(REFERENCE).convert("RGB"); dr=ImageDraw.Draw(vis)
for name,rgb in COLOURS.items():
    m=cmask(rgb)
    lab2=label(m,connectivity=2); badges=[]
    keep=np.zeros_like(m)
    for rp in regionprops(lab2):
        h=rp.bbox[2]-rp.bbox[0]; w=rp.bbox[3]-rp.bbox[1]
        filled=rp.filled_area; holes=filled-rp.area
        if holes>=6 and w<=26 and h<=14 and rp.area>=60 and rp.extent>0.45:
            badges.append({"x0":int(rp.bbox[1]),"y0":int(rp.bbox[0]),"x1":int(rp.bbox[3]),"y1":int(rp.bbox[2])})
            continue
        if rp.area<20: continue
        keep[lab2==rp.label]=True
    # add dots touching this colour
    touch=ndi.binary_dilation(keep,iterations=2)&dotlab
    dlab=label(dotlab,connectivity=2)
    ids=np.unique(dlab[touch]); ids=ids[ids>0]
    m2=keep|np.isin(dlab,ids)
    m2=binary_closing(m2,disk(6))
    from skimage.morphology import closing as _closing
    m2=m2|_closing(m2,np.ones((31,1),bool))
    m2=remove_small_objects(m2,40)
    edges,nodes,deg=trace(m2)
    edges=prune(edges)
    polys=[simplify(e,0.8) for e in edges]
    out["colours"][name]=polys; out["badges"][name]=badges
    print(name,"mask px",int(m.sum()),"badges",len(badges),"edges",len(edges),"pts",sum(len(p) for p in polys))
    for p in polys:
        dr.line([tuple(q) for q in p],fill=(0,0,0),width=1)
        dr.ellipse([p[0][0]-2,p[0][1]-2,p[0][0]+2,p[0][1]+2],outline=(255,0,0))
        dr.ellipse([p[-1][0]-2,p[-1][1]-2,p[-1][0]+2,p[-1][1]+2],outline=(255,0,0))
    for b in badges: dr.rectangle([b["x0"],b["y0"],b["x1"],b["y1"]],outline=(0,0,255))
for d in dots: dr.ellipse([d["x"]-1,d["y"]-1,d["x"]+1,d["y"]+1],fill=(255,255,0))
# ---- water: the sea's edge, row by row, is the end of the pale-blue fill that starts at the map's
# left edge (runs broken by the frames' strokes or text are bridged); the original's shoreline
# ribbon runs a few pixels inside it. Then the two lakes on the right.
from skimage.measure import find_contours
bl=im[...,2]-im[...,0]
water=(bl>=14)&(im[...,2]>=225)&(im[...,1]>=215)&(bl<=70)
filled=binary_closing(water,disk(9))  # names and frame strokes printed over the sea are holes in it
coast=[]
for y in range(0,H,2):
    xs=np.nonzero(filled[y,:470])[0]
    if len(xs)==0 or xs[0]>2: break
    runs=np.split(xs,np.where(np.diff(xs)>3)[0]+1)
    coast.append((float(runs[0][-1]),float(y)))
    if runs[0][-1]<3: break
xsr=[p[0] for p in coast]
med=[sorted(xsr[max(0,i-7):i+8])[len(xsr[max(0,i-7):i+8])//2] for i in range(len(xsr))]
sm=[]
for i in range(len(med)):
    a=max(0,i-4); b=min(len(med),i+5); sm.append((sum(med[a:b])/(b-a),coast[i][1]))
shore_pts=simplify(sm,0.8)
water=(bl>=14)&(im[...,2]>=225)&(im[...,1]>=215)&(bl<=70)
lakes=[]
wl=label(water,connectivity=1)
for rp in regionprops(wl):
    if rp.area<3000 or rp.bbox[1]<800: continue
    c=max(find_contours((wl==rp.label).astype(float),0.5),key=len)
    lakes.append([[round(float(q[1]),1),round(float(q[0]),1)] for q in simplify([(float(q[1]),float(q[0])) for q in c],1.5)])
out["water"]={"shore":[[round(x,1),round(y,1)] for x,y in shore_pts],"lakes":lakes}  # shore = the sea's edge
print("shore pts",len(shore_pts),"from",shore_pts[0],"to",shore_pts[-1],"lakes",[len(l) for l in lakes])
vis.save("vis.png")
json.dump(out,open("trace.json","w"))
