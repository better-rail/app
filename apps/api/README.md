# Better Rail API

The Better Rail backend as one Cloudflare Worker: the timetable (`/api/v1/rail-api/*`), live ride tracking
(`/api/v1/ride/*`), fares (`/api/v1/fares`) and the MOT SIRI realtime pipeline. It replaces the Bun/Express server that
ran on Railway together with its SIRI poller service, two cron jobs, Postgres and redis. Every path, status code and
payload is unchanged: the mobile app, the iOS/watch widgets, the Android widget and the web app only ever needed the base
URL, `https://api.better-rail.co.il/api/v1`.

Built with [Elysia](https://elysiajs.com) (Cloudflare adapter), D1, KV, Durable Objects and a Container, deployed with
Wrangler. TypeScript runs directly; there is no build step.

## What runs where

| Before (Railway)                                       | Now (Cloudflare)                                                                                |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Express web service                                    | The Worker (`src/app.ts`, Elysia)                                                               |
| Postgres (GTFS timetable, learned platforms)           | D1 (`src/db/schema.sql`, same tables)                                                           |
| redis `rides:*` + in-process node-schedule jobs        | One Durable Object per ride (`src/rides/ride-do.ts`), its minute cadence an alarm               |
| `bun run siri` poller service                          | A singleton Durable Object (`src/siri/poller-do.ts`) polling on an alarm every 30 s             |
| redis `siri:*` snapshot                                | The poller object's storage, read over RPC with the same 5 s per-isolate cache                  |
| redis `fares:snapshot`                                 | KV                                                                                              |
| Railway cron `bun run ingest`                          | Cron trigger → a one-shot Container (`ingest/`) posts the parsed feed to `/internal/ingest`     |
| Railway cron `bun run rail:pull`                       | Cron trigger → `src/fares/sync.ts`                                                              |
| `apns2` / `firebase-admin`                             | `src/push/apns.ts` and `src/push/fcm.ts` (fetch + WebCrypto JWTs)                               |
| `@sentry/bun` + winston                                | `@sentry/cloudflare` + console (Workers Logs)                                                   |
| The poller's registered egress IP, `PROXY_URL`, TLS CA | [`apps/egress-proxy`](../egress-proxy/README.md): a fixed-IP relay for the two fenced upstreams |

The one thing that cannot live on Cloudflare is the egress IP: MOT allow-lists a single address for SIRI and the
Israel Railways API is geo-fenced. The egress proxy is a ~100-line Bun relay that runs on any fixed-IP host (the old
Railway service's IP is already registered); the Worker sends only the requests for those two hosts through it. Leave
`EGRESS_PROXY_URL` unset and the Worker calls them directly.

### Routes

- `GET /isAlive`
- `POST /api/v1/rail-api/rjpa/api/v1/timetable/searchTrainForMobile` and the legacy `GET …/searchTrainLuzForDateTime`
  — the GTFS journey planner (`src/requests/gtfs-route-api.ts`, ported unchanged), `{ result: { travels } }`.
  Every other `/rail-api/*` path answers the empty legacy envelope (`RAIL_DATA_SOURCE=rail` proxies them upstream instead).
- `POST|DELETE /api/v1/ride`, `PATCH /api/v1/ride/updateToken`, `PUT|DELETE /api/v1/ride/alarm` — ride tracking.
- `GET /api/v1/fares?from=&to=`, `GET /api/v1/fares/profiles`.
- `GET /api/v1/siri/{status,raw,unmatched}` — `x-debug-token: $SIRI_DEBUG_TOKEN` (404 otherwise).
- `/api/v1/internal/*` — `Authorization: Bearer $INGEST_TOKEN` (404 otherwise): `GET ingest/active`, `POST ingest`
  (the container's upload), `POST ingest/run` (start the container now), `POST fares/pull`, `POST fares/snapshot`.

## Development

```bash
bun install                          # from the repo root
cp apps/api/.dev.vars.example apps/api/.dev.vars
bun run api:dev                      # wrangler dev on http://localhost:8787 (local D1/KV/Durable Objects)
bun run api:test                     # bun test (unit) + vitest (inside workerd, test/workers)
bun run api:compile                  # tsc for the Worker and for the Bun entrypoints
```

Point the app at it with `env = "local"` in `apps/mobile/src/config/api-config.ts`. A local D1 is empty: load a feed
with `bun run ingest --gtfs <extracted feed dir> --target http://localhost:8787` (set `INGEST_TOKEN` in `.dev.vars` and
the shell), or `bun run ingest --out feed.json` to only build the payload. Ride tracking is off in `.dev.vars.example`
(`RIDES_ENABLED=false`); switch it on only to test against your own device, since pushes really go out.

Layout:

```
src/
  app.ts, index.ts, scheduled.ts   Elysia app, Worker entry (+ Durable Object exports), cron handler
  routes/                          rail-api (planner + legacy envelope + rail proxy mode), rides, fares, siri-debug, internal
  requests/                        gtfs-route-api (the planner), route-api (ride routes), rail-api, rail-via
  rides/                           ride-do (Durable Object), tracker (the schedule logic), notify
  siri/                            poller-do (Durable Object), client, correlate, snapshot, platform-store
  ingest/                          Worker half of the ingest: payload contract, D1 loader, the container's Durable Object
  push/                            APNs + FCM clients
  db/                              D1 helpers + schema.sql
  fares/, locales/, data/, utils/  as before
ingest/                            Bun half of the ingest (download, parse, station match) + Dockerfile
scripts/                           build-station-mapping, verify-mapping, download-feed, rail-pull
test/unit/                         bun test; test/workers/: vitest inside workerd (D1, KV, Durable Objects, SELF)
```

## Deploying

One-time, from `apps/api` with `wrangler login` done:

1. `bunx wrangler d1 create better-rail` → put the id in `wrangler.jsonc`, then
   `bunx wrangler d1 execute better-rail --remote --file=./src/db/schema.sql`.
2. `bunx wrangler kv namespace create KV` → put the id in `wrangler.jsonc`.
3. Variables: set `API_BASE_URL` in the dashboard (Settings → Variables) to the Worker's own public URL — its
   `workers.dev` URL while staging, `https://api.better-rail.co.il` after cutover; the ingest container posts the feed
   back to it. Secrets (`bunx wrangler secret put <NAME>`): `APPLE_BUNDLE_ID`, `APPLE_TEAM_ID`, `APPLE_KEY_ID`, `APPLE_KEY_CONTENT`,
   `APN_ENV`, `FIREBASE_ADMIN_AUTH`, `SIRI_URL`, `SIRI_KEY`, `SIRI_DEBUG_TOKEN`, `RAIL_URL`, `RAIL_API_KEY`,
   `EGRESS_PROXY_URL`, `EGRESS_PROXY_TOKEN`, `INGEST_TOKEN` (`openssl rand -hex 32`), `SENTRY_DSN`. The values are the
   Railway variables of the same names; `PROXY_URL`, `SIRI_CA_PEM` and the `*_TLS_INSECURE` flags move to the egress proxy.
4. Deploy the egress proxy (its README) and set `EGRESS_PROXY_URL`/`EGRESS_PROXY_TOKEN` accordingly.
5. `bunx wrangler deploy` — needs Docker for the ingest container image (Workers Builds has it), or
   `--containers-rollout=none` to deploy the Worker alone first. Containers and Durable Objects need the Workers Paid plan.
6. Route `api.better-rail.co.il` to the Worker (Workers → Settings → Domains & Routes), or add
   `"routes": [{ "pattern": "api.better-rail.co.il", "custom_domain": true }]` to `wrangler.jsonc`.
7. Load data: `POST /api/v1/internal/ingest/run` with the token (or wait for the 02:30 UTC cron), and
   `bun run rail:pull --target https://api.better-rail.co.il` (or `POST /api/v1/internal/fares/pull`).

Workers Builds, like the web app: root directory `apps/api`, build command `bun install`, deploy command
`bunx wrangler deploy`, non-production branches `bunx wrangler versions upload`, watch path `apps/api/*`.

### Cutover

The Worker can run next to the Railway deployment: give it its own D1/KV/secrets, load a feed, and smoke-test it on its
`workers.dev` URL with the app in a non-production `env`. Then move the DNS record for `api.better-rail.co.il` to the
Worker. Rides in flight on Railway finish there (their redis state is not migrated; a ride started after the switch is a
Durable Object), so switch at a quiet hour. Keep the egress proxy on the host whose IP MOT registered.

### Operating

- **Ingest**: nightly cron starts the container; it logs `[ingest] …` lines and the Worker logs the load. Re-run with
  `POST /internal/ingest/run`. A feed with an unmapped traversed station is refused and the previous feed stays active
  (same rule as before: add the station to `src/data/rail-stations-geo.json`, rebuild the mapping with
  `bun run build:mapping`).
- **SIRI**: the poller arms itself the first time the minute cron fires after a deploy; `GET /siri/status` shows the
  cycle state and match rates. `SIRI_POLL_SECONDS` and friends are read at every cycle, so a variable change needs no
  redeploy.
- **Fares**: weekly cron, Monday 03:00 UTC; `POST /internal/fares/pull` for an immediate refresh.
- **Logs and errors**: Workers Logs (observability is on) and Sentry (`SENTRY_DSN`); push tokens are scrubbed as before.

## Behaviour notes

- Times: the Bun server relied on `TZ=Asia/Jerusalem`; Workers run in UTC, so the ride tracker converts the timetable's
  naive wall-clock strings explicitly (`src/utils/israel-time.ts`). Everything the clients receive is byte-identical.
- The rate limiter keeps its counters per isolate rather than per process (`src/utils/rate-limiter.ts`); the limits are
  generous enough that this is the same protection in practice.
- Elysia runs in dynamic mode (`aot: false`): Workers forbid `new Function`, which its ahead-of-time route compiler uses.
- Rides survive deploys and evictions through Durable Object storage, so the boot-time "reschedule every ride" pass and
  the local-run guard around it are gone.
- `apns-expiration` is not sent, as before (Apple's default retention applies).

## Pricing

Everything runs inside the Workers Paid plan ($5/month, already needed for the web Worker, and required for Durable
Objects and Containers). Measured against the Railway project this replaces (about $20/month estimated: $11 of it
network egress from the API's responses, $5 memory for the always-on services, the rest CPU and volumes):

| Railway line today                         | On Cloudflare                                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| Network egress, ~$11 (API responses)       | $0 — Workers do not meter response bandwidth                                                         |
| Memory, ~$5 (web, SIRI, Conductor, redis…) | $0 — no always-on process; Durable Objects bill active time only, well inside the included 400k GB-s |
| CPU, <$1                                   | Included (30M CPU-ms/month; the planner caches its plans per isolate)                                |
| Volumes (Postgres, redis), <$1             | D1 and Durable Object storage, inside the 5 GB included                                              |
| Daily ingest job                           | Container, ~5 min/day on `standard-1`: inside the included 25 GiB-h / 375 vCPU-min                   |
| —                                          | Durable Object requests over the included 1M (ride ticks, SIRI cycles, snapshot reads): ~$0.75       |
| —                                          | Egress proxy host: a Railway hobby service (~$5) or a small VPS                                      |

So roughly **$5–7/month on Cloudflare** (or $1–2 incremental if the account is already on Workers Paid for the web
app) plus the proxy host, against about $20 today. The proxy relays the SIRI stop-monitoring bodies to the Worker
every 30 s, which would be metered egress on Railway; it gzips them (about tenfold smaller), so expect a few GB a
month there, or put it on a VPS with bandwidth included. Growth costs about $0.30 per extra million requests, $0.02
per extra million CPU-ms and $0.15 per extra million Durable Object requests (Cloudflare's published rates, October
2026). Sentry is unchanged.
