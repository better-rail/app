import warnings; warnings.filterwarnings("ignore")
import json, math, os
REFERENCE = os.environ.get("RAIL_MAP_REFERENCE", "reference.png")
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi
from skimage.measure import label, regionprops

im=np.array(Image.open(REFERENCE).convert("RGB")).astype(int)
H,W,_=im.shape
mx=im.max(-1); mn=im.min(-1); sat=mx-mn
dark=(sat<40)&(mx<175)
L=json.load(open("lines.json")); T=json.load(open("trace.json"))
# station clusters from the per-line station points
clusters={}
for lid,ln in L["lines"].items():
    for sid,i in ln["stationIndex"].items():
        x,y=ln["points"][i]; clusters.setdefault(sid,[]).append((x,y))
cbox={sid:(min(p[0] for p in ps)-6,min(p[1] for p in ps)-6,max(p[0] for p in ps)+6,max(p[1] for p in ps)+6) for sid,ps in clusters.items()}
# remove dots
for d in T["dots"]:
    x,y=int(d["x"]),int(d["y"]); dark[max(0,y-8):y+9,max(0,x-8):x+9]=False
BOXES={"haifa":(155,385,517,536),"telaviv":(155,1062,466,1298),"jerusalem":(751,1489,897,1647),"beersheva":(366,2110,610,2269)}
for x0,y0,x1,y1 in BOXES.values():
    ring=np.zeros_like(dark); ring[y0-4:y1+5,x0-4:x1+5]=True; ring[y0+5:y1-4,x0+5:x1-4]=False; dark&=~ring
# box outlines: long dark runs
boxes_h=[]; boxes_v=[]
rowmask=np.zeros_like(dark)
for y in range(H):
    xs=np.nonzero(dark[y])[0]
    if len(xs)<120: continue
    runs=np.split(xs,np.where(np.diff(xs)>2)[0]+1)
    for r in runs:
        if len(r)>=120: boxes_h.append((int(r[0]),y,int(r[-1]))); rowmask[y,r[0]:r[-1]+1]=True
for x in range(W):
    ys=np.nonzero(dark[:,x])[0]
    if len(ys)<100: continue
    runs=np.split(ys,np.where(np.diff(ys)>2)[0]+1)
    for r in runs:
        if len(r)>=100: boxes_v.append((x,int(r[0]),int(r[-1]))); rowmask[r[0]:r[-1]+1,x]=True
dark&=~ndi.binary_dilation(rowmask,iterations=3)
print("box h-runs",len(boxes_h),"v-runs",len(boxes_v))
# text lines: merge horizontally
lines_mask=ndi.binary_dilation(dark,structure=np.ones((3,9),bool))
lab=label(lines_mask,connectivity=2)
tl=[]
for rp in regionprops(lab):
    y0,x0,y1,x1=rp.bbox
    sub=dark[y0:y1,x0:x1]&(lab[y0:y1,x0:x1]==rp.label)
    ys,xs=np.nonzero(sub)
    if len(ys)<12: continue
    ty0,ty1,tx0,tx1=int(ys.min())+y0,int(ys.max())+y0,int(xs.min())+x0,int(xs.max())+x0
    h=ty1-ty0+1; w=tx1-tx0+1
    if h<5 or w<5: continue
    px=im[ty0:ty1+1,tx0:tx1+1][sub[ys.min():ys.max()+1,xs.min():xs.max()+1]]
    mean=px.mean(0)
    prof=sub[ys.min():ys.max()+1].sum(1); thr=max(prof)*0.3
    bands=[]; cur=None
    for i,v in enumerate(prof):
        if v>=thr:
            if cur is None: cur=[i,i]
            else: cur[1]=i
        else:
            if cur: bands.append(cur); cur=None
    if cur: bands.append(cur)
    body=max([b[1]-b[0]+1 for b in bands],default=h)
    tl.append({"x0":tx0,"y0":ty0,"x1":tx1,"y1":ty1,"h":h,"w":w,"body":int(body),"mean":[int(v) for v in mean]})
print("text lines",len(tl))
# group into blocks
tl.sort(key=lambda t:(t["y0"],t["x0"]))
blocks=[]
for t in tl:
    for b in blocks:
        if t["y0"]-b["y1"]<=7 and t["y0"]>=b["y0"] and min(t["x1"],b["x1"])-max(t["x0"],b["x0"])>-3:
            b["lines"].append(t); b["x0"]=min(b["x0"],t["x0"]); b["x1"]=max(b["x1"],t["x1"]); b["y1"]=max(b["y1"],t["y1"]); break
    else:
        blocks.append({"x0":t["x0"],"y0":t["y0"],"x1":t["x1"],"y1":t["y1"],"lines":[t]})
def gap(a,b):
    dx=max(b[0]-a[2],a[0]-b[2],0); dy=max(b[1]-a[3],a[1]-b[3],0); return math.hypot(dx,dy)
vis=Image.open(REFERENCE).convert("RGB"); dr=ImageDraw.Draw(vis)
out=[]
for b in blocks:
    bb=(b["x0"],b["y0"],b["x1"],b["y1"])
    best=min(((gap(bb,cb),sid) for sid,cb in cbox.items()),key=lambda t:t[0])
    b["station"]=best[1] if best[0]<=40 else None; b["dist"]=round(best[0],1)
    dr.rectangle(bb,outline=(255,0,0) if b["station"] else (0,0,255))
    dr.text((b["x0"],b["y0"]-9),f'{b["station"] or "?"}',fill=(200,0,0))
    out.append(b)
vis.save("labels-vis.png"); json.dump({"blocks":out,"boxes":BOXES,"clusters":cbox},open("labels.json","w"))
for b in out:
    print(b["station"],b["dist"],(b["x0"],b["y0"],b["x1"],b["y1"]),[(t["h"],t["w"],"#%02x%02x%02x"%tuple(t["mean"])) for t in b["lines"]])
