-- Postgres schema for the rail subset of the Israel MOT GTFS feed.
-- Applied idempotently at ingest-worker start. See server/src/db/index.ts.
--
-- Atomicity model: every row carries a feed_id. A new feed is loaded under a
-- fresh feed_id while the previous one keeps serving reads; a single-row UPDATE
-- on feeds.is_active flips the active feed atomically (see ingest-gtfs.ts).
-- All indexes are feed_id-prefixed so the two-feed overlap during a load never
-- confuses the query planner.

CREATE TABLE IF NOT EXISTS feeds (
  feed_id         BIGSERIAL PRIMARY KEY,
  checksum        TEXT        NOT NULL,        -- sha256 of the source zip (idempotency)
  feed_start_date DATE,                        -- feed_info.feed_start_date
  feed_end_date   DATE,                        -- feed_info.feed_end_date (validity window)
  feed_version    TEXT,
  loaded_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_active       BOOLEAN     NOT NULL DEFAULT false
);

-- At most one active feed at a time.
CREATE UNIQUE INDEX IF NOT EXISTS feeds_one_active ON feeds (is_active) WHERE is_active;

-- Station identity nodes: location_type=1 parents and standalone rail stops,
-- plus the platform-level child stops the trains actually call at.
CREATE TABLE IF NOT EXISTS stops (
  feed_id        BIGINT NOT NULL,
  stop_id        TEXT   NOT NULL,              -- GTFS MOT stop number
  stop_code      TEXT,                         -- number on the physical stop (used later by SIRI)
  stop_name      TEXT   NOT NULL,
  stop_lat       DOUBLE PRECISION,
  stop_lon       DOUBLE PRECISION,
  location_type  SMALLINT,                     -- 1 = central station, 0 = stop/platform
  parent_station TEXT,                         -- GTFS parent stop_id (nullable)
  platform_code  TEXT,
  PRIMARY KEY (feed_id, stop_id)
);
CREATE INDEX IF NOT EXISTS stops_parent_idx ON stops (feed_id, parent_station);

-- GTFS station node -> 3700-style Israel Railways id emitted to clients.
CREATE TABLE IF NOT EXISTS station_map (
  feed_id         BIGINT  NOT NULL,
  gtfs_station_id TEXT    NOT NULL,            -- parent/standalone stop_id
  rail_id         INTEGER NOT NULL,            -- 3700-style id
  stop_code       TEXT,                        -- kept for future SIRI MonitoringRef joins
  PRIMARY KEY (feed_id, gtfs_station_id)
);
CREATE INDEX IF NOT EXISTS station_map_rail_idx ON station_map (feed_id, rail_id);

CREATE TABLE IF NOT EXISTS routes (
  feed_id         BIGINT NOT NULL,
  route_id        TEXT   NOT NULL,
  route_long_name TEXT,                        -- "origin city - destination city"
  PRIMARY KEY (feed_id, route_id)
);

CREATE TABLE IF NOT EXISTS trips (
  feed_id      BIGINT  NOT NULL,
  trip_id      TEXT    NOT NULL,
  route_id     TEXT    NOT NULL,
  service_id   TEXT    NOT NULL,
  train_number INTEGER NOT NULL,               -- trips.trip_headsign (rail special-case)
  PRIMARY KEY (feed_id, trip_id)
);
CREATE INDEX IF NOT EXISTS trips_service_idx ON trips (feed_id, service_id);

-- No calendar.txt in this feed; service is explicit (exception_type always 1).
CREATE TABLE IF NOT EXISTS calendar_dates (
  feed_id      BIGINT NOT NULL,
  service_id   TEXT   NOT NULL,
  service_date DATE   NOT NULL,
  PRIMARY KEY (feed_id, service_id, service_date)
);
CREATE INDEX IF NOT EXISTS caldates_date_idx ON calendar_dates (feed_id, service_date);

-- Times stored as integer seconds from service-day midnight so the 28-hour
-- "25:30:00" form round-trips (Postgres TIME can't hold hours >= 24). rail_id
-- and platform_code are denormalized so the journey hot path needs no joins.
CREATE TABLE IF NOT EXISTS stop_times (
  feed_id        BIGINT  NOT NULL,
  trip_id        TEXT    NOT NULL,
  stop_sequence  INTEGER NOT NULL,
  stop_id        TEXT    NOT NULL,             -- platform-level child stop_id
  arr_offset_sec INTEGER NOT NULL,
  dep_offset_sec INTEGER NOT NULL,
  platform_code  TEXT,
  rail_id        INTEGER,                       -- 3700-style id (NULL if station unmapped)
  PRIMARY KEY (feed_id, trip_id, stop_sequence)
);
CREATE INDEX IF NOT EXISTS st_station_idx ON stop_times (feed_id, rail_id, dep_offset_sec);

-- Scheduled platforms learned from the SIRI realtime feed: the poller upserts
-- the platform it observes per (train, station); the GTFS ingest bakes them into
-- stop_times.platform_code (see siri/platform-store.ts). NOT feed-scoped — train
-- numbers and rail ids are stable across feeds — so it survives feed swaps and
-- is never pruned.
CREATE TABLE IF NOT EXISTS train_platforms (
  train_number INTEGER NOT NULL,
  rail_id      INTEGER NOT NULL,               -- 3700-style id
  platform     INTEGER NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (train_number, rail_id)
);
