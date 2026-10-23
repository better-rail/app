/**
 * rail-pull.ts — `bun run rail:pull`: refresh the fares snapshot the Worker serves.
 *
 * The weekly cron does this by itself; this CLI is for an on-demand pull, and
 * for seeding the snapshot from saved rail API payloads when the API isn't
 * reachable from the Worker's egress (the rail API is geo-fenced):
 *
 *   INGEST_TOKEN=… bun run rail:pull --target https://api.better-rail.co.il
 *   INGEST_TOKEN=… bun run rail:pull --target … --profiles ./GetProfiles.json --prices ./GetAllPriceWithNotes.json
 *
 * Either way the Worker logs what changed against the previous snapshot.
 */
import fs from "fs"

const argFile = (flag: string): string | null => {
  const idx = process.argv.indexOf(flag)
  return idx !== -1 && process.argv[idx + 1] ? process.argv[idx + 1] : null
}

const main = async () => {
  const target = (argFile("--target") ?? process.env.API_BASE_URL ?? "").replace(/\/$/, "")
  const token = process.env.INGEST_TOKEN
  if (!target) throw new Error("Pass --target <worker base url> or set API_BASE_URL")
  if (!token) throw new Error("Set INGEST_TOKEN (the Worker's operator token)")

  const profilesFile = argFile("--profiles")
  const pricesFile = argFile("--prices")
  if ((profilesFile === null) !== (pricesFile === null)) throw new Error("--profiles and --prices go together")

  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" }
  const response = profilesFile
    ? await fetch(`${target}/api/v1/internal/fares/snapshot`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          profiles: JSON.parse(fs.readFileSync(profilesFile, "utf8")),
          prices: JSON.parse(fs.readFileSync(pricesFile!, "utf8")),
        }),
      })
    : await fetch(`${target}/api/v1/internal/fares/pull`, { method: "POST", headers })

  const body = await response.text()
  if (!response.ok) throw new Error(`Worker answered ${response.status}: ${body.slice(0, 500)}`)
  console.log(`[rail:pull] ${body}`)
}

main().catch((error) => {
  console.error("[rail:pull] FAILED:", error)
  process.exit(1)
})
