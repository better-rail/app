---
name: israel-gtfs
description: "Work with Israel's public-transport data feeds from the Ministry
  of Transport (משרד התחבורה): the static GTFS feed (schedules, stops, routes,
  fares, plus Israel-only files RouteNetworksByDate, tariff_2022, zones_2022,
  ChargingRavKav) AND the real-time SIRI-SM stop-monitoring API (arrivals,
  vehicle positions, snapshots). Use it whenever the task touches
  Israeli transit data: the gtfs.mot.gov.il feed, RavKav fares or charging
  stations, bus/train/light-rail/Matronit schedules, the 28-hour service-day
  format, route_id or Catalog Line Code (makat) decoding, August-2022
  fares, or the MOT real-time / SIRI-Lite feed (MonitoringRef, LineRef,
  OnwardCalls, AllActiveTripsFilter, vehicle positions) — even if the user only
  says 'GTFS', 'bus data', or 'real-time arrivals' but the context is Israel. It
  encodes how these feeds deviate from the standards (over-24h times,
  calendar_dates not calendar, zone_id always 0, rail special-casing, UTF-8 BOM,
  SIRI-to-GTFS mapping, the removed TripIdToDate) so you don't get them
  wrong."
---

# Israel Public Transport (GTFS + SIRI-SM)

This skill covers the two data feeds published by Israel's National Authority
for Public Transport (משרד התחבורה / MOT):

- the **static GTFS feed** — the planned schedule, stops, routes, fares, and
  geometry (most of this skill), and
- the **real-time SIRI-SM feed** — live arrival predictions and vehicle
  positions (see the "Real-time data: SIRI-SM" section and `references/siri-sm.md`).

They are designed to be used together: SIRI-SM carries only codes and times, so
human-readable names (stop names, line names) come from GTFS. Both feeds are
*mostly* standard (GTFS per gtfs.org; SIRI per CEN/EN 15531), so for any field
that behaves normally, defer to the canonical spec. The value of this skill is
the **Israeli deviations** — the handful of things that differ from the
standards and will produce wrong results if you assume default behavior. Read
"Critical Israel-specific behaviors" (GTFS) and the SIRI-SM section before
writing parsing or query code.

## Where the data lives

The full feed is regenerated **every night** and published as ZIP archives at:

    https://gtfs.mot.gov.il/gtfsfiles/

| Archive | What it contains |
|---|---|
| `israel-public-transportation.zip` | The main GTFS package (agency, routes, trips, stop_times, stops, calendar_dates, shapes, fare_attributes, fare_rules, translations, networks, levels, feed_info) |
| `RouteNetworksByDate.zip` | Maps each `route_id` to its line catalog code, direction, alternative, cluster (אשכול) and operator over time. **This is where line metadata actually lives** — see gotcha #5. |
| `tarrif_2022.zip` | `tariff_2022.csv` + `profiles_2022.csv` — distance-based fares and per-profile discounts (August-2022 reform). |
| `zones_2022.zip` | `zones_2022.kml` — geographic polygons for the fare zones referenced by the tariff file. |
| `ChargingRavKav.zip` | RavKav top-up / service points ("עמדות טעינה" / "על הקו"), per company. |

The feed is valid for roughly **10 days** (`feed_info.feed_end_date` = generation
date + 10 days). Don't assume data older than that is still current; re-download.

