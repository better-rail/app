/**
 * download.ts — fetch + extract the Israel MOT GTFS feed.
 *
 * `Gtfs_10_days.zip` is the current canonical MOT feed (10-day validity window,
 * feed_version 2.0): it ships calendar_dates/feed_info/levels/networks and the
 * full stops schema (incl. platform_code). The older `israel-public-transportation.zip`
 * is a reduced/legacy export and should NOT be used.
 */
import fs from "fs"
import unzipper from "unzipper"

export const GTFS_MAIN_URL = "https://gtfs.mot.gov.il/gtfsfiles/Gtfs_10_days.zip"

export async function downloadFeed(zipPath: string, url: string = GTFS_MAIN_URL): Promise<void> {
  // Use fetch (not Node's https.get) so 3xx redirects are followed automatically —
  // gov/CDN portals often issue them. The feed is a few tens of MB downloaded once
  // a day, so buffering it before the single write is fine.
  const res = await fetch(url, {
    headers: { "User-Agent": "better-rail-server/1.0" },
    signal: AbortSignal.timeout(120_000),
  })
  if (!res.ok) {
    throw new Error(`Download failed: HTTP ${res.status} for ${url}`)
  }
  await fs.promises.writeFile(zipPath, Buffer.from(await res.arrayBuffer()))
}

export async function extractFeed(zipPath: string, destDir: string): Promise<void> {
  fs.mkdirSync(destDir, { recursive: true })
  await fs
    .createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: destDir }))
    .promise()
}
