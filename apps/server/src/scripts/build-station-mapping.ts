/**
 * build-station-mapping.ts — produce the committed station-mapping.json baseline.
 *
 * Run in an environment that can reach gtfs.mot.gov.il (NOT this dev sandbox).
 * Download + extract the feed first (scripts/download-feed.ts or the skill's
 * download_feed.py), then:
 *
 *   npm run build:mapping -- --gtfs ./gtfs_data/israel-public-transportation
 *
 * Review the printed flagged/unmatched rows, then commit station-mapping.json.
 */
import fs from "fs"
import path from "path"

import { parseRailFeed } from "../gtfs/parse"
import { matchStations } from "../gtfs/station-match"

export type StationMappingEntry = {
  gtfsStationId: string
  stopCode: string
  platformStopIds: string[]
  distanceM: number
  nameSim: number
}
export type StationMappingFile = Record<string, StationMappingEntry>

const argDir = () => {
  const idx = process.argv.indexOf("--gtfs")
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1]
  return path.join(process.cwd(), "gtfs_data", "israel-public-transportation")
}

const MAPPING_PATH = path.join(__dirname, "..", "data", "station-mapping.json")

export const buildMapping = async (gtfsDir: string): Promise<StationMappingFile> => {
  const feed = await parseRailFeed(gtfsDir)
  const result = matchStations([...feed.stationNodes.values()])

  // Group platform stops by their station node so each entry lists its platforms.
  const platformsByNode = new Map<string, string[]>()
  for (const [platformId, nodeId] of feed.platformToStationNode) {
    const list = platformsByNode.get(nodeId) ?? []
    list.push(platformId)
    platformsByNode.set(nodeId, list)
  }

  const mapping: StationMappingFile = {}
  for (const match of result.matches) {
    if (!match.accepted) continue
    mapping[String(match.railId)] = {
      gtfsStationId: match.gtfsStationId,
      stopCode: match.stopCode,
      platformStopIds: (platformsByNode.get(match.gtfsStationId) ?? []).sort(),
      distanceM: match.distanceM,
      nameSim: match.nameSim,
    }
  }

  console.log(`Matched ${Object.keys(mapping).length}/${result.matches.length} known stations.`)

  const flagged = result.matches.filter((m) => m.flagged)
  if (flagged.length) {
    console.log(`\n⚠️  ${flagged.length} flagged (review before committing):`)
    for (const m of flagged) {
      console.log(`  ${m.railId} "${m.hebrew}" -> ${m.gtfsStationId} "${m.gtfsStopName}" (${m.distanceM}m, sim ${m.nameSim}) — ${m.flagReason}`)
    }
  }

  if (result.unmatched.length) {
    console.log(`\n❌ ${result.unmatched.length} unmatched known stations:`)
    for (const m of result.unmatched) {
      console.log(`  ${m.railId} "${m.hebrew}" — nearest ${m.gtfsStationId} "${m.gtfsStopName}" (${m.distanceM}m, sim ${m.nameSim})`)
    }
  }

  if (result.unclaimedNodes.length) {
    console.log(`\nℹ️  ${result.unclaimedNodes.length} GTFS rail station nodes not claimed (possible new stations):`)
    for (const n of result.unclaimedNodes) {
      console.log(`  ${n.stopId} "${n.stopName}" (${n.lat}, ${n.lon})`)
    }
  }

  return mapping
}

const main = async () => {
  const gtfsDir = argDir()
  if (!fs.existsSync(gtfsDir)) {
    console.error(`GTFS directory not found: ${gtfsDir}\nPass --gtfs <dir> pointing at the extracted feed.`)
    process.exit(1)
  }
  const mapping = await buildMapping(gtfsDir)
  fs.writeFileSync(MAPPING_PATH, JSON.stringify(mapping, null, 2) + "\n")
  console.log(`\nWrote ${MAPPING_PATH}`)
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
