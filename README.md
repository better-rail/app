# Better Rail Notification Server

Better Rail's notification server provides real-time updates on ride progress, keeping passengers informed every step of the way.

### Installation

To follow these steps, ensure that [Bun](https://bun.sh) is installed (the server runs TypeScript directly with Bun — no build/transpile step).

> Note: Requires Bun 1.0+, a redis server to store active rides, mongodb to store logs, and Postgres for the GTFS timetable.

- Fork the repo and clone to your machine.
- Run `bun install`
- Rename `.env.example` to `.env`, and fill it as required on [Enviroment Variables](#enviroment-variables)
- Run the app with `bun dev` (watch mode). In production, run `bun start`.
- Run the tests with `bun test`.

### File Structure

- `/data`: stations, redis, Postgres and env configurations (incl. `station-mapping.json`, `rail-stations-geo.json`)
- `/db`: Postgres pool, schema (`schema.sql`) and active-feed helpers
- `/gtfs`: GTFS feed download, parsing (rail subset) and station matching
- `/locales`: language files for notifications
- `/logs`: logger and lognames sit here
- `/requests`: timetable engine (`gtfs-route-api.ts`) and the rides route fetcher
- `/rides`: notification scheduler
- `/routes`: express router (incl. the `/rail-api` legacy surface served from GTFS, and the token-guarded `/siri` debug routes)
- `/siri`: SIRI-SM real-time pipeline — poller (standalone entrypoint `main.ts`), correlation and the redis snapshot
- `/scripts`: standalone CLIs — `download-feed`, `ingest-gtfs`, `build-station-mapping`, `verify-mapping`
- `/tests`: all the tests are here
- `/types`: all the types are here
- `/utils`: utility functions used across the server (incl. `gtfs-time.ts`)

### Timetable data: GTFS (Israel MOT)

The train timetable comes from the **Israel MOT GTFS** static feed
(`Gtfs_10_days.zip` — the current canonical export with `calendar_dates`,
`feed_info`, `levels`, `networks` and the full stops schema) loaded into
**Postgres**, not the Israel Railways API. The server exposes the legacy
`searchTrainForMobile` shape (under `/api/v1/rail-api/...`) backed by a rail
journey planner over the GTFS schedule, so every client (app + native widgets)
only needed a base-URL change. The Israel Railways API is not called at all
anymore: the announcements / popup messages / station info endpoints that used
to proxy upstream are retired and answer with an empty legacy envelope, so
shipped clients render "no data" instead of erroring.

**Slow trains:** the planner lists every direct train by default, like the legacy
API did — a slow "collector" service is shown even when a faster direct train
departs a few minutes later and arrives earlier (e.g. Ashkelon 230 07:00→07:56
next to 622 07:06→07:50). The app's "hide slow trains" toggle is sent as
`hideSlowTrains: true` in the search request body, and only then are such
dominated direct trains left out. Itineraries *with* changes are always pruned
when a same-or-fewer-changes option departs later and arrives earlier.

**Platforms:** GTFS has no train→platform link (rail `stop_times` reference
station-level stops with an empty `platform_code`). The scheduled platforms are
**learned from SIRI**: every poll cycle the poller upserts the platform it
observes per (train, station) into the feed-independent `train_platforms` table
(`siri/platform-store.ts`), and the nightly ingest bakes those values into
`stop_times.platform_code` — so the live query path stays pure DB. Coverage
accumulates as trains are observed; the previous feed's platforms are carried
forward at ingest to fill any holes.

Station numbers differ between the two systems. The canonical IDs everywhere
(app, native, Live Activity) stay the Israel-Railways `3700`-style IDs; the GTFS
`stop_id` mapping is confined to the server (`data/station-mapping.json`,
rebuilt at every ingest by matching `data/rail-stations-geo.json` on
coordinates + Hebrew name).

#### Operating the feed

`gtfs.mot.gov.il` must be reachable (it isn't from some sandboxes). Workflow:

```bash
# one-time / when stations change — build & review the committed mapping
bun run download --out ./gtfs_data
bun run verify:mapping --gtfs ./gtfs_data/gtfs   # fails if a traversed station is unmapped
bun run build:mapping --gtfs ./gtfs_data/gtfs    # writes data/station-mapping.json; commit it

# load the feed into Postgres (downloads automatically; idempotent by checksum)
bun run ingest
```

Run `bun run ingest` on a **daily Railway cron** (the feed regenerates nightly and
is valid ~10 days). Ingest loads a new feed under a fresh `feed_id` and flips the
active feed atomically, so the live API never reads a half-loaded feed. It aborts
(keeping the previous feed) if a station that trips actually traverse has no
mapping.

### Real-time data: SIRI-SM

Live delays (`trainPosition.calcDiffMinutes`) and platform changes come from the
MOT **SIRI-SM v2.8** Stop Monitoring API. Access is IP-allow-listed, so the
poller runs as its **own Railway service** (`bun run siri`) whose egress IP is
registered with MOT — local machines cannot call the API at all. The poller
requests all rail-station stop codes every ~30s, correlates each journey to a
GTFS trip (LineRef + service date + origin departure time, with a stop-code
fallback), and publishes a snapshot to redis (`siri:snapshot`). The web service
reads that snapshot inside `searchTrain` — any failure (poller down, stale
snapshot, no redis) degrades to schedule-only results.

The feed is forward-looking, so a stop's visit vanishes the moment the train
departs it (and the whole train once the run is over). The snapshot **carries
those entries forward** from the previous cycle — platform changes, statuses
and final delays keep being served after departure instead of reverting to the
schedule — marked with `seenAt`/`ended` and expiring `SIRI_CARRY_SECONDS`
(default 24h) after their last live sighting.

Remote debugging goes through token-guarded routes (404 without
`SIRI_DEBUG_TOKEN` + an `x-debug-token` header): `GET /api/v1/siri/status`
(poller health + match rates), `GET /api/v1/siri/raw` (last raw payloads — the
test-fixture source) and `GET /api/v1/siri/unmatched` (correlation misses).

### Enviroment Variables

- `TZ`: should always be "Asia/Jerusalem"
- `NODE_ENV`: `production` or `test`, used to determine notifications scheduler logic
- `PORT`: port express listens to
- `REDIS_URL`: connection string for redis
- `DATABASE_URL`: connection string for Postgres (GTFS timetable store)
- `APPLE_BUNDLE_ID`: bundle id of the iOS app to send notifications to
- `APPLE_TEAM_ID`: team id for the developer account associated with the iOS app
- `APPLE_KEY_ID`: apple notifications key id
- `APPLE_KEY_CONTENT`: apple notifications key content, replace new lines with `\n`
- `APN_ENV`: apple notifications server enviroment, can be `production` or `test`
- `FIREBASE_ADMIN_AUTH`: service account json for firebase project
- `SIRI_URL`: MOT SIRI-SM base url incl. version (e.g. `https://moran.mot.gov.il/Channels/HTTPChannel/SmQuery/2.8`)
- `SIRI_KEY`: MOT-issued SIRI access key (works only from the allow-listed egress IP)
- `SIRI_CA_PEM`: PEM chain (intermediate + root, `\n`-escaped) to trust for SIRI requests — moran.mot.gov.il serves an incomplete chain
- `SIRI_TLS_INSECURE`: `true` skips TLS verification for SIRI requests only (fallback until `SIRI_CA_PEM` is captured)
- `SIRI_DEBUG_TOKEN`: secret for the `/api/v1/siri/*` debug routes; unset = routes 404
- `SIRI_POLLER_MODE`: set to `in-process` to run the poller inside the web service instead of the standalone `bun run siri` service
- `SIRI_POLL_SECONDS` / `SIRI_PREVIEW_INTERVAL` / `SIRI_CHUNK_SIZE` / `SIRI_STALE_SECONDS` / `SIRI_CARRY_SECONDS`: optional tuning (defaults 30 / PT90M / 70 / 600 / 86400)
