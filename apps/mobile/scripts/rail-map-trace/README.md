# Tracing the Service Status map

`src/data/rail-map-layout.ts` is generated from Israel Railways' network map
(the PNG the map is modelled on, not committed here). The scripts extract each
line's centre line from the artwork by colour, so the app draws the lines,
bends and station dots exactly where the original does.

Requirements: Python 3 with `pillow`, `numpy`, `scipy` and `scikit-image`.

```sh
cd apps/mobile/scripts/rail-map-trace
export RAIL_MAP_REFERENCE=/path/to/israel-railways-map.png   # 913 × 2576 px
python3 extract.py     # colour masks → skeleton polylines, station dots, badges (trace.json)
python3 pipeline.py    # per-line paths along the skeletons between the stations (lines.json)
python3 labels.py      # station name blocks and city frames (labels.json)
python3 gen_layout.py  # merges everything into layout.json
python3 gen_ts.py      # writes ../../src/data/rail-map-layout.ts
bunx oxfmt ../../src/data/rail-map-layout.ts
```

`station-seeds.json` holds a rough pixel position per station on the artwork;
the pipeline matches each station to the dot the original draws on each lane
from there. Check the result with `scripts/rail-map-preview.ts`.

Where a line calls, runs through, or ends short of its terminus, and which
lines run at all, comes from the timetable, not the artwork: `station-patterns.json`
is derived from the GTFS feed the server holds, per day type (Sunday–Thursday,
Friday–Saturday, and the weeknight trains between 00:15 and 04:30, which get a
map of their own so their run-through stations do not look irregular by day):

```sh
cd apps/server && bun run ../mobile/scripts/rail-map-trace/service-patterns.ts
bunx oxfmt ../mobile/scripts/rail-map-trace/station-patterns.json
```

Regenerate it when the timetable changes, then rerun `gen_layout.py`.
