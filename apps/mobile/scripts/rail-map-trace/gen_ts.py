import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
S=9.13
L=json.load(open("layout.json"))
u=lambda v: round(v/S,2)
ORDER=["1","2","3","3X","4","5","25","6","7","12","9","10","11","8"]
out=[]
out.append('''/**
 * Geometry of the Service Status map, traced from Israel Railways' current
 * network map (the artwork the map is modelled on) so lines, bends and station
 * dots sit exactly where the original draws them.
 *
 * Units: the original's pixels divided by %s, so the drawing is 100 units wide.
 * Every line is an explicit polyline (flat x,y pairs) with the index of each of
 * its calling points in that polyline; `stop` is false where the line passes a
 * station without calling, which the original marks with a short tick instead
 * of a dot. Regenerate rather than hand-edit: the numbers come from the trace.
 */
import type { RailLineId } from "./rail-lines"

export const MAP_BOUNDS = { width: 100, height: %s }

export type TracedStation = {
  id: string
  /** Index of the station's point in the line's `points` (x,y pairs → index into pairs). */
  index: number
  /** False where the line runs through without calling. */
  stop: boolean
}

export type TracedLine = {
  /** Flat x,y pairs along the line, in map units. */
  points: number[]
  /** Calling points in corridor order. */
  stations: TracedStation[]
}

export const LINE_GEOMETRY: Record<RailLineId, TracedLine> = {
''' % (S, round(2576/S,2)))
for lid in ORDER:
    ln=L["lines"][lid]
    pts=", ".join(f"{u(x)}, {u(y)}" for x,y in ln["points"])
    st=", ".join('{ id: "%s", index: %d, stop: %s }'%(s["id"],s["index"],"true" if s["stop"] else "false") for s in ln["stations"])
    out.append(f'  "{lid}": {{\n    points: [\n      {pts},\n    ],\n    stations: [{st}],\n  }},\n')
out.append("}\n\n")
out.append('''export type LabelSide = "left" | "right" | "above" | "below"

export type StationLabelSpec = {
  /** Which side of the anchor the text sits on: `left` means the text ends at the anchor. */
  side: LabelSide
  x: number
  y: number
  /** Wrap width, in map units. */
  maxWidth: number
  /** Inside a city box the city prefix is dropped ("Tel Aviv - HaShalom" → "HaShalom"). */
  stationNameOnly?: boolean
}

/** Where every station's name goes, measured from the original. */
export const STATION_LABELS: Record<string, StationLabelSpec> = {
''')
BIG_OVERRIDE={"4900":"big"}
Y_OVERRIDE={}
for sid,l in sorted(L["labels"].items(),key=lambda t:t[1]["y"]):
    mw=l["maxWidth"]
    if sid=="8600": mw=110
    extra=(", stationNameOnly: true" if l["stationNameOnly"] else "")
    y=Y_OVERRIDE.get(sid,l["y"])
    out.append(f'  "{sid}": {{ side: "{l["side"]}", x: {u(l["x"])}, y: {u(y)}, maxWidth: {u(mw)}{extra} }}, // {l["name"]}\n')
out.append("}\n\n")
out.append('''export type CityBox = {
  id: string
  x: number
  y: number
  width: number
  height: number
  /** Bottom-left corner of the city name inside the box. */
  labelX: number
  labelY: number
  name: { he: string; en: string; ru: string; ar: string }
}

/** The rounded frames the original draws around the big cities' stations. */
export const CITY_BOXES: CityBox[] = [
''')
NAMES={"haifa":("חיפה","Haifa","Хайфа","حيفا"),"telaviv":("תל־אביב","Tel Aviv","Тель-Авив","تل أبيب"),"jerusalem":("ירושלים","Jerusalem","Иерусалим","القدس"),"beersheva":("באר שבע","Be'er Sheva","Беэр-Шева","بئر السبع")}
for bid,(x0,y0,x1,y1) in L["boxes"].items():
    c=L["cities"][bid]; n=NAMES[bid]
    out.append(f'  {{ id: "{bid}", x: {u(x0)}, y: {u(y0)}, width: {u(x1-x0)}, height: {u(y1-y0)}, labelX: {u(c["x0"])}, labelY: {u(c["y1"])}, name: {{ he: "{n[0]}", en: "{n[1]}", ru: "{n[2]}", ar: "{n[3]}" }} }},\n')
out.append("]\n\n")
out.append('''/** Line badges beside the terminals, where the original prints its train-number ranges. */
export const TERMINAL_BADGES: { lineId: RailLineId; x: number; y: number }[] = [
''')
for b in L["badges"]:
    out.append(f'  {{ lineId: "{b["line"]}", x: {u(b["x"])}, y: {u(b["y"])} }},\n')
out.append("]\n\n")
out.append('''/** Stretches the original draws with the "irregular intervals" marking (check the timetable). */
export const IRREGULAR_STRETCHES: { lineId: RailLineId; fromStationId: string; toStationId: string }[] = [
''')
for s in L["irregular"]:
    out.append(f'  {{ lineId: "{s["line"]}", fromStationId: "{s["from"]}", toStationId: "{s["to"]}" }},\n')
out.append("]\n\n")
flat=lambda pts: ", ".join(f"{u(x)}, {u(y)}" for x,y in pts)
out.append(f'''/** The original's water, in map units: the sea west of the shore, the shoreline itself and the two lakes. */
export const WATER = {{
  /** Closed polygon: the shore, then the map's top and left edges (flat x,y pairs). */
  sea: [{flat(L["water"]["sea"])}],
  /** The shoreline, drawn as a pale ribbon. */
  shore: [{flat(L["water"]["shore"])}],
  lakes: [
''')
for lake in L["water"]["lakes"]:
    out.append(f"    [{flat(lake)}],\n")
out.append("  ],\n}\n\n")
p=L["plane"]
out.append(f'''/** The aeroplane above Ben Gurion Airport's name (centre x, bottom y, height). */
export const AIRPORT_ICON = {{ x: {u((p[0]+p[2])/2)}, y: {u(p[3])}, height: {u(p[3]-p[1])} }}

/** Names the original shortens on the map. */
export const LABEL_TEXT_OVERRIDES: Record<string, Partial<Record<"he" | "en" | "ru" | "ar", string>>> = {{
  "8600": {{ he: "נתב״ג" }},
  "1260": {{ he: "עפולה", en: "Afula" }},
}}
''')
open(os.path.join(HERE, "../../src/data/rail-map-layout.ts"), "w").write("".join(out))
print("written", sum(len(x) for x in out), "chars")
