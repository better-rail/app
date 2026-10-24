/**
 * build-payload.ts — turn a parsed rail feed + station match into the
 * RailFeedPayload the Worker loads (src/ingest/payload.ts).
 *
 * Kept apart from main.ts so the parse → match → payload path is testable
 * without the network or a Worker: main.ts only adds download, the active-feed
 * check and the POST around it. The checks that decide whether a feed may be
 * loaded at all live here too (an unmapped traversed station aborts before any
 * byte is sent; a known station absent from the feed is just a warning).
 */
import type { RailFeed } from "./parse"
import type { MatchResult } from "./station-match"
import type { RailFeedPayload } from "../src/ingest/payload"

/** Thrown when a station a trip actually calls at has no rail id — the previous feed must be kept. */
export class StationMappingError extends Error {
  constructor(unclaimed: MatchResult["unclaimedNodes"]) {
    super(
      `Station mapping incomplete; keeping previous feed. Unmapped traversed stations: ${JSON.stringify(
        unclaimed.map((n) => `${n.stopId} ${n.stopName}`),
      )} — add them to rail-stations-geo.json + both stations.ts.`,
    )
    this.name = "StationMappingError"
  }
}

export const buildPayload = (feed: RailFeed, match: MatchResult, checksum: string): RailFeedPayload => {
  // Abort before any write if a station actually traversed by a trip has no
  // mapping — it would break stopStations/routeStations in the emulated response.
  // (A *known* station that's simply absent from this feed is fine: it just has
  // no service, so unmatched known stations are a warning, not a failure.)
  if (match.unclaimedNodes.length) throw new StationMappingError(match.unclaimedNodes)

  const warnings: string[] = []
  if (match.unmatched.length) {
    warnings.push(
      `${match.unmatched.length} known station(s) absent from this feed (no service): ${match.unmatched.map((m) => m.railId).join(", ")}`,
    )
  }

  // Stops to load: every called platform stop plus its station node.
  const stopIdsToLoad = new Set<string>([...feed.platformToStationNode.keys(), ...feed.stationNodes.keys()])
  const stops = [...stopIdsToLoad].map((id) => feed.stops.get(id)).filter((s): s is NonNullable<typeof s> => Boolean(s))

  return {
    checksum,
    feedInfo: feed.feedInfo,
    stops: stops.map((s) => ({
      stopId: s.stopId,
      stopCode: s.stopCode,
      stopName: s.stopName,
      lat: s.lat,
      lon: s.lon,
      locationType: s.locationType,
      parentStation: s.parentStation,
      platformCode: s.platformCode,
    })),
    stationMap: match.matches
      .filter((m) => m.accepted)
      .map((m) => ({ gtfsStationId: m.gtfsStationId, railId: m.railId, stopCode: m.stopCode })),
    routes: [...feed.routes.values()].map((r) => ({ routeId: r.routeId, routeLongName: r.routeLongName })),
    trips: [...feed.trips.values()].map((t) => ({
      tripId: t.tripId,
      routeId: t.routeId,
      serviceId: t.serviceId,
      trainNumber: t.trainNumber,
    })),
    calendarDates: feed.calendarDates.map((c) => ({ serviceId: c.serviceId, serviceDate: c.serviceDate })),
    stopTimes: feed.stopTimes.map((st) => {
      const nodeId = feed.platformToStationNode.get(st.stopId)
      const railId = nodeId ? (match.gtfsStationToRailId.get(nodeId) ?? null) : null
      return {
        tripId: st.tripId,
        stopSequence: st.stopSequence,
        stopId: st.stopId,
        arrOffsetSec: st.arrOffsetSec,
        depOffsetSec: st.depOffsetSec,
        railId,
        gtfsPlatformCode: feed.stops.get(st.stopId)?.platformCode ?? null,
      }
    }),
    warnings,
  }
}
