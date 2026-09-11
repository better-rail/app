import json, math, re, os
HERE = os.path.dirname(os.path.abspath(__file__))
L=json.load(open("lines.json")); LB=json.load(open("labels.json")); T=json.load(open("trace.json"))
BOXES=LB["boxes"]; CB=LB["clusters"]
# station names (hebrew) for glyph-height correction
src=open(os.path.join(HERE, "../../src/data/stations.ts")).read()
HEB={}
for m in re.finditer(r'id: "(\d+)",\s*hebrew: "((?:[^"\\]|\\.)*)"',src): HEB[m.group(1)]=m.group(2)
IN_BOX={"1220":None,"2100":"haifa","2200":"haifa","2300":"haifa","3600":"telaviv","3700":"telaviv","4600":"telaviv","4900":"telaviv","680":"jerusalem","7300":"beersheva","7320":"beersheva"}
def station_only(sid,name):
    if sid in IN_BOX and IN_BOX[sid]:
        parts=re.split(r"\s+-\s+|\s+–\s+",name,1)
        if len(parts)==2: return parts[1]
    return re.sub(r"\s*\(.*?\)","",name)
# ---- lines: the geometry only; where a line calls, runs through or ends short of its terminus, and which
# lines run at all, is per day type in station-patterns.json (from the timetable)
PATTERNS=json.load(open(os.path.join(HERE,"station-patterns.json")))
lines={}
for lid,ln in L["lines"].items():
    lines[lid]={"points":ln["points"],"stations":[{"id":s,"index":i} for s,i in ln["stationIndex"].items()]}
SERVICE={}
for key,variant in PATTERNS.items():
    irregular=[]; terminals=[]; skipped=[]
    for lid,p in sorted(variant["patterns"].items()):
        for sid in sorted(p["irregular"]): irregular.append({"line":lid,"station":sid})
        for sid in sorted(p["terminals"]): terminals.append({"line":lid,"station":sid})
        for sid in sorted(p.get("skipped",{})): skipped.append({"line":lid,"station":sid})
    SERVICE[key]={"lines":variant["lines"],"irregular":irregular,"terminals":terminals,"skipped":skipped}
# extra strokes: line 6's express lane straight through Bat Yam (while its trains run through there); line 2's
# Rehovot stub (while trains end there), ending in a terminal dot
def station_point(lid,sid):
    ln=L["lines"][lid]; return ln["points"][ln["stationIndex"][sid]]
p6a=station_point("6","4900"); p6b=station_point("6","9800")
# the Rehovot stub: a short spur down the lane's east side, curling to its own dot (measured on the artwork)
p2=L["lines"]["2"]["points"]
def project(p,poly):
    best=None
    for a,b in zip(poly,poly[1:]):
        dx,dy=b[0]-a[0],b[1]-a[1]; L2=dx*dx+dy*dy
        t=0 if L2==0 else max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L2))
        q=(a[0]+t*dx,a[1]+t*dy); d=math.hypot(p[0]-q[0],p[1]-q[1])
        if best is None or d<best[0]: best=(d,q)
    return best[1]
stub=[[477,1674],[477,1692],[472,1700],[465,1702]]
attach=project([480,1666],p2)
stub_dot=min(([d["x"],d["y"]] for d in T["dots"]),key=lambda d:math.hypot(d[0]-stub[-1][0],d[1]-stub[-1][1]))
EXTRAS=[
  {"line":"6","points":[[p6a[0],p6a[1]],[p6b[0],p6b[1]]],"requires":{"line":"6","station":"4640","kind":"irregular"},"covers":["4640","4660","4680","4690"]},
  {"line":"2","points":[[round(attach[0],1),round(attach[1],1)]]+stub[:-1]+[stub_dot],"terminal":stub_dot,"requires":{"line":"2","station":"5200","kind":"terminal"}},
]
# ---- labels: merge blocks per station
blocks=[b for b in LB["blocks"]]
# merge nearby unassigned fragments into neighbours first (e.g. split Hebrew words)
def near(a,b,dx=10,dy=4):
    return (min(a["x1"],b["x1"])-max(a["x0"],b["x0"])>=-dx) and (min(a["y1"],b["y1"])-max(a["y0"],b["y0"])>=-dy)
for b in blocks:
    if b["station"] is None:
        for o in blocks:
            if o is not b and o["station"] and near(b,o): b["station"]=o["station"]; break
per={}
for b in blocks:
    s=b["station"]
    if not s: continue
    b["lines"]=[t for t in b["lines"] if t["h"]>=7 and t["w"]>=8 and t["mean"][2]>=40]
    if not b["lines"]: continue
    p=per.setdefault(s,{"x0":b["x0"],"y0":b["y0"],"x1":b["x1"],"y1":b["y1"],"lines":[]})
    p["x0"]=min(p["x0"],b["x0"]); p["y0"]=min(p["y0"],b["y0"]); p["x1"]=max(p["x1"],b["x1"]); p["y1"]=max(p["y1"],b["y1"]); p["lines"]+=b["lines"]
