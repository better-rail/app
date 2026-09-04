# Israel SIRI-SM (Real-Time Stop Monitoring) — v2.8

Reference for the MOT real-time data center's Stop Monitoring API. It implements
**SIRI-SM** (Service Interface for Real Time Information — Stop Monitoring) from
**CEN/EN 15531:2012**, based on SIRI 2.0, delivered as **SIRI-Lite** (HTTP GET).
Only version **2.8** is supported; 2.7 reached end-of-life on 12/5/2025.

Authoritative order when documents conflict: (A) this ICD / the MOT tables,
(B) the SIRI schema files, (C) the CEN documents. SIRI schema:
`http://www.siri.org.uk/schema/2.0/Siri_XML-v2.0.zip`.

## Contents
- [Access & auth](#access)
- [Request URL](#request)
- [Request parameters](#params)
- [StartTime format](#starttime)
- [Snapshot modes](#snapshots)
- [Response structure](#response)
- [Field tables](#fields)
- [Errors](#errors)
- [SIRI ↔ GTFS field mapping](#mapping)
- [Capability matrix (what's on/off)](#capabilities)

---

## Access & auth {#access}

- The base URL, an access **Key**, and a **RequestorRef** (username) are issued
  by MOT to each developer by email. This reference writes the base as
  `<base address>`.
- Auth is **IP allow-list**: a request from an unregistered IP returns an error.
  The `Key` URL parameter is also required.
- Because it's SIRI-Lite, the request does **not** conform to the SIRI XSD, and
  some normally-mandatory SIRI fields (e.g. `RequestTimestamp`) are omitted.
- gzip response compression is supported.

## Request URL {#request}

    <base address> / 2.8 / {xml|json} ? Key=<key> & <param>=<value> & ...

- Path segments: version (`2.8`) then response format (`xml` or `json`).
- Parameters: `name=value`, joined with `&`; order doesn't matter.
- A parameter may take **multiple values** as a comma-separated list
  (`MonitoringRef=32901,32902`).
- **Only one parameter in the whole request may be multi-valued.**
  - valid: `MonitoringRef=32901,32902&LineRef=789`
  - valid: `MonitoringRef=32901&LineRef=567,5637`
  - **invalid:** `MonitoringRef=32901,32902&LineRef=567,5637`

Examples (dummy key `DM1234`):

    .../2.8/xml?Key=DM1234&MonitoringRef=32902                       # one stop, XML
    .../2.8/json?Key=DM1234&MonitoringRef=32902                      # one stop, JSON
    .../2.8/xml?Key=DM1234&MonitoringRef=32901,32902                 # two stops
    .../2.8/xml?Key=DM1234&MonitoringRef=32901,32902&LineRef=5       # two stops, line 5
    .../2.8/xml?Key=DM1234&MonitoringRef=32902&PreviewInterval=PT45M # next 45 min
    .../2.8/xml?Key=DM1234&MonitoringRef=32901&LineRef=5,6           # one stop, lines 5 & 6
    .../2.8/xml?Key=DM1234&MonitoringRef=all&LineRef=5               # whole line 5
    .../2.8/xml?Key=DM1234&MonitoringRef=32902&StopVisitDetailLevel=calls
    .../2.8/json?Key=DM1234&MonitoringRef=AllActiveTripsFilter&StopVisitDetailLevel=normal

> The spec writes the `PreviewInterval` example as `PreviewInternal` (typo). The
> correct parameter name is **`PreviewInterval`**.

## Request parameters {#params}

Cardinality: `1:1` mandatory-once, `0:1` optional-once, `0:*` optional-many.

| Parameter | Card. | Type | Meaning |
|---|---|---|---|
| `MonitoringRef` | 1:1 | stop code or snapshot filter | The monitored stop code(s), or a pre-defined filter (`all`, `AllActiveTripsFilter`, `AllPlannedTripsFilter`). |
| `PreviewInterval` | 0:1 | xsd:duration | Forward window; only journeys arriving/departing within it are returned. `PT45M`, `PT1H`. Default **30 min**. |
| `StartTime` | 0:1 | see below | Start of the preview window. Default: now. |
| `LineRef` | 0:1 | line code | Restrict to these line(s) (= GTFS `route_id`). Default: all lines. |
| `MaximumStopVisits` | 0:1 | positiveInteger | Cap total stop visits returned. Default: no limit. |
| `MaximumStopVisitsPerLine` | 0:1 | positiveInteger | Cap visits per line. Default: none. Set **3** to emulate v2.7 behavior. |
| `StopVisitDetailLevel` | 0:1 | `normal` \| `calls` | `normal` = no `OnwardCalls`; `calls` = include `OnwardCalls`. Default `normal`. |
| `MaximumNumberOfCallsOnwards` | 0:1 | positiveInteger | Cap `OnwardCall` entities per journey. Default: no limit. |

(The spec briefly uses the old name `StopMonitoringDetailLevel`; the current name
is **`StopVisitDetailLevel`**.)

## StartTime format {#starttime}

`YYYYMMDDTHHmmSSPzz` — `T` and `P` are literal separators; `zz` is the GMT offset
in **hours**. Example: `20181125T214953P02` ≡ `2018-11-25T21:49:53+02:00`.
Israel is `P02` (standard time, IST) or `P03` (daylight time, IDT). Use
`scripts/siri_sm.py` to build/parse this.

## Snapshot modes {#snapshots}

Pre-defined values that replace the stop code in `MonitoringRef` to get a
whole-network picture in one request.

**`MonitoringRef=all`** (not a "snapshot"; XML allowed)
- Requires a `LineRef`. Returns expected arrivals of all vehicles on that line to
  all of the line's stops, as a series of `MonitoredStopVisit`. (The v2.8
  `OnwardCalls` mechanism is more compact than this filter.)

The two true **snapshots** below share these rules (§7.18): **JSON only** (XML
unsupported); poll **≥15 s apart**; do **not** send `PreviewInterval`,
`StartTime`, `LineRef`, `MaximumStopVisits`, `MaximumStopVisitsPerLine`, or
`MaximumNumberOfCallsOnwards`. Each returns a series of `MonitoredStopVisit`, and
you always receive the latest pre-generated response.

| Filter + detail level | Refresh | Contains | GTFS-RT analogue |
|---|---|---|---|
| `AllActiveTripsFilter` + `normal` | 15 s | active-trip vehicles: trip info + position (`VehicleLocation`, `Bearing`, `Velocity`), **no predictions** | vehicle positions |
| `AllActiveTripsFilter` + `calls` | 30 s | the above + `ConfidenceLevel` + `OnwardCalls` predictions to all not-yet-visited stops | trip updates |
| `AllPlannedTripsFilter` + `normal` | 60 s | planned (not-yet-active) trips + `OnwardCalls` predictions to all planned stops; only trips departing **within 4 h** | — |

An "active trip" runs from when the vehicle is at the origin stop until it
reaches the destination stop. Field-by-field presence per snapshot is in §7.18.5
of the source; the practical summary is the table above.

## Response structure {#response}

XML or JSON per the URL. XML validates against SIRI 2.0 `siri.xsd`. Shape
(XML, abbreviated):

    Siri
      ServiceDelivery
        ResponseTimestamp, ProducerRef, ResponseMessageIdentifier
        StopMonitoringDelivery version="2.8"
          ResponseTimestamp, ValidUntil
          MonitoredStopVisit*            (0..* — the payload)
            RecordedAtTime, ItemIdentifier, MonitoringRef
            MonitoredVehicleJourney
              LineRef, DirectionRef
              FramedVehicleJourneyRef { DataFrameRef, DatedVehicleJourneyRef }
              PublishedLineName, OperatorRef, OriginRef, DestinationRef
              OriginAimedDepartureTime, ConfidenceLevel
              VehicleLocation { Longitude, Latitude }, Bearing, Velocity
              VehicleRef
              MonitoredCall { ... }
              OnwardCalls { OnwardCall* { ... } }

## Field tables {#fields}

**MonitoredVehicleJourney** (CEN Vol 3 t.43):

| Field | Card. | Notes |
|---|---|---|
| `LineRef` | 1:1 | Line code = GTFS `route_id`. |
| `DirectionRef` | 1:1 | **1, 2, or 3** = MOT direction (out/in/circular); = `RouteNetworksByDate.Direction`. |
| `FramedVehicleJourneyRef.DataFrameRef` | 1:1 | Trip's service date, e.g. `2019-05-11`. |
| `FramedVehicleJourneyRef.DatedVehicleJourneyRef` | 1:1 | Numeric MOT trip id (e.g. `20925867`). Historically resolved via `TripIdToDate.txt` — **that file is removed**; see below. |
| `PublishedLineName` | 1:1 | On-vehicle line number = GTFS `route_short_name` (e.g. `561`, `7`, `99א`). |
| `OperatorRef` | 1:1 | Operator code = GTFS `agency_id`. |
| `DestinationRef` | 1:1 | Destination stop code = GTFS `stop_code`. |
| `OriginRef` | — | Origin stop code = GTFS `stop_code` (seen in examples). |
| `OriginAimedDepartureTime` | 1:1 | Scheduled journey start per the licensing system; should match the planned departure for that trip. |
| `ConfidenceLevel` | 0:1 (2.8) | `certain` \| `veryReliable` \| `reliable` \| `probablyReliable` \| `unconfirmed`. |
| `VehicleLocation.Longitude` / `.Latitude` | 1:1 | WGS84 decimal degrees. (Spec labels both "Latitude" — the first is longitude.) |
| `Bearing` | 0:1 (2.8) | Degrees from north, 0–360. |
| `Velocity` | 0:1 (2.8) | km/h. |
| `VehicleRef` | 1:1 | Vehicle license-plate number (e.g. `9030930`). |
| `MonitoredCall` | 0:1 | Prediction for the monitored stop (mode A) or current/last stop (mode B). |
| `OnwardCalls` | 0:1 (2.8) | Forward predictions (see below). |

**MonitoredCall** (CEN Vol 3 t.45) has two meanings:
- **Mode A** — normal stop-monitoring request (arrivals to the monitored stop).
- **Mode B** — snapshot requests (§7.15–7.17) or any request with
  `StopVisitDetailLevel=calls`; here it describes the stop the vehicle is at now
  or just visited, and arrival-time sub-fields are omitted.

| Field | Card. | Mode A | Mode B |
|---|---|---|---|
| `StopPointRef` | 1:1 | monitored stop code | current/last stop code |
| `Order` | 0:1 (2.8) | monitored stop order (first = 1) | current/last stop order |
| `AimedArrivalTime` | 0:1 | planned arrival; passed **only before** the journey starts (then equals `ExpectedArrivalTime`) | not passed |
| `ExpectedArrivalTime` | 0:1 | expected arrival (passed before and after start) | not passed |
| `ArrivalStatus` | 0:1 (2.8) | `onTime`\|`early`\|`delayed`\|`cancelled`\|`arrived`\|`noReport` | not passed |
| `ArrivalPlatformName` | 0:1 (2.8) | platform name, mainly trains | not passed |
| `DistanceFromStop` | 0:1 (2.8) | — | **MOT-redefined**: meters traveled from journey start (operator `LinkDistance`), *not* distance to the stop |

**OnwardCall** (CEN Vol 3 t.48): predictions for every stop from the next stop the
vehicle will reach through the last stop of the line. Independent of
`MonitoredCall` (may overlap). Example: a 10-stop line with the vehicle between
stops 4 and 5 yields OnwardCalls for stops 5–10.

| Field | Card. | Notes |
|---|---|---|
| `StopPointRef` | 1:1 | Stop code. |
| `Order` | 1:1 | Stop order (first = 1). |
| `ExpectedArrivalTime` | 1:1 | Expected arrival. |
| `ArrivalStatus` | 0:1 | Same enum as above; `cancelled` if that stop is skipped. |
| `ArrivalPlatformName` | 0:1 | Platform, mainly trains. |

## Errors {#errors}

Errors come back inside `StopMonitoringDelivery` as
`ErrorCondition > OtherError > ErrorText`. Known messages:
- `API key is not authorized`
- `No such route: <id>`
- `No such stop: <code>`

## SIRI ↔ GTFS field mapping {#mapping}

| Meaning | SIRI | GTFS |
|---|---|---|
| Line id | `LineRef` | `route_id` |
| Operator | `OperatorRef` | `agency_id` |
| Direction | `DirectionRef` (1/2/3) | `direction_id` (0/1) — **not a simple −1**; see note |
| Line signage | `PublishedLineName` | `route_short_name` |
| Stop code | `MonitoringRef` / `StopPointRef` / `OriginRef` / `DestinationRef` | **`stop_code`** (not `stop_id`) |
| Stop order | `Order` | `stop_sequence` |
| Trip id | `FramedVehicleJourneyRef` (`DataFrameRef` + `DatedVehicleJourneyRef`) | formerly `TripIdToDate.txt` — **removed** |
| Scheduled departure | `OriginAimedDepartureTime` | `departure_time` (stop_times) |

Two cross-feed traps:
- **`DatedVehicleJourneyRef` / `TripIdToDate.txt`:** the GTFS `TripIdToDate.txt`
  file was removed (Sept 2025), so you can't map a SIRI trip to a GTFS `trip_id`
  through it anymore. Correlate on line + `DataFrameRef` (date) +
  `OriginAimedDepartureTime` + direction instead.
- **Direction:** treat `DirectionRef` as the MOT direction (1 out, 2 in, 3
  circular). To match GTFS `direction_id`, apply the collapsing rule (1 or 3 → 0,
  2 → 1), *not* the literal "1,2,3 → 0,1,2" in the spec's mapping table.

## Capability matrix (what's on/off) {#capabilities}

MOT's choices (CEN Vol 2 t.6 / Vol 3 t.33). `True`/`YES` = supported (client may
use); `False`/`NO` = unsupported.

- Transport: Request-Response over **SIRI-Lite HTTP GET**; **DirectDelivery** yes;
  **Compression** (gzip) yes; **AccessControl** by IP; no SubscriptionPolicy
  (polling only); no CheckStatus/Heartbeat; SoapEnvelope no in 2.8.
- Filtering: `FilterByMonitoringRef` ✓, `FilterByLineRef` ✓, `ByStartTime` ✓;
  **`FilterByDirectionRef` ✗**, **`FilterByDestination` ✗**, `FilterByVisitType` ✗.
- Detail: `HasDetailLevel` ✓ (default `Normal`); `HasMaximumVisits` ✓;
  `HasMaximumStopVisitsPerLine` ✓ (non-SIRI, for v2.7 back-compat);
  `HasNumberOfOnwardsCalls` ✓; `HasNumberOfPreviousCalls` ✗;
  `HasMinimumStopVisitsPerLine` ✗.
- Output: `UseReferences` ✓ (returns codes), **`UseNames` ✗** (no stop/line names
  — get them from GTFS); `Translations` ✗; language **English**; coordinates
  **WGS84 decimal degrees**; `HasLineNotice` ✗.
- AccessControl sub-features (`RequestChecking`, `CheckOperatorRef`,
  `CheckLineRef`, `CheckMonitoringRef`): all ✗.

`DefaultPreviewInterval` = 30 minutes.
