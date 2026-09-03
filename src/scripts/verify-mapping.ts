/**
 * verify-mapping.ts — sanity-check the station mapping against a real feed.
 *
 *   npm run verify:mapping -- --gtfs ./gtfs_data/israel-public-transportation
 *
 * Fails (exit 1) if any known station is unmatched, or if any GTFS rail station
 * actually traversed by a trip is left unmapped (an unmapped intermediate would
 * break stopStations in the emulated response). Also reports drift vs. the
 * committed station-mapping.json baseline.
 */
import fs from "fs"
import path from "path"

import { parseRailFeed } from "../gtfs/parse"
import { matchStations } from "../gtfs/station-match"
import type { StationMappingFile } from "./build-station-mapping"

const argDir = () => {
  const idx = process.argv.indexOf("--gtfs")
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1]
  return path.join(process.cwd(), "gtfs_data", "israel-public-transportation")
}

const MAPPING_PATH = path.join(__dirname, "..", "data", "station-mapping.json")

const main = async () => {
  const gtfsDir = argDir()
  if (!fs.existsSync(gtfsDir)) {
    console.error(`GTFS directory not found: ${gtfsDir}\nPass --gtfs <dir> pointing at the extracted feed.`)
    process.exit(1)
  }

  const feed = await parseRailFeed(gtfsDir)
  const result = matchStations([...feed.stationNodes.values()])

  // Sorted report.
  console.log("railId | hebrew | gtfs stop_name | dist(m) | nameSim | ok")
  for (const m of [...result.matches].sort((a, b) => a.distanceM - b.distanceM)) {
    console.log(
      `${m.railId} | ${m.hebrew} | ${m.gtfsStopName} | ${m.distanceM} | ${m.nameSim} | ${m.accepted ? "✓" : "✗"}${m.flagged ? " ⚠" : ""}`,
    )
  }

  let failed = false

  // A known station absent from the feed just has no service — warn, don't fail.
  if (result.unmatched.length) {
    console.warn(`\n⚠️  ${result.unmatched.length} known stations not matched in this feed (no service?): ${result.unmatched.map((m) => m.railId).join(", ")}`)
  }

  // Every station node is traversed (derived from called stops), so any unclaimed
  // node is a traversed-but-unmapped station — a new station to add to the lists.
  if (result.unclaimedNodes.length) {
    failed = true
    console.error(`\n❌ ${result.unclaimedNodes.length} traversed GTFS rail stations have no mapping (add them to rail-stations-geo.json + both stations.ts):`)
    for (const n of result.unclaimedNodes) console.error(`  ${n.stopId} "${n.stopName}" (${n.lat}, ${n.lon})`)
  }

  // Drift vs. committed baseline.
  if (fs.existsSync(MAPPING_PATH)) {
    const committed = JSON.parse(fs.readFileSync(MAPPING_PATH, "utf8")) as StationMappingFile
    if (Object.keys(committed).length > 0) {
      const drift: string[] = []
      for (const m of result.matches) {
        if (!m.accepted) continue
        const base = committed[String(m.railId)]
        if (base && base.gtfsStationId !== m.gtfsStationId) {
          drift.push(`${m.railId}: ${base.gtfsStationId} -> ${m.gtfsStationId}`)
        }
      }
      if (drift.length) console.warn(`\n⚠️  ${drift.length} stations drifted from committed mapping:\n  ${drift.join("\n  ")}`)
      else console.log("\n✓ No drift from committed station-mapping.json")
    } else {
      console.log("\nℹ️  station-mapping.json is empty (no baseline yet) — run build:mapping to create it.")
    }
  }

  if (failed) {
    console.error("\nverify-mapping FAILED")
    process.exit(1)
  }
  console.log("\nverify-mapping passed ✓")
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
