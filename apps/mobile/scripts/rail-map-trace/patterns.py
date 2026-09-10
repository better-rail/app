"""
Service patterns per day type from the GTFS-derived Line Explorer export:
which lines run, where a line's trains terminate besides its ends, and which
stations some of its trains run through. Writes station-patterns.json, read
by gen_layout.py.

    LINE_EXPLORER_JSON=/path/to/export.json python3 patterns.py

The export has, per day type (wk = Sunday–Thursday, we = Friday–Saturday) and
per line, every train with its ordered stops (MOT station codes). Shares are
over the trains of the line in that day type (terminals) or over the trains
that pass the station (irregular stops).
"""
import json, os
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.environ.get("LINE_EXPLORER_JSON", os.path.join(HERE, "line-explorer.json"))
TERMINAL_SHARE = 0.10  # a station where at least this share of a line's trains end (3+ trains) is a terminal
IRREGULAR_SHARE = 0.20  # a station at least this share of a line's passing trains run through (3+ trains) is irregular
MIN_TRAINS = 3

codes = json.load(open(os.path.join(HERE, "station-codes.json")))  # MOT code -> app station id
export = json.load(open(SRC))
out = {}
for day, key in (("wk", "weekday"), ("we", "weekend")):
    variant = {"lines": [], "patterns": {}}
    for line in export[day]:
        lid = line["id"]
        trains = line["trains"]
        if not trains:
            continue
        variant["lines"].append(lid)
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
        line_ends = {codes[corridor[0]], codes[corridor[-1]]}
        p = {"terminals": {}, "irregular": {}}
        for c, n in ends.items():
            if n >= MIN_TRAINS and n / len(trains) >= TERMINAL_SHARE and codes[c] not in line_ends:
                p["terminals"][codes[c]] = round(n / len(trains), 2)
        for c, n in skipped.items():
            if n >= MIN_TRAINS and n / passing[c] >= IRREGULAR_SHARE:
                p["irregular"][codes[c]] = round(n / passing[c], 2)
        variant["patterns"][lid] = p
    variant["lines"].sort()
    out[key] = variant

json.dump(out, open(os.path.join(HERE, "station-patterns.json"), "w"), indent=1, sort_keys=True)
for key, variant in out.items():
    print(f"== {key}: lines {variant['lines']}")
    for lid, p in sorted(variant["patterns"].items()):
        if p["terminals"] or p["irregular"]:
            print(f"   {lid}: terminals {p['terminals']} irregular {p['irregular']}")
