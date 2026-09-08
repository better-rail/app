/**
 * rail-pull.ts — `bun run rail:pull`: snapshot Israel Railways' fares into redis.
 *
 * Fetches GetProfiles + GetAllPriceWithNotes from the rail API (RAIL_URL /
 * RAIL_API_KEY, and PROXY_URL when the egress IP isn't in Israel), validates
 * and normalizes them (fares/pull.ts) and stores the result under
 * `fares:snapshot`, which the /fares routes serve. Run it on a Railway cron
 * (weekly is plenty — the tariff moves about once a year) or by hand; it logs
 * what changed against the previous snapshot, so a reform shows in the output.
 *
 *   bun run rail:pull
 *   bun run rail:pull -- --profiles ./GetProfiles.json --prices ./GetAllPriceWithNotes.json
 *
 * The file form loads saved payloads instead of calling the API — handy for
 * seeding a local redis, since the API is geo-fenced.
 */
import fs from "fs"

import { connectToRedis, getRedisClient } from "../data/redis"
import { RailPricesResponse, RailProfilesResponse, diffFareSnapshots, fetchRailFares, normalizeRailFares } from "../fares/pull"
import { readFareSnapshot, writeFareSnapshot } from "../fares/store"
import { logNames, logger, startLogger } from "../logs"

const argFile = (flag: string): string | null => {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : null
}

const loadPayloads = async () => {
  const profilesFile = argFile("--profiles")
  const pricesFile = argFile("--prices")
  if (!profilesFile && !pricesFile) return fetchRailFares()
  if (!profilesFile || !pricesFile) throw new Error("--profiles and --prices go together")
  return {
    profiles: RailProfilesResponse.parse(JSON.parse(fs.readFileSync(profilesFile, "utf8"))),
    prices: RailPricesResponse.parse(JSON.parse(fs.readFileSync(pricesFile, "utf8"))),
  }
}

const main = async () => {
  startLogger()
  await connectToRedis()

  const previous = await readFareSnapshot()
  const { profiles, prices } = await loadPayloads()
  const snapshot = normalizeRailFares(profiles, prices, new Date().toISOString())
  const diff = diffFareSnapshots(previous, snapshot)
  await writeFareSnapshot(snapshot)

  logger.info(logNames.fares.pulled, {
    pairs: Object.keys(snapshot.pairs).length,
    profiles: snapshot.profiles.length,
    railVersion: snapshot.railVersion,
    previous: previous?.pulledAt ?? null,
    ...diff,
  })
}

main()
  .then(() => getRedisClient()?.quit())
  .then(() => process.exit(0))
  .catch(async (error) => {
    logger?.error(logNames.fares.pullFailed, { error })
    console.error("[rail:pull] FAILED:", error)
    await getRedisClient()
      ?.quit()
      .catch(() => undefined)
    process.exit(1)
  })
