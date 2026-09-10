import json, re, math, heapq, sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
import numpy as np
from PIL import Image, ImageDraw

T=json.load(open("trace.json"))
DOTS=[(d["x"],d["y"]) for d in T["dots"]]
# rough station positions on the artwork: the pipeline matches the dots on each lane from here
NODES = {k: tuple(v) for k, v in json.load(open(os.path.join(HERE, "station-seeds.json"))).items()}
# lines
lsrc=open(os.path.join(HERE, "../../src/data/rail-lines.ts")).read()
CN={"#B1DB1F":"lime","#0083CD":"blue","#1BC741":"green","#FF7A00":"orange","#FF0099":"magenta","#37C3FF":"lightblue","#EC0000":"red","#FF5FBF":"pink","#8FD0CA":"teal","#D176FF":"purple"}
LINES=[]
for m in re.finditer(r'id: "([^"]+)",\s*badge: "([^"]+)",\s*color: "([^"]+)",.*?stationIds: \[([^\]]*)\]',lsrc,re.S):
    ids=[x.strip().strip('"') for x in m.group(4).split(",") if x.strip()]
    LINES.append({"id":m.group(1),"colour":CN[m.group(3)],"stations":ids})
OVERRIDES={}  # optional manual station points, keyed "lineId:stationId" -> [x, y]
# stations whose dot the original draws on a second lane the app does not keep: the stop moves onto the lane
PROJECTED_STOPS={("6","4640"),("6","4660"),("6","4680"),("6","4690")}

def seg_dist(p,a,b):
    ax,ay=a; bx,by=b; px,py=p
    dx,dy=bx-ax,by-ay; L2=dx*dx+dy*dy
    t=0 if L2==0 else max(0,min(1,((px-ax)*dx+(py-ay)*dy)/L2))
    qx,qy=ax+t*dx,ay+t*dy
    return math.hypot(px-qx,py-qy),(qx,qy),t

class Graph:
    def __init__(self,polys):
        self.nodes=[]; self.edges=[]  # edge: [a,b,pts]
        for pl in polys:
            pl=[tuple(map(float,p)) for p in pl]
            a=self.node(pl[0]); b=self.node(pl[-1]); self.edges.append([a,b,pl])
    def node(self,p,tol=2.5):
        for i,q in enumerate(self.nodes):
            if abs(q[0]-p[0])<=tol and abs(q[1]-p[1])<=tol: return i
        self.nodes.append(p); return len(self.nodes)-1
    def nearest(self,p):
        best=(1e9,None,None,None)
        for ei,(a,b,pts) in enumerate(self.edges):
            for si in range(len(pts)-1):
                d,q,t=seg_dist(p,pts[si],pts[si+1])
                if d<best[0]: best=(d,ei,si,q)
        return best
    def insert(self,p):
        d,ei,si,q=self.nearest(p)
        a,b,pts=self.edges[ei]
        # coincides with an existing node?
        for ni in (a,b):
            if math.hypot(self.nodes[ni][0]-q[0],self.nodes[ni][1]-q[1])<1.5: return ni,d
        n=len(self.nodes); self.nodes.append(q)
        left=pts[:si+1]+[q]; right=[q]+pts[si+1:]
        self.edges[ei]=[a,n,left]; self.edges.append([n,b,right])
        return n,d
    def length(self,pts): return sum(math.hypot(pts[i+1][0]-pts[i][0],pts[i+1][1]-pts[i][1]) for i in range(len(pts)-1))
    def path(self,s,t):
        adj={}
        for ei,(a,b,pts) in enumerate(self.edges):
            L=self.length(pts); adj.setdefault(a,[]).append((b,L,ei,False)); adj.setdefault(b,[]).append((a,L,ei,True))
        dist={s:0}; prev={}; pq=[(0,s)]
        while pq:
            d,u=heapq.heappop(pq)
            if u==t: break
            if d>dist.get(u,1e18): continue
            for v,L,ei,rev in adj.get(u,[]):
                nd=d+L
                if nd<dist.get(v,1e18): dist[v]=nd; prev[v]=(u,ei,rev); heapq.heappush(pq,(nd,v))
        if t not in dist: return None
        out=[]; cur=t
        while cur!=s:
            u,ei,rev=prev[cur]; pts=self.edges[ei][2]; pts=pts[::-1] if rev else pts
            out=pts[1:]+out if out else pts[:]
            if out and out[0]!=pts[0]: out=pts[:-1]+out
            cur=u
        # rebuild cleanly
        seq=[]; cur=t; chain=[]
        while cur!=s:
            u,ei,rev=prev[cur]; chain.append((ei,rev)); cur=u
        chain.reverse(); pts_all=[]
        for ei,rev in chain:
            pts=self.edges[ei][2]; pts=pts[::-1] if rev else pts
            pts_all+= pts if not pts_all else pts[1:]
        return pts_all

