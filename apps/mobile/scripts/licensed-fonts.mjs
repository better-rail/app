#!/usr/bin/env node

// EAS Build hook (eas-build-post-install): puts the licensed fonts in place before Metro bundles.
// They're gitignored, so builds started from CI or a fresh checkout upload without them.
// The fonts come from the LICENSED_FONTS_ZIP file variable, a secret in the production and preview environments:
//   eas env:set --name LICENSED_FONTS_ZIP --type file --visibility secret --value ./licensed-fonts.zip --environment production --environment preview

import { spawnSync } from "node:child_process"
import { mkdirSync } from "node:fs"
import { fileURLToPath } from "node:url"

const LICENSED_FONTS_DIR = fileURLToPath(new URL("../assets/fonts/licensed", import.meta.url))
const zip = process.env.LICENSED_FONTS_ZIP

if (!zip) {
  console.log("LICENSED_FONTS_ZIP is not set; keeping the licensed fonts already in the archive, if any")
  process.exit(0)
}

mkdirSync(LICENSED_FONTS_DIR, { recursive: true })
// -j drops the zip's folder structure, so it doesn't matter how the archive was made; -x skips Finder's resource forks
const { status } = spawnSync("unzip", ["-o", "-j", zip, "-x", "*__MACOSX/*", "._*", "*/._*", "-d", LICENSED_FONTS_DIR], {
  stdio: "inherit",
})
process.exit(status ?? 1)
