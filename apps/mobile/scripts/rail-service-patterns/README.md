# The Service Status map's timetable data

The map itself (`src/data/rail-map-layout.ts`) is laid out by hand on a grid
— stations, bend points and lane order — and needs no generator. Check a
change with the preview:

```sh
cd apps/mobile
bun run --loader=.jpg:file --loader=.jpeg:file --loader=.png:file --loader=.webp:file \
  scripts/rail-map-preview.ts /tmp/rail-map.svg en weekday
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu \
  --hide-scrollbars --screenshot=/tmp/rail-map.png --window-size=1100,3500 file:///tmp/rail-map.html
```

Where a line calls, runs through, or ends short of its terminus, and which
lines run at all, comes from the timetable: `station-patterns.json` is derived
from the GTFS feed the server holds, per day type (Sunday–Thursday,
Friday–Saturday, and the weeknight trains between 00:15 and 04:30, which get a
map of their own so their run-through stations do not look irregular by day):

```sh
cd apps/server && bun run ../mobile/scripts/rail-service-patterns/service-patterns.ts
cd ../.. && bunx oxfmt apps/mobile/scripts/rail-service-patterns/station-patterns.json apps/mobile/src/data/rail-service-patterns.ts
```

Regenerate it when the timetable changes: the script rewrites the
`SERVICE_PATTERNS` block of `src/data/rail-service-patterns.ts`. Only the
trains of the day shape the day maps — the first and last trains, which call
where the hourly service runs through, and the date-pinned 8xxx additions are
left out.

The stations a line runs through without calling (the express lines' Netanya,
Kfar Habad, Be'er Ya'akov …) are the stations on a line's route in the layout
that are missing from its catalogue corridor, and are written to the server's
catalogue for the service-status extraction:

```sh
cd apps/mobile && bun run scripts/rail-service-patterns/through-stations.ts
cd ../.. && bunx oxfmt apps/server/src/status/through-stations.ts
```

Regenerate it after changing the layout's routes or the line catalogue.
