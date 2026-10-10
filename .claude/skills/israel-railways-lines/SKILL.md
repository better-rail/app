---
name: israel-railways-lines
description: "How Israel Railways numbers its trains and how Better Rail groups them
  into lines. Use it whenever a task touches train numbers, the line catalogue
  (apps/server/src/status/lines.ts, apps/mobile/src/data/rail-lines.ts), the
  service-status screens or service, the SIRI/timetable correlation of trips, or
  anything that names a line to a user — even if the user only says 'line 3',
  'the Karmiel line', 'train 7002' or 'which line is this train on'. It encodes
  the measured rules of the numbering (parity is direction, the hundreds block
  is the corridor, +2 is the next departure, the thousands digit is a calendar
  variant, trips cross midnight without renumbering) and the house rule that
  line ids and badge numbers are internal: passengers only ever see a line's
  colour and its name (e.g. כרמיאל – באר שבע)."
---

# Israel Railways lines and train numbers

The full measured write-up is in `references/train-numbers.md` (Rakevet Israel,
11 Sep 2026, measured on the national GTFS of 10 Sep 2026 and a live-API sweep).
Read it before touching anything that maps a train to a line. This file is the
working summary and the house rules.

## House rule: line ids are ours, and nobody sees them

Israel Railways publishes **no line numbering**. The fourteen lines in
`apps/server/src/status/lines.ts` (mirrored in `apps/mobile/src/data/rail-lines.ts`)
are Better Rail's own grouping, after the community "Line Explorer" map.

- The catalogue `id` (`"1"`, `"3X"`, `"12"`, …) is an **internal key**. It is fine
  in code, redis, logs, tests and in prompts to a model — never in anything a
  passenger reads.
- The `badge` number is also internal and is **not rendered** anywhere in the app
  (the status list was deliberately laid out "as TfL Go's, line numbers gone").
  Do not reintroduce badge numbers in UI, notifications, or user-facing text.
- What a passenger sees of a line is its **colour** and its **name**, the two
  termini in the user's language: כרמיאל – באר שבע, Nahariya – Modi'in. Name a
  line that way in any text meant for users, and in the app take the name from
  the catalogue's `name[locale]`, falling back to the server's echo.
- Three ids differ from their badge — `3X`→34, `12`→8, `8`→12. Never read a badge
  off an id or vice versa; look the line up.

## The numbering, in five rules

1. **Parity is the direction.** Odd runs south on the north–south corridors
   (Nahariya→Modi'in, Karmiel→Be'er Sheva, Herzliya→Jerusalem), odd runs west on
   the two east–west branches (Lod→Rishon HaRishonim, Beit She'an→Atlit). `n` and
   `n+1` are the same service in opposite directions.
2. **The hundreds block is the corridor, not the line.** Line 6 owns 3xx and 6xx;
   4xx is shared, interleaved, by lines 4 and 34 (our `3X`); 5xx by lines 5 and
   10; the 0xx block by lines 1 (1–12, night), 3 (19–56) and 11 (59–99). The
   catalogue lists every number explicitly for this reason.
3. **+2 is the next departure** of the same service, one headway later (60 or
   30 min). Two paths an hour give two parallel series about 50 apart.
4. **A number is a fixed slot**: same origin, destination, time and stops every
   day it runs — except six evening trains with two workings (53, 54, 186, 687,
   780, 782), one of them the everyday train and one an extension. Match a
   timetable train to a GTFS trip by **number and departure time**, never by
   number alone.
5. **The thousands digit is the calendar**, the last three digits keep the
   structure: 6xxx Friday/short-day, 7xxx Saturday night (motzash), 8xxx one-off
   additions pinned to a date (8718 is the standing exception, a daily peak
   extra), 9xxx the Wednesday-night reroute to Ben Gurion Airport (700–710 become
   9700–9710, turning back at the airport), 1xxx the first runs after Shabbat or a
   festival. Thirty of them are exact copies of their base (6001 = 1, 7002 = 2,
   8700 = 700). So `n % 1000` places an unknown four-digit number on its line as
   a strong hint; the stop sequence is the guarantee.

## Midnight and the service day

A service day runs to about 26:00. Trips cross midnight **without changing
number** and the GTFS writes hours past 24 (53 arrives 24:55, 7619 at 26:09).
The same night train takes a four-digit number on the nights either side of the
weekend (23:55 Modi'in→Nahariya is 2 on Sun–Thu and 7002 on Saturday) because
the number follows the service day. Consequences in this repo:

- Israel Railways' timetable search files a train under the **calendar day it
  leaves the first station of the searched pair**; GTFS files it under its
  service date. Compare across D-1, D and D+1 (`service-status/timetable.ts`).
- Parse GTFS times with `utils/gtfs-time.ts`, never an `HH:MM` 0–23 parser.

## What the number does not say

Not the stopping pattern (line 6 alone has ten), not the published line, not the
platform or rolling stock. Blocks also **move between timetables** (the Dimona
shuttle went from 830 to 990 in one feed change), so never hard-code a range:
`assignLine` in `status/service-status.ts` tries the catalogue's explicit numbers,
then the thousands-digit fallback, then the stop sequence against every
corridor.

## GTFS traps (from the reference)

- A rail `route_id` is a train number, not a line; read the number off
  `trip_headsign` and never inner-join `trips.txt` to `routes.txt` (18 trips
  point at route ids the file lacks, hiding five numbers and the second working
  of six others).
- Some `service_id`s are missing from `calendar.txt`; the everyday working of
  the six two-working trains is among them.
