"""
Service patterns per line from the GTFS-derived Line Explorer export: where a
line's trains terminate besides its ends, and which stations some of its
trains run through. Writes station-patterns.json, read by gen_layout.py.

    LINE_EXPLORER_JSON=/path/to/export.json python3 patterns.py

The export has, per line and per day type (wk = Sunday–Thursday, we = weekend),
every train with its ordered stops (MOT station codes). Shares are over the
trains of the line that pass the station.
"""
import json, os
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.environ.get("LINE_EXPLORER_JSON", os.path.join(HERE, "line-explorer.json"))
TERMINAL_SHARE = 0.10  # a station where at least this share of a line's trains end (in either day type, 3+ trains)
IRREGULAR_SHARE = 0.20  # run through by this share of a line's passing trains over both day types...
IRREGULAR_DAY_SHARE = 0.25  # ...or by this share within one day type (5+ trains)

codes = json.load(open(os.path.join(HERE, "station-codes.json")))  # MOT code -> app station id
export = json.load(open(SRC))
patterns = {}
totals = defaultdict(lambda: {"trains": 0, "passing": Counter(), "skipped": Counter()})
for day in ("wk", "we"):
    for line in export[day]:
        lid = line["id"]
        trains = line["trains"]
        corridor = max((t["stops"] for t in trains), key=len)
        pos = {c: i for i, c in enumerate(corridor)}
        ends = Counter()
        passing = Counter()
        skipped = Counter()
        for t in trains:
            stops = t["stops"]
            ends[stops[0]] += 1
            ends[stops[-1]] += 1
            lo, hi = sorted((pos.get(stops[0], 0), pos.get(stops[-1], 0)))
            on = set(stops)
            for c in corridor[lo : hi + 1]:
                passing[c] += 1
                if c not in on:
                    skipped[c] += 1
        p = patterns.setdefault(lid, {"terminals": {}, "irregular": {}})
        if day == "wk":
            p["ends"] = [codes[corridor[0]], codes[corridor[-1]]]
        for c, n in ends.items():
            if n >= 3 and n / len(trains) >= TERMINAL_SHARE:
                p["terminals"][codes[c]] = max(p["terminals"].get(codes[c], 0), round(n / len(trains), 2))
        for c, n in skipped.items():
            if n >= 5 and n / passing[c] >= IRREGULAR_DAY_SHARE:
                p["irregular"][codes[c]] = max(p["irregular"].get(codes[c], 0), round(n / passing[c], 2))
        tot = totals[lid]
        tot["trains"] += len(trains)
        tot["passing"].update(passing)
        tot["skipped"].update(skipped)
for lid, tot in totals.items():
    p = patterns[lid]
    for c, n in tot["skipped"].items():
        share = n / tot["passing"][c]
        if share >= IRREGULAR_SHARE:
            p["irregular"][codes[c]] = max(p["irregular"].get(codes[c], 0), round(share, 2))
    for sid in p["ends"]:
        p["terminals"].pop(sid, None)

json.dump(patterns, open(os.path.join(HERE, "station-patterns.json"), "w"), indent=1, sort_keys=True)
for lid, p in sorted(patterns.items()):
    print(lid, "terminals", p["terminals"], "irregular", p["irregular"])
