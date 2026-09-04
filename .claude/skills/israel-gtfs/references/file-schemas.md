# Israel GTFS — File & Field Reference

Field-by-field reference for every file across all five packages. For each field,
the focus is on **what differs from standard GTFS** or what an Israeli-feed
consumer needs to know. Fields that behave like the standard are noted briefly;
see https://gtfs.org/documentation/schedule/reference/ for canonical definitions.

Source: National Authority for Public Transport "GTFS – Developer Information",
update date 28/12/2025.

## Contents

- [Main package: israel-public-transportation](#main-package)
  - [agency](#agency) · [routes](#routes) · [trips](#trips) ·
    [calendar_dates](#calendar_dates) · [stop_times](#stop_times) ·
    [stops](#stops) · [levels](#levels) · [shapes](#shapes) ·
    [fare_attributes](#fare_attributes) · [fare_rules](#fare_rules) ·
    [translations](#translations) · [networks](#networks) · [feed_info](#feed_info)
- [RouteNetworksByDate](#routenetworksbydate)
- [Tariff2022: tariff_2022.csv](#tariff_2022) · [profiles_2022.csv](#profiles_2022)
- [zones_2022.kml](#zones_2022)
- [ChargingRavKav](#chargingravkav)

> The set of optional GTFS fields present may change over time; treat columns
> defensively (a field documented today may be added/removed later).

---

## Main package {#main-package}

### agency {#agency}
Operators (מפעילים).

| Field | Notes |
|---|---|
| `agency_id` | Operator code. |
| `agency_name` | Operator name. |
| `agency_url` | Operator site. |
| `agency_timezone` | Fixed: `Asia/Jerusalem`. |
| `agency_lang` | Fixed: `he`. |
| `agency_phone` | Operator phone. |
| `agency_fare_url` | Operator fares page. |
| `agency_email` | Customer-service email (added 09/2025). |

### routes {#routes}
One row per line identifier (all directions/alternatives collapsed; the
distinguishing metadata is in [RouteNetworksByDate](#routenetworksbydate)).

| Field | Notes |
|---|---|
| `route_id` | Unique, permanent, **opaque** code. Don't parse meaning from it. |
| `agency_id` | **Current** operator. If an operator change is scheduled within 10 days, the *current* operator is still shown here; the upcoming one is only in RouteNetworksByDate. |
| `route_short_name` | The on-vehicle line sign (e.g. `92`, `92א`). **Empty for rail.** |
| `route_long_name` | Rail: "origin city - destination city". Others: shortened public names of first/last stops, with destination city prefixed when origin and destination cities differ (e.g. `פתח תקווה : פארק-טק - אריאל : מוריה/שד. ירושלים`). |
| `route_desc` | Optional; currently always empty. |
| `route_type` | `0` light rail, `2` rail, `3` bus (incl. taxi & BRT/Matronit), `6` cable car (רכבלית), `7` funicular (כרמלית). |
| `route_url` | Optional; currently always empty. |
| `route_color` | Special classes only: students `#FF9933`, sea `#3399FF`, rail-feeder `#33CC33`, night `#9933FF`; regular = none. |
| `route_text_color` | Defaults to `000000`. |
| `continuous_pickup` | `0` full flexibility (scheduled-service taxi); `1`/empty none (usual); `2` phone agency (unused). |
| `continuous_drop_off` | Same value set as `continuous_pickup`. |

### trips {#trips}
One row per single trip. A trip is unique by (stop sequence, departure time from
first stop, `service_id` = service date); but two trips departing at the exact
same time still get separate `trip_id`s.

| Field | Notes |
|---|---|
| `route_id` | → routes. |
| `service_id` | → calendar_dates (the specific date). |
| `trip_id` | Per-day running number; **differs each day** for the "same" trip. No inherent meaning. |
| `trip_headsign` | Others: final destination station public name; city prefixed with `_` when origin/destination cities differ (e.g. `פתח תקווה_פארק-טק`). **Rail: the train number.** May be overridden mid-trip by `stop_times.stop_headsign`. |
| `direction_id` | `0` ← MOT 1 (outbound) or 3 (circular); `1` ← MOT 2 (inbound). Original value in RouteNetworksByDate. |
| `shape_id` | → shapes; can be blank. **Empty for rail.** |
| `wheelchair_accessible` | `0`/empty unknown, `1` accessible, `2` not. |
| `bikes_allowed` | `0`/empty unknown, `1` yes, `2` no. Currently **always empty**. |

### calendar_dates {#calendar_dates}
The **only** service-calendar file (no `calendar.txt`). One row per active
(service, date) pair.

| Field | Notes |
|---|---|
| `service_id` | → trips. |
| `date` | The calendar date. |
| `exception_type` | Always `1` (service added). |

### stop_times {#stop_times}
Trip schedule, one row per stop in sequence.

| Field | Notes |
|---|---|
| `trip_id` | → trips. |
| `arrival_time` | 28-hour service-day format; can be `24:00:00`–`27:59:59`. Rail uses calendar-day service days (see SKILL.md gotcha #2). Estimated at non-first stops. |
| `departure_time` | Same format. Equals `arrival_time` unless a scheduled layover applies. |
| `stop_id` | → stops (MOT licensing-system stop number). |
| `stop_sequence` | Order along the line. |
| `stop_headsign` | Overrides `trips.trip_headsign` between stops. Usually empty (reserved for cyclic routes). |
| `pickup_type` | `0`/empty regular, `1` none, `2` phone agency, `3` coordinate with driver. |
| `drop_off_type` | Same value set as `pickup_type`. |
| `continuous_pickup` | As in routes, but scoped to this stop→next stop. |
| `continuous_drop_off` | Same. |
| `shape_dist_traveled` | Distance from origin stop. **Empty for rail.** |
| `timepoint` | `0` approximate, `1` exact. Currently **always `1`**. |

### stops {#stops}
All stations/stops in Israel.

| Field | Notes |
|---|---|
| `stop_id` | MOT stop number. → stop_times. |
| `stop_code` | The number printed on the physical stop. |
| `stop_name` | Official name. |
| `tts_stop_name` | Text-to-speech name; currently **always empty**. |
| `stop_desc` | Templated: `Street: … City: … platform: … floor: …` (labels always present even when blank). **Empty for rail.** |
| `stop_lat` / `stop_lon` | WGS-84. Use these for zone matching. |
| `zone_id` | **Always `0` — unused.** Do not use for fares (see SKILL.md gotcha #3). |
| `location_type` | `1` = central station / terminal (מסוף / תחנה מרכזית); `0` = regular stop or a platform within a station. |
| `parent_station` | Empty for a standalone stop *or* for a central station itself; for a platform inside a central station, the `stop_id` of that station (which must have `location_type = 1`). |
| `stop_timezone` | `Asia/Jerusalem`. |
| `wheelchair_boarding` | Parentless: `0`/empty unknown, `1` some vehicles boardable, `2` not. Child stop: `0`/empty inherits from parent. |
| `level_id` | → levels. |
| `platform_code` | Bare platform id (e.g. `G`, `3`). |

### levels {#levels}
Floors of central stations.

| Field | Notes |
|---|---|
| `level_id` | Unique level id. |
| `level_index` | Numeric relative position. |

### shapes {#shapes}
Route geometry. **No rows for rail routes.**

| Field | Notes |
|---|---|
| `shape_id` | → trips. |
| `shape_pt_lat` / `shape_pt_lon` | WGS-84. |
| `shape_pt_sequence` | Consecutive, starting at `1`. |
| `shape_dist_traveled` | Distance from first shape point. |

### fare_attributes {#fare_attributes}
Base single-ride fares. Post-reform, fares are uniform by distance across
operators, but GTFS forces one `fare_id` per operator, so the set is duplicated
per agency. See [fares.md](fares.md).

| Field | Notes |
|---|---|
| `fare_id` | `[agency_id][last 3 digits = MOT fare code]`. → fare_rules. |
| `price` | New Israeli Shekel (₪). |
| `currency_type` | `ILS`. |
| `payment_method` | Fixed `0` (pay on board). |
| `transfers` | Fixed `0` (no transfer modeled). |
| `agency_id` | Operator this fare_id belongs to. |
| `transfer_duration` | Currently null. |

### fare_rules {#fare_rules}
Single-ride fare rules for trips within the feed's ~10-day window.

| Field | Notes |
|---|---|
| `fare_id` | → fare_attributes. |
| `route_id` | Present **only** when the route has a single flat fare (then origin/destination are empty). |
| `origin_id` | Origin zone code. Empty for flat-fare routes. Nominally → `stops.zone_id`, but that's always 0 — match via [zones_2022.kml](#zones_2022). |
| `destination_id` | Destination zone code; same caveat. |
| `contains_id` | Null. |

When a route has multiple fares, `route_id` is empty and pricing is by
`(origin_id, destination_id)` — which repeats once per agency.

### translations {#translations}
Station/route name translations to English and Arabic. See
https://support.google.com/transitpartners/answer/2450962.

| Field | Notes |
|---|---|
| `table_name` | One of `agency`, `stops`, `routes`, `trips`, `stop_times`, `levels`, `feed_info`. |
| `field_name` | Field being translated. |
| `language` | `EN` or `AR`. |
| `translation` | The translated text. |
| `record_id` | The record's unique id (`agency_id`, `stop_id`, `route_id`, `trip_id`; for stop_times, the `trip_id`). |
| `record_sub_id` | Only for stop_times' composite key → the `stop_sequence` (paired with record_id = trip_id). Empty elsewhere; tied to `stop_headsign`, which is not yet in use. |
| `field_value` | Alternative value-based targeting; **not in use** (all translations key off unique ids). |

### networks {#networks}
Clusters (אשכול). A route's network can change over time — resolve the correct
mapping via [RouteNetworksByDate](#routenetworksbydate).

| Field | Notes |
|---|---|
| `network_id` | Unique cluster code. |
| `network_name` | Cluster name. |

### feed_info {#feed_info}
Dataset metadata.

| Field | Constant / meaning |
|---|---|
| `feed_publisher_name` | `משרד התחבורה`. |
| `feed_publisher_url` | `https://transportation.org.il/`. |
| `feed_lang` | `HE`. |
| `default_lang` | `HE`. |
| `feed_start_date` | Generation date. |
| `feed_end_date` | Generation date **+ 10 days** (validity window). |
| `feed_version` | `2.0`. |
| `feed_contact_email` | `transport@transportation.org.il`. |
| `feed_contact_url` | `https://transportation.org.il/he/contact-he`. |

---

## RouteNetworksByDate {#routenetworksbydate}
Single file mapping each route to its line catalog code, direction, alternative,
cluster, and operator over time. **This is where route metadata that's missing
from `routes.txt` lives.** Because a line can migrate between clusters, a
`RouteId` may appear twice during a transition (old + new cluster); use
`FromDate`/`ToDate` to disambiguate. (Replaced the older `ClusterToLine` file.)

| Field | Notes |
|---|---|
| `RouteId` | → routes. |
| `OfficeLineId` | 5-digit Catalog Line Code (מק"ט): `[2-digit disambiguator][3-digit line number]` (e.g. `12092` Haifa, `21092` Karmiel, `23092` Netanya line 92). |
| `LineId` | Public line number = last 3 digits of OfficeLineId, no leading zeros. |
| `Direction` | MOT direction: `1` outbound, `2` inbound, `3` circular. |
| `LineAlternative` | Line variant (חלופה); each alternative gets its own RouteId. |
| `FromDate` | When the line joined this cluster. |
| `ToDate` | Usually empty; set when the line is moving to another cluster. |
| `NetworkId` | → networks (cluster code). |
| `NetworkName` | Cluster name. |
| `NetworkSubDesc` | Sub-cluster; usually empty. |
| `AgencyId` | Operator for this cluster → agency. May change when the cluster changes. |
| `AgencyName` | Operator name. |
| `LineType` | Line-type code. |
| `LineTypeDesc` | `עירוני` urban, `בינעירוני` intercity, `אזורי` regional. |

---

## Tariff2022 package

### tariff_2022.csv {#tariff_2022}
Distance/zone-based fares for single ride, daily pass, and monthly pass. To price
a trip: screen rows where **all** conditions match, then take the **lowest**
`Price`; run the flow separately per product (single/daily/monthly). See
[fares.md](fares.md).

| Field | Notes |
|---|---|
| `PredefinedCode` / `PredefinedCodeDesc` | Sharing/grouping code (קוד שיתוף) + description. |
| `ETT` / `ETTDesc` | ETT code as written to the RavKav card + description. |
| `FareCode` / `FareCodeDesc` | Card fare code (קוד כרטיס) + description. |
| `OutterRing` | Valid only if max travel distance (km) is below this value. |
| `Transportion` | One of `Bus`, `Carmelit`, `Racbalit`, `LightRail`, `Train` (note the spelling). |
| `Price` | Single trip or daily/monthly pass price. |
| `PrePaid` | `true` ⇒ valid for RavKav payment. |
| `PostPaid` | `true` ⇒ valid for app payment. |
| `FromDate` / `ToDate` | Travel date must be after `FromDate` and before `ToDate`. |
| `FromZones` | `;`-separated zone ids (per zones_2022.kml); origin zone must be in this list. |
| `ToZones` | `;`-separated; destination zone must be in this list. |
| `ColorCode` / `ColorName` | HTML color (e.g. `#ffd800`) and name associated with the distance band. |

### profiles_2022.csv {#profiles_2022}
Per-rider-profile discounts, applied **after** finding the base fare. Discounts
are percentages; `100` means free; a blank/black cell means no discount.

| Field | Notes |
|---|---|
| `ProfileCode` / `ProfileName` | Profile id + name. |
| `FreeCertificate` | Whether the profile qualifies for a free-travel certificate. |
| `SingleRideDiscount` | Discount for a single ride. |
| `StoredValue` | Discount for stored value (ערך צבור). |
| `DailyDiscount` | Daily free-contract discount or daily payment cap. |
| `MonthlyDiscount` | Monthly free-contract discount or monthly cap. |
| `SemesterDiscount` | Semester-contract discount. |
| `YearlyDiscount` | Yearly-contract discount. |
| `PrePaid` | `true` ⇒ valid for RavKav. |
| `PostPaid` | `true` ⇒ valid for app. |
| `FromDate` / `ToDate` | Travel date bounds. |

---

## zones_2022.kml {#zones_2022}
KML polygons for the August-2022 fare zones. The zone id is in the `<zone>`
field, and links to `FromZones` / `ToZones` in `tariff_2022.csv`. To find a
stop's zone, point-in-polygon its `stop_lat`/`stop_lon` against these polygons —
there is **no** prebuilt stop→zone table.

---

## ChargingRavKav {#chargingravkav}
RavKav top-up / service points, one CSV per company, named
`XXX-ChargingRavKav.csv`. UTF-8. Sub-fields within a field are separated by `;`.

> **Delimiter note:** the spec's English says "colon" but the Hebrew gloss is
> `פסיק` (= comma) and all examples are comma-style CSV — treat the row delimiter
> as a **comma**. Verify against an actual file before parsing.

Mandatory fields: `NameOfStationHeb`, `CityHeb`, `AddressHeb`, `Latitude`,
`Longitude`, `AcceptCash`, `AcceptCreditCard`, `Manned`, `RavKavServices`,
`AnonymousCard`. (The spec mislabels the longitude column header as a second
`Latitude` — the second coordinate field is the **longitude**.)

| Field | Type | Notes |
|---|---|---|
| `NameOfStationHeb` (req) | String | May be a shop name (e.g. `עולם הפיצוחים`). |
| `NameOfStationEng` / `NameOfStationArb` | String | Optional. |
| `AgencyHeb` / `AgencyEng` / `AgencyArb` | String | Operator or owner (may be a retailer like `סופר פארם`); Hebrew should match `agency_name` when it's a PT operator. |
| `ChargingCompanyHeb` / `Eng` / `Arb` | String | e.g. `רב קו אונליין`, `הופאון`, `בנק הדואר`. |
| `CityHeb` (req) / `CityEng` / `CityArb` | String | |
| `AddressHeb` (req) / `AddressEng` / `AddressArb` | String | e.g. `אבן גבירול 50`. |
| `PlaceHeb` / `PlaceEng` / `PlaceArb` | String | Free-text location hint (e.g. `קומה 6`). |
| `PhoneNumber` | String | One or many, `;`-separated (e.g. `039566645;0525664236`). |
| `Latitude` (req) | Decimal | WGS-84 latitude. |
| `Longitude` (req) | Decimal | WGS-84 longitude (header mislabeled `Latitude` in the spec). |
| `AcceptCash` (req) | Boolean | |
| `AcceptCreditCard` (req) | Boolean | |
| `Manned` (req) | Boolean | Person present (staffed or assisting at a machine). |
| `RavKavServices` (req) | Boolean | Can issue/restore a card. |
| `AnonymousCard` (req) | Boolean | Can sell an anonymous RavKav. |
| `Accessible` | Boolean | Wheelchair accessible; empty = unknown. |
| `SundayHours` … `SaturdayHours` | Hours list | `HH:MM-HH:MM`, multiple ranges `;`-separated (e.g. `08:00-13:00;15:00-19:00`). Friday = Friday + holiday eve. |
| `NotesHeb` / `NotesEng` / `NotesArb` | String | Free text. |

This package **replaces** the deprecated `data.gov.il/dataset/alhakav`, which is
no longer updated.