`scripts/download_feed.py` fetches and extracts these for the end user (note:
`gtfs.mot.gov.il` is not reachable from this sandbox — that script is a
deliverable to run in the user's own environment).

## Encoding: UTF-8 **with BOM**

Every `.txt` and `.csv` file is UTF-8 **with a byte-order mark**. Hebrew station
names come out as mojibake if you read with plain `utf-8`. Use `utf-8-sig` in
Python (`pd.read_csv(path, encoding="utf-8-sig")`) or strip the BOM equivalently
in other languages. This is the single most common "why is the Hebrew broken"
cause.

## Critical Israel-specific behaviors

These are the deviations that cause silent, hard-to-debug errors. Internalize
them before trusting any query result.

**1. There is no `calendar.txt` — only `calendar_dates.txt`.**
Service is expressed purely as explicit date exceptions. Every active
(`service_id`, `date`) pair appears as one row with `exception_type = 1`. There
are no weekly service patterns to expand; just join `trips.service_id` →
`calendar_dates.service_id` and filter by the literal `date`. The same logical
trip on a different day gets a **different `trip_id` and a different
`service_id`**, so `trip_id` is a per-day running number with no meaning beyond
identity.

**2. Times use a 28-hour "service day", and Israel Railways is the exception.**
`arrival_time` / `departure_time` can exceed `24:00:00` (e.g. `25:30:00`).
- **All operators except rail:** the service day runs **04:00 → 03:59 the next
  calendar day**. A trip after midnight belongs to the *previous* service date and
  is written in extended form (`24:00:00`–`27:59:59`). Example: a trip at 01:30 on
  15/04/2025 is reported under service date **14/04/2025** with time
  **`25:30:00`**.
- **Israel Railways:** the service day = the **calendar day** (00:00–24:00). Only
  trips that start before midnight and *end* after it use extended (>24:00) times.
  A rail trip starting between 00:00 and 04:00 belongs to the day it starts on,
  **not** the previous service day.

  Parsing `25:30:00` with a naive `%H:%M:%S` throws or wraps incorrectly. Use
  `scripts/gtfs_time.py`, which converts `(service_date, "25:30:00")` to a real
  timestamp and handles the rail/non-rail service-day boundary in both
  directions. All `timepoint` values are currently `1` (times are exact).

**3. `stops.zone_id` is always `0` — you cannot get fare zones from it.**
The `zone_id` column exists but is unused (every row is `0`). The
`origin_id` / `destination_id` in `fare_rules` nominally reference it, but in
practice fare-zone membership is **geographic**: match each stop's
`stop_lat` / `stop_lon` against the polygons in `zones_2022.kml` (the zone id is
the `<zone>` field). No stop→zone lookup table is provided; you compute it
yourself with point-in-polygon. This trips up nearly everyone trying to price a
trip. See `references/fares.md`.

**4. Israel Railways (`route_type = 2`) is special-cased throughout.** Treat rail
as its own path. For rail rows:
- `route_short_name` is empty; `route_long_name` = "origin city - destination
  city".
- `trips.trip_headsign` holds the **train number**, not a destination name.
- `trips.shape_id` is empty and there are **no shape points** for rail.
- `stops.stop_desc` is empty; `stop_times.shape_dist_traveled` is empty.
- One `route_id` aggregates *all* trains that share an identical stop sequence;
  the individual trains are the rows in `trips`.
- The service-day / time rules differ (gotcha #2).

**5. `route_id` is opaque; the real line metadata lives in `RouteNetworksByDate`.**
`routes.txt` deliberately omits the catalog line code, direction, and
alternative. To learn what a route *is*, join `routes.route_id` →
`RouteNetworksByDate.RouteId`, which gives `OfficeLineId` (the 5-digit מק"ט /
Catalog Line Code), `LineId` (the public line number), `Direction`,
`LineAlternative`, `NetworkId` / `NetworkName` (cluster/אשכול), and `AgencyId`.
The מק"ט is `[2-digit disambiguator][3-digit line number]` — e.g. line 92 is
`12092` in Haifa, `21092` in Karmiel, `23092` in Netanya. Because a line can
move between clusters, a `RouteId` may appear in two rows during a transition
(distinguish with `FromDate` / `ToDate`), and the operator can change with the
cluster.

**6. `direction_id` is a lossy mapping of the MOT direction.** GTFS only allows
0/1, so: `0` ← MOT direction **1 (outbound)** *or* **3 (circular)**; `1` ← MOT
direction **2 (inbound)**. The original (including "circular") is in
`RouteNetworksByDate.Direction` (1/2/3).

**7. `fare_id` encodes the operator.** Post-reform, the fare between two points is
uniform across operators, but GTFS requires a distinct `fare_id` per agency, so
rows are duplicated. A `fare_id` decomposes as `[operator id (= agency_id)][last
3 digits = MOT fare code]`. Expect every `(origin_id, destination_id)` pair to
recur once per operator.

**8. `route_type` and `route_color` use Israeli conventions.**
`route_type`: `0` light rail (Jerusalem "כפיר"), `2` Israel Railways, `3` bus
(includes taxis/share-taxis and BRT/Matronit/מטרונית), `6` cable car (רכבלית),
`7` funicular (כרמלית). `route_color` flags special line classes: students
(תלמידים) `#FF9933`, sea lines (ים) `#3399FF`, rail-feeder (הזנה לרכבת)
`#33CC33`, night (לילה) `#9933FF`; regular lines have no color.

## Common tasks

**Find which lines/trips serve a stop in a time window** (the canonical query):
1. Join `trips` → `calendar_dates` on `service_id`, filter to the target date.
2. Join that to `stop_times` on `trip_id`.
3. Filter by `stop_id` and an `arrival_time`/`departure_time` range — **using the
   28-hour-aware comparison** (gotcha #2), or your window will miss/duplicate
   post-midnight trips. Convert times via `scripts/gtfs_time.py` first.
4. Join back to `routes` (and optionally `RouteNetworksByDate`) for human-readable
   line info.

**Identify a route** (line number, cluster, operator): `routes` → join
`RouteNetworksByDate` on route_id (gotcha #5). Don't try to parse meaning out of
`route_id` itself.

**Price a single ride, daily pass, or monthly pass:** this is non-trivial — read
`references/fares.md`. In brief: resolve origin & destination stops to zones via
`zones_2022.kml` (gotcha #3), screen `tariff_2022.csv` rows for all matching
conditions and take the lowest `Price`, then apply the rider's discount from
`profiles_2022.csv`. The simpler `fare_rules`/`fare_attributes` path only gives
the base single-ride fare and still depends on geographic zone matching.

**Draw a route on a map:** use `shapes.txt` (`shape_pt_sequence` is consecutive
from 1). Remember rail has no shapes (gotcha #4).

## Real-time data: SIRI-SM (Stop Monitoring)

The MOT real-time data center exposes a **SIRI-SM v2.8** Stop Monitoring API
(version 2.7 is end-of-life since May 2025). It answers "which vehicles are
arriving at this stop and when", plus live vehicle positions. It's a **SIRI-Lite
HTTP GET** API: you build a URL, you get XML or JSON back. Access (a base URL +
access key + RequestorRef) is issued by MOT per developer, and auth is by **IP
allow-list** — requests from an unregistered IP are rejected.

Use `references/siri-sm.md` for the full request/response spec, field tables, the
capability matrix, and the complete SIRI↔GTFS field mapping. Use
`scripts/siri_sm.py` to build valid request URLs and to format/parse the unusual
`StartTime` value. The deviations and footguns that matter most:

1. **Only one parameter may carry multiple comma-separated values.**
   `MonitoringRef=32901,32902&LineRef=5` is valid; `MonitoringRef=32901,32902&LineRef=5,6`
   is **rejected**. The URL builder enforces this.

2. **SIRI references are GTFS `stop_code`, not `stop_id`.** `MonitoringRef`,
   `StopPointRef`, `OriginRef`, `DestinationRef` are all the public stop code —
   join them to `stops.stop_code` in the GTFS feed. `LineRef`→`route_id`,
   `PublishedLineName`→`route_short_name`, `OperatorRef`→`agency_id`.

3. **`TripIdToDate.txt` is gone.** The spec maps `FramedVehicleJourneyRef`
   (`DataFrameRef` + `DatedVehicleJourneyRef`) to "TripId at TripIdToDate.txt",
   but that GTFS file was removed in Sept 2025. You can no longer resolve a SIRI
   trip to a GTFS `trip_id` via that file. Correlate instead on line + date
   (`DataFrameRef`) + `OriginAimedDepartureTime` + direction.

4. **`DirectionRef` is the MOT direction (1/2/3), not GTFS `direction_id`.** It
   matches `RouteNetworksByDate.Direction` (1 outbound, 2 inbound, 3 circular).
   The spec's "1,2,3 ↔ 0,1,2" mapping is misleading — to relate it to GTFS use
   gotcha #6 (1 or 3 → `direction_id` 0, 2 → 1).

5. **Snapshot filters replace the stop code in `MonitoringRef`** for whole-network
   feeds: `AllActiveTripsFilter` (≈ GTFS-RT vehicle positions at `normal`, trip
   updates at `calls`) and `AllPlannedTripsFilter` (trips departing within 4h).
   These are **JSON only**, must be polled ≥15s apart, and must **not** include
   `PreviewInterval`, `StartTime`, `LineRef`, `MaximumStopVisits`,
   `MaximumStopVisitsPerLine`, or `MaximumNumberOfCallsOnwards`. (`MonitoringRef=all`
   is different: it needs a `LineRef` and does allow XML.)

6. **`MonitoredCall.DistanceFromStop` is redefined by MOT.** Despite the name it's
   the distance the vehicle has traveled **from the start of the journey** (the
   operator's `LinkDistance`), in **meters** — not distance from the stop.

7. **No names, English only.** The server returns codes/references, not stop or
   line names (`UseNames=False`, no translations) — resolve names via GTFS.
   Coordinates are WGS84 decimal degrees. Note the spec's worked examples contain
   placeholder/erroneous coordinates (e.g. New York lat/lon) and a copy-pasted
   "Latitude" label on the longitude field; real values are in Israel.

## Reference material

- **`references/file-schemas.md`** — field-by-field reference for *every* file in
  *every* GTFS package (main feed, RouteNetworksByDate, tariff/profiles, zones,
  ChargingRavKav), with the Israeli-specific notes per field. Read the relevant
  section when you need exact column semantics, valid values, or which fields are
  empty/unused.
- **`references/fares.md`** — the full fare-calculation algorithm: zone matching,
  the `tariff_2022.csv` screening flow, profile discounts, and how the legacy
  `fare_rules`/`fare_attributes` relate to it.
- **`references/siri-sm.md`** — the real-time SIRI-SM v2.8 spec: request URL
  format and parameters, the three snapshot modes, the full response hierarchy
  and field tables (MonitoredStopVisit / MonitoredVehicleJourney / MonitoredCall
  / OnwardCall), error messages, the capability matrix, and the SIRI↔GTFS mapping.

## Helper scripts

- **`scripts/gtfs_time.py`** — parse/format the 28-hour extended time format and
  convert between GTFS service-day clock times and real timestamps, with correct
  rail vs. non-rail service-day handling. Import its functions or run it directly
  for a demo.
- **`scripts/download_feed.py`** — download and extract the five GTFS archives
  from `gtfs.mot.gov.il` into a target directory (run in the user's environment).
- **`scripts/siri_sm.py`** — build valid SIRI-SM request URLs (enforcing the
  one-multi-valued-parameter and snapshot-mode rules) and format/parse the
  `YYYYMMDDTHHmmSSPzz` `StartTime` value. Import or run for a demo.

When something isn't covered here and isn't an Israeli deviation, fall back to
the standard GTFS / SIRI spec rather than guessing.