def densify(pts,step=1.0):
    out=[tuple(pts[0])]
    for a,b in zip(pts,pts[1:]):
        L=math.hypot(b[0]-a[0],b[1]-a[1]); n=max(1,int(L/step))
        for k in range(1,n+1): out.append((a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n))
    return out

def straighten(pts,tol=2.5,minlen=30,snap=0.7):
    # the original's straight runs are exactly axis-aligned: snap long near-vertical/horizontal runs.
    # The run is trimmed to the points already within `snap` of its median, so the curve it leads into
    # continues without a step.
    pts=[tuple(p) for p in pts]; out=[]; i=0; n=len(pts)
    while i<n:
        best=None
        for axis in (0,1):
            j=i+1; vals=[pts[i][axis]]
            while j<n and abs(pts[j][axis]-vals[0])<=tol and (max(vals+[pts[j][axis]])-min(vals+[pts[j][axis]]))<=tol:
                vals.append(pts[j][axis]); j+=1
            j-=1
            length=abs(pts[j][1-axis]-pts[i][1-axis])
            if length>=minlen and (best is None or length>best[0]): best=(length,axis,j,sum(vals)/len(vals))
        if best:
            length,axis,j,med=best
            a,b=i,j
            while a<b and abs(pts[a][axis]-med)>snap: out.append(pts[a]); a+=1
            while b>a and abs(pts[b][axis]-med)>snap: b-=1
            if b-a>=1 and abs(pts[b][1-axis]-pts[a][1-axis])>=minlen*0.6:
                pa=list(pts[a]); pb=list(pts[b]); pa[axis]=med; pb[axis]=med
                out.append(tuple(pa)); out.append(tuple(pb))
                for k in range(b+1,j+1): out.append(pts[k])
            else:
                for k in range(a,j+1): out.append(pts[k])
            i=j+1
        else:
            out.append(pts[i]); i+=1
    return out

def smooth(pts,window=7):
    # moving average along the pixel chain, end points fixed: removes staircase noise and dot bumps
    if len(pts)<=window: return pts
    P=np.array(pts,float); k=window//2; out=P.copy()
    for i in range(1,len(P)-1):
        a=max(0,i-k); b=min(len(P),i+k+1); out[i]=P[a:b].mean(0)
    return [tuple(q) for q in out]

def rdp(pts,tol):
    if len(pts)<3: return pts
    P=np.array(pts,float)
    def rec(a,b):
        if b-a<2: return [a,b]
        s=P[a]; e=P[b]; v=e-s; L=math.hypot(*v)
        d=np.hypot(*(P[a:b+1]-s).T) if L==0 else np.abs(v[0]*(P[a:b+1,1]-s[1])-v[1]*(P[a:b+1,0]-s[0]))/L
        i=int(np.argmax(d))
        if d[i]>tol: l=rec(a,a+i); r=rec(a+i,b); return l[:-1]+r
        return [a,b]
    return [pts[i] for i in rec(0,len(pts)-1)]

def link_gaps(polys,maxd=26,maxang=75):
    g=Graph(polys)
    deg={}
    for a,b,pts in g.edges: deg[a]=deg.get(a,0)+1; deg[b]=deg.get(b,0)+1
    ends=[]
    for a,b,pts in g.edges:
        if deg[a]==1: ends.append((a,pts[0],pts[1]))
        if deg[b]==1: ends.append((b,pts[-1],pts[-2]))
    added=[]
    for i in range(len(ends)):
        for j in range(i+1,len(ends)):
            (na,pa,qa),(nb,pb,qb)=ends[i],ends[j]
            if na==nb: continue
            d=math.hypot(pa[0]-pb[0],pa[1]-pb[1])
            if d>maxd or d<0.5: continue
            # direction of each end (pointing outward) should face the other end
            va=(pa[0]-qa[0],pa[1]-qa[1]); vb=(pb[0]-qb[0],pb[1]-qb[1]); ab=(pb[0]-pa[0],pb[1]-pa[1])
            def ang(u,v):
                nu=math.hypot(*u); nv=math.hypot(*v)
                if nu==0 or nv==0: return 0
                return math.degrees(math.acos(max(-1,min(1,(u[0]*v[0]+u[1]*v[1])/(nu*nv)))))
            if ang(va,ab)<=maxang and ang(vb,(-ab[0],-ab[1]))<=maxang:
                added.append([list(pa),list(pb)])
    return polys+added, added
