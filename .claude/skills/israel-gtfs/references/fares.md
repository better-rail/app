# Israel GTFS — Fare Calculation

Pricing an Israeli trip is the most error-prone part of the feed because the
"obvious" path (read `stops.zone_id`, look up `fare_rules`) does **not** work:
`stops.zone_id` is always `0`. Real pricing is geographic and lives in the
`tariff_2022` + `zones_2022` packages. This file describes both the reform-based
path (authoritative, covers single/daily/monthly) and how the GTFS
`fare_rules`/`fare_attributes` relate to it.

## Background: the August-2022 reform

Fares are **distance-based** and **uniform across operators** (the price between
two points no longer depends on which bus company you ride; rail is excluded from
this uniform structure). GTFS, however, requires a separate `fare_id` per agency
when multiple operators exist, so the standard fare files duplicate every rule
once per operator. That duplication is a GTFS-compatibility artifact, not real
fare variation.

## Step 0: Resolve stops to zones (the part everyone misses)

There is **no stop→zone lookup table**. Compute it yourself:

1. Load the polygons from `zones_2022.kml`. Each placemark's `<zone>` field is the
   zone id used by the tariff file's `FromZones`/`ToZones`.
2. For the origin and destination stops, take `stop_lat`/`stop_lon` from `stops`
   and run point-in-polygon to find each one's zone id.

A robust implementation: parse the KML, build shapely polygons keyed by zone id,
and query with a `shapely.geometry.Point(lon, lat)`. Cache the result — zones
rarely change.

## Step 1: Find the base fare from tariff_2022.csv

Run this **separately** for each product you care about (single ride, daily pass,
monthly pass — they're distinct rows). For the requested trip and travel date,
keep only rows where **all** of these hold, then take the **lowest `Price`**:

- **Mode** — `Transportion` matches the trip's mode (`Bus`, `Train`,
  `LightRail`, `Carmelit`, `Racbalit`).
- **Distance** — the trip's max travel distance (km) is **below** `OutterRing`.
- **Payment** — the intended method is allowed: `PrePaid = true` for RavKav, or
  `PostPaid = true` for app payment.
- **Date** — `FromDate < travel_date < ToDate`.
- **Zones** — the origin zone (from Step 0) is in the `;`-separated `FromZones`,
  **and** the destination zone is in `ToZones`.

The surviving row with the minimum `Price` is the base fare. `ColorCode`/
`ColorName` give the distance-band styling if you're rendering a fare map.

## Step 2: Apply the rider's profile discount

From `profiles_2022.csv`, select the row for the rider's profile where the
payment (`PrePaid`/`PostPaid`) and date (`FromDate`/`ToDate`) conditions also
hold, then apply the discount field matching the product:

- single ride → `SingleRideDiscount`
- stored value → `StoredValue`
- daily → `DailyDiscount` (a discount **or** a daily payment cap)
- monthly → `MonthlyDiscount` (discount or monthly cap)
- semester / yearly → `SemesterDiscount` / `YearlyDiscount`

Discounts are **percentages**. `100` means the trip is free. A blank/black cell
means no discount (price unchanged). `FreeCertificate` indicates the profile is
eligible for a free-travel certificate.

Final price = base `Price` × (1 − discount/100), respecting any cap semantics for
daily/monthly contracts.

## Relationship to fare_rules / fare_attributes

The GTFS `fare_rules` + `fare_attributes` files express only the **base
single-ride** fare, and they still rely on the same geographic zones:

- If a route has one flat fare: the `fare_rules` row has a `route_id` and empty
  `origin_id`/`destination_id`. Join `fare_id` → `fare_attributes` for the price.
- Otherwise: `route_id` is empty and the row is keyed by
  `(origin_id, destination_id)` zone codes. Those zone codes correspond to the
  same zones as `zones_2022.kml` — `stops.zone_id` can't supply them (it's `0`),
  so you still resolve zones geographically (Step 0).
- Every `(origin_id, destination_id)` pair repeats once per operator because each
  agency needs its own `fare_id` (`fare_id = [agency_id][3-digit MOT fare code]`).
  The prices are equal across those duplicates by design.

Use the reform path (tariff_2022 + profiles_2022) when you need daily/monthly
products or profile discounts; use `fare_rules`/`fare_attributes` for a quick
base single-ride fare. Either way, geographic zone matching from `zones_2022.kml`
is unavoidable.

## Israel Railways

Rail is **excluded** from the uniform distance-based structure above. Don't price
rail trips with `tariff_2022.csv` rows whose `Transportion` isn't `Train`; rail
fares follow their own logic and are not fully specified by this feed.
