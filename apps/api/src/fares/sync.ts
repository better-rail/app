/**
 * sync.ts — pull Israel Railways' fares into KV.
 *
 * What `bun run rail:pull` did on a Railway cron, now a Worker cron (weekly) and
 * a token-guarded route (`POST /internal/fares/pull`, for an on-demand run, and
 * `POST /internal/fares/snapshot`, to seed KV from saved payloads where the
 * rail API isn't reachable). Logs what changed against the previous snapshot,
 * so a tariff reform shows up in the Worker's logs.
 */
import { logNames, logger } from "../logs"
import { RailPricesResponse, RailProfilesResponse, diffFareSnapshots, fetchRailFares, normalizeRailFares } from "./pull"
import { invalidateFareCache, readFareSnapshot, writeFareSnapshot } from "./store"

type Payloads = { profiles: RailProfilesResponse; prices: RailPricesResponse }

/** Normalize `payloads` (or fetch them from the rail API) into the snapshot KV serves. */
export const syncFares = async (payloads?: Payloads) => {
  const previous = await readFareSnapshot()
  const { profiles, prices } = payloads ?? (await fetchRailFares())
  const snapshot = normalizeRailFares(profiles, prices, new Date().toISOString())
  const diff = diffFareSnapshots(previous, snapshot)
  await writeFareSnapshot(snapshot)
  invalidateFareCache()

  const summary = {
    pairs: Object.keys(snapshot.pairs).length,
    profiles: snapshot.profiles.length,
    railVersion: snapshot.railVersion,
    previous: previous?.pulledAt ?? null,
    ...diff,
  }
  logger.info(logNames.fares.pulled, summary)
  return summary
}

/** Validate saved GetProfiles / GetAllPriceWithNotes payloads (the seed route). */
export const parseFarePayloads = (body: unknown): Payloads => {
  const { profiles, prices } = (body ?? {}) as Record<string, unknown>
  return { profiles: RailProfilesResponse.parse(profiles), prices: RailPricesResponse.parse(prices) }
}