def extend_to_dots(polys,maxd=14):
    # a stroke's skeleton stops short of its rounded end: pull loose ends onto the terminal dot
    g=Graph(polys); deg={}
    for a,b,pts in g.edges: deg[a]=deg.get(a,0)+1; deg[b]=deg.get(b,0)+1
    out=[]
    for a,b,pts in g.edges:
        pts=[list(p) for p in pts]
        for end,ni in ((0,a),(-1,b)):
            if deg[ni]!=1: continue
            p=pts[end]; best=None
            for d in DOTS:
                dd=math.hypot(d[0]-p[0],d[1]-p[1])
                if dd<=maxd and (best is None or dd<best[0]): best=(dd,d)
            if best and best[0]>1.0:
                if end==0: pts.insert(0,list(best[1]))
                else: pts.append(list(best[1]))
        out.append(pts)
    return out
LINKED={}
for c,polys in T["colours"].items():
    T["colours"][c]=extend_to_dots(polys)
for c,polys in T["colours"].items():
    T["colours"][c],added=link_gaps(polys); LINKED[c]=added
    if added: print(c,"linked",[(round(a[0][0]),round(a[0][1]),round(a[1][0]),round(a[1][1])) for a in added])
graphs={c:Graph(polys) for c,polys in T["colours"].items()}
# dots on lane per colour
def dots_on(colour,tol=5.5):
    g=graphs[colour]; out=[]
    for d in DOTS:
        dist,ei,si,q=g.nearest(d)
        if dist<=tol: out.append(d)
    return out

def catmull_rom(P,samples=10):
    out=[]
    for i in range(1,len(P)-2):
        p0,p1,p2,p3=P[i-1],P[i],P[i+1],P[i+2]
        for k in range(samples):
            t=k/samples; t2=t*t; t3=t2*t
            x=0.5*((2*p1[0])+(-p0[0]+p2[0])*t+(2*p0[0]-5*p1[0]+4*p2[0]-p3[0])*t2+(-p0[0]+3*p1[0]-3*p2[0]+p3[0])*t3)
            y=0.5*((2*p1[1])+(-p0[1]+p2[1])*t+(2*p0[1]-5*p1[1]+4*p2[1]-p3[1])*t2+(-p0[1]+3*p1[1]-3*p2[1]+p3[1])*t3)
            out.append((x,y))
    out.append(tuple(P[-2]))
    return out

def round_corner(path,i,radius,samples=10):
    v=path[i]; a=path[i-1]; b=path[i+1]
    la=math.hypot(a[0]-v[0],a[1]-v[1]); lb=math.hypot(b[0]-v[0],b[1]-v[1])
    t=min(radius,la*0.9,lb*0.9)
    s=(v[0]+(a[0]-v[0])/la*t,v[1]+(a[1]-v[1])/la*t); e=(v[0]+(b[0]-v[0])/lb*t,v[1]+(b[1]-v[1])/lb*t)
    arc=[((1-u)**2*s[0]+2*(1-u)*u*v[0]+u*u*e[0],(1-u)**2*s[1]+2*(1-u)*u*v[1]+u*u*e[1]) for u in [k/samples for k in range(samples+1)]]
    return path[:i]+arc+path[i+1:]

def nearest_index(path,p):
    return min(range(len(path)),key=lambda i:math.hypot(path[i][0]-p[0],path[i][1]-p[1]))

STATION_ORDER={l["id"]:l["stations"] for l in LINES}

