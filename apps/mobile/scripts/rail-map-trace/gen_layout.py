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
# ---- lines
lines={}
for lid,ln in L["lines"].items():
    lines[lid]={"points":ln["points"],"stations":[{"id":s,"index":i,"stop":ln["stationSource"][s]=="dot"} for s,i in ln["stationIndex"].items()]}
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
    labels[sid]={"side":side,"x":round(anchor[0],1),"y":round(anchor[1],1),"maxWidth":round((p["x1"]-p["x0"])*1.15+6),"em":round(em,1),"size":"big" if em>=19.5 else "small","hebLines":len(heb),"engLines":len(eng),"bbox":[p["x0"],p["y0"],p["x1"],p["y1"]],"stationNameOnly":bool(IN_BOX.get(sid)),"name":name}
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
IRREGULAR=[{"line":"5","from":"3300","to":"3600"},{"line":"25","from":"3300","to":"3600"}]
out={"lines":lines,"labels":labels,"irregular":IRREGULAR,"boxes":BOXES,"cities":cities,"badges":badges,"plane":plane,"clusters":CB}
json.dump(out,open("layout.json","w"),ensure_ascii=False,indent=0)
for sid,l in sorted(labels.items(),key=lambda t:t[1]["y"]):
    print(sid,l["side"],l["x"],l["y"],"w",l["maxWidth"],"em",l["em"],l["size"],"heb",l["hebLines"],"eng",l["engLines"],l["name"])
print("cities",cities); print("badges",badges); print("plane",plane)
missing=[s for ln in lines.values() for s in [st["id"] for st in ln["stations"]] if s not in labels]
print("stations without labels",sorted(set(missing)))