labels={}
for sid,p in per.items():
    cx0,cy0,cx1,cy1=CB[sid]
    bcx=(p["x0"]+p["x1"])/2; ccx=(cx0+cx1)/2
    heb=[t for t in p["lines"] if not (t["mean"][0]>t["mean"][2]+8)]
    eng=[t for t in p["lines"] if (t["mean"][0]>t["mean"][2]+8)]
    # the app shows one language, so the anchor is where the original's Hebrew name sits (the block includes its English)
    hb=(min(t["x0"] for t in heb),min(t["y0"] for t in heb),max(t["x1"] for t in heb),max(t["y1"] for t in heb)) if heb else (p["x0"],p["y0"],p["x1"],p["y1"])
    if bcx<ccx-15 and p["x1"]<=cx1: side="left"; anchor=(p["x1"]+1,(hb[1]+hb[3])/2)
    elif bcx>ccx+15 and p["x0"]>=cx0: side="right"; anchor=(p["x0"]-1,(hb[1]+hb[3])/2)
    elif p["y1"]<cy0+6: side="above"; anchor=(bcx,hb[3]+1)
    else: side="below"; anchor=(bcx,hb[1]-1)
    name=station_only(sid,HEB.get(sid,""))
    body=max([t["body"] for t in heb],default=9)
    em=body/0.57
    labels[sid]={"side":side,"x":round(anchor[0],1),"y":round(anchor[1],1),"maxWidth":round((p["x1"]-p["x0"])*1.3+6),"em":round(em,1),"size":"big" if em>=19.5 else "small","hebLines":len(heb),"engLines":len(eng),"bbox":[p["x0"],p["y0"],p["x1"],p["y1"]],"stationNameOnly":bool(IN_BOX.get(sid)),"name":name}
# ---- city labels (unassigned blocks inside boxes)
cities={}
for b in blocks:
    if b["station"]: continue
    for name,(x0,y0,x1,y1) in BOXES.items():
        if x0<=b["x0"] and b["x1"]<=x1 and y0<=b["y0"] and b["y1"]<=y1:
            c=cities.setdefault(name,{"x0":b["x0"],"y0":b["y0"],"x1":b["x1"],"y1":b["y1"]})
            c["x0"]=min(c["x0"],b["x0"]); c["y0"]=min(c["y0"],b["y0"]); c["x1"]=max(c["x1"],b["x1"]); c["y1"]=max(c["y1"],b["y1"])
# ---- badges: colour -> lines; place at line terminals
CN={"lime":["1"],"blue":["2"],"green":["3"],"orange":["3X"],"magenta":["4"],"lightblue":["5","25"],"red":["6"],"pink":["7"],"teal":["12"],"purple":["9","10","11","8"]}
badges=[]
def term_dist(lid,which,cx,cy):
    st=lines[lid]["stations"][0 if which==0 else -1]; x0,y0,x1,y1=CB[st["id"]]
    return math.hypot(max(x0-cx,cx-x1,0),max(y0-cy,cy-y1,0))
for colour,bs in T["badges"].items():
    for b in bs:
        cx=(b["x0"]+b["x1"])/2; cy=(b["y0"]+b["y1"])/2
        best=None
        for lid in CN[colour]:
            for w in (0,1):
                d=term_dist(lid,w,cx,cy)
                if d<=60 and (best is None or d<best[0]): best=(d,lid)
        if best: badges.append({"line":best[1],"x":round(cx,1),"y":round(cy,1),"ref":colour})
        else: print("badge skipped",colour,(round(cx),round(cy)))
# manual additions: Karmiel orange (34), Atlit purple (11), Netanya 25 beside 5
badges.append({"line":"3X","x":649,"y":265,"ref":"manual"})
# badges the original prints where trains of a line end short of its terminus
badges.append({"line":"2","x":507,"y":1742,"ref":"manual","requires":{"line":"2","station":"5200","kind":"terminal"}})   # Rehovot
badges.append({"line":"5","x":354,"y":1161,"ref":"manual","requires":{"line":"5","station":"3700","kind":"terminal"}})   # Tel Aviv Savidor
badges.append({"line":"3","x":333,"y":1161,"ref":"manual","requires":{"line":"3","station":"3700","kind":"terminal"}})
badges.append({"line":"11","x":468,"y":520,"ref":"manual","requires":{"line":"11","station":"2300","kind":"terminal"}})   # Hof HaKarmel
badges.append({"line":"11","x":468.5,"y":614,"ref":"manual"})
badges.append({"line":"1","x":447,"y":139,"ref":"manual"})
for b in list(badges):
    if b["line"]=="5" and b["y"]<900: badges.append({"line":"25","x":b["x"]-21,"y":b["y"],"ref":"manual"})
# plane icon: tall glyph in the airport block
plane=None
for b in blocks:
    if b["station"]=="8600":
        for t in b["lines"]:
            if t["h"]>=25: plane=[t["x0"],t["y0"],t["x1"],t["y1"]]
# the water: the coast (the sea is everything left of it, down to where it meets the map's edge) and the lakes
WATER={"coast":T["water"]["coast"],"lakes":T["water"]["lakes"]}
out={"lines":lines,"labels":labels,"water":WATER,"service":SERVICE,"extras":EXTRAS,"boxes":BOXES,"cities":cities,"badges":badges,"plane":plane,"clusters":CB}
json.dump(out,open("layout.json","w"),ensure_ascii=False,indent=0)
for sid,l in sorted(labels.items(),key=lambda t:t[1]["y"]):
    print(sid,l["side"],l["x"],l["y"],"w",l["maxWidth"],"em",l["em"],l["size"],"heb",l["hebLines"],"eng",l["engLines"],l["name"])
print("cities",cities); print("badges",badges); print("plane",plane)
missing=[s for ln in lines.values() for s in [st["id"] for st in ln["stations"]] if s not in labels]
print("stations without labels",sorted(set(missing)))