def fixups(lid,path,idx):
    spts=[path[i] for i in idx]
    if lid=="11":
        # the valley line's bend through Haifa: one smooth curve from the horizontal through its four stops to the vertical
        k0=next(i for i in range(len(path)) if path[i][0]<515)
        k1=next(i for i in range(len(path)) if path[i][1]>540)
        ctrl=[(560,451),(515,451),(497,453),(463,478),(452,499),(450,520),(450,540),(450,560)]
        path=path[:k0]+catmull_rom(ctrl,12)+path[k1:]
    if lid in ("5","25","2"):
        # the split above Lod: each lane leaves the 45° diagonal for its vertical with one corner
        # (the corner is rounded when drawn), exactly as the original sets it
        sids=[s for s in STATION_ORDER[lid]]
        a=sids.index("5150"); b=sids.index("5000")
        pa=spts[a]; pb=spts[b]
        corner=(pb[0],pa[1]+(pb[0]-pa[0]))
        path=path[:idx[a]]+[pa,corner,pb]+path[idx[b]+1:]
    if lid=="7":
        # the pink turns off the airport's horizontal with a rounded corner, not the trace's sharp one
        i=nearest_index(path,(609,1367)); path=round_corner(path,i,16)
    if lid=="1":
        i=nearest_index(path,(612,1372))
        if math.hypot(path[i][0]-612,path[i][1]-1372)<8: path=round_corner(path,i,10)
    idx=[nearest_index(path,p) for p in spts]
    return path,idx

result={"lines":{}}
USED_BY_COLOUR=set()  # (colour, dot): lines sharing a colour take different dots where a station has one per lane
vis=Image.new("RGB",(913,2576),"white"); dr=ImageDraw.Draw(vis)
COLRGB={"red":"#ec0000","orange":"#ff7900","green":"#1ac740","lime":"#b1db1e","purple":"#d176ff","blue":"#0082cd","lightblue":"#36c3ff","pink":"#ff5ebf","magenta":"#ff0199","teal":"#8fd0ca"}
for line in LINES:
    c=line["colour"]; g=Graph(T["colours"][c]); lane=dots_on(c)
    used=set(); spts=[]
    for sid in line["stations"]:
        key=f'{line["id"]}:{sid}'
        if key in OVERRIDES:
            p=tuple(OVERRIDES[key]); n,d=g.insert(p); spts.append((sid,n,0,"override")); continue
        P=NODES[sid]
        if (line["id"],sid) in PROJECTED_STOPS:
            near=min(DOTS,key=lambda d:math.hypot(d[0]-P[0],d[1]-P[1]))
            n,dd=g.insert(near); spts.append((sid,n,dd,"dot")); continue
        cands=[(math.hypot(d[0]-P[0],d[1]-P[1]),d) for d in lane if d not in used]
        cands=[c for c in cands if c[0]<=45]
        cands.sort(key=lambda t:((c,t[1]) in USED_BY_COLOUR,t[0]))
        if cands:
            d0,dot=cands[0]; used.add(dot); USED_BY_COLOUR.add((c,dot)); n,dd=g.insert(dot); spts.append((sid,n,d0,"dot"))
        else:
            n,dd=g.insert(P); spts.append((sid,n,dd,"proj"))
            print(f'  {line["id"]} {sid}: no lane dot near {P} -> projected {dd:.0f}px')
    path=[]; idx=[]
    for i in range(len(spts)):
        if i==0: path=[g.nodes[spts[0][1]]]; idx=[0]; continue
        seg=g.path(spts[i-1][1],spts[i][1])
        if seg is None:
            print(f'  {line["id"]}: NO PATH {spts[i-1][0]} -> {spts[i][0]}'); seg=[g.nodes[spts[i-1][1]],g.nodes[spts[i][1]]]
        seg=densify(seg,1.0); seg=smooth(seg,13); seg=rdp(seg,0.4); seg=straighten(seg)
        path+=seg[1:]; idx.append(len(path)-1)
    path,idx=fixups(line["id"],path,idx)
    result["lines"][line["id"]]={"colour":c,"points":[[round(x,1),round(y,1)] for x,y in path],"stationIndex":{s[0]:i for s,i in zip(spts,idx)},"stationSource":{s[0]:s[3] for s in spts}}
    print(line["id"],c,"pts",len(path),"stations",[(s[0],s[3],round(s[2])) for s in spts if s[3]!="dot" or s[2]>30])
    dr.line([tuple(p) for p in path],fill=COLRGB[c],width=10,joint="curve")
for line in LINES:
    L=result["lines"][line["id"]]
    for sid,i in L["stationIndex"].items():
        x,y=L["points"][i]; dr.ellipse([x-5.5,y-5.5,x+5.5,y+5.5],fill="black")
vis.save("lines-vis.png")
json.dump(result,open("lines.json","w"))
