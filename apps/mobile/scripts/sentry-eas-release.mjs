#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { readFileSync, readdirSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const require = createRequire(import.meta.url)

export const SENTRY_ORG = "better-rail"
export const SENTRY_PROJECT = "better-rail"
export const SENTRY_REPOSITORY = "better-rail/app"

const DEFAULT_SENTRY_URL = "https://sentry.io/"
const APP_DIR = fileURLToPath(new URL("..", import.meta.url))

export function shouldAssociateCommits(env) {
  return env.EAS_BUILD === "true" && env.EAS_BUILD_PROFILE === "production" && env.SENTRY_DISABLE_AUTO_UPLOAD !== "true"
}

export function getPlatformIdentifier(platform, expoConfig) {
  if (platform === "android") {
    return expoConfig.android?.package
  }

  if (platform === "ios") {
    return expoConfig.ios?.bundleIdentifier
  }

  return undefined
}

export function getReleaseName({ platform, appVersion, buildVersion, expoConfig, sentryRelease }) {
  if (sentryRelease) {
    return sentryRelease
  }

  const identifier = getPlatformIdentifier(platform, expoConfig)
  if (!identifier || !appVersion || !buildVersion) {
    throw new Error("Could not determine the Sentry release from the Expo app version and native build version.")
  }

  return `${identifier}@${appVersion}+${buildVersion}`
}

export function getAndroidBuildVersion(gradleFile) {
  const versionCode = gradleFile.match(/^\s*versionCode\s+(\d+)\s*$/m)?.[1]
  if (!versionCode) {
    throw new Error("Could not read versionCode from android/app/build.gradle.")
  }
  return versionCode
}

export function getIosBuildVersion(projectFile, bundleIdentifier) {
  const configurations = projectFile.matchAll(/\/\* Release \*\/ = \{[\s\S]*?buildSettings = \{([\s\S]*?)\};\s*name = Release;/g)
  for (const [, settings] of configurations) {
    const identifier = settings.match(/^\s*PRODUCT_BUNDLE_IDENTIFIER = "?([^";]+)"?;/m)?.[1]
    if (identifier === bundleIdentifier) {
      const buildNumber = settings.match(/^\s*CURRENT_PROJECT_VERSION = "?([^";]+)"?;/m)?.[1]
      if (buildNumber) return buildNumber
    }
  }
  throw new Error(`Could not read CURRENT_PROJECT_VERSION for ${bundleIdentifier} from the iOS project.`)
}

function readNativeBuildVersion(platform, identifier) {
  if (platform === "android") {
    return getAndroidBuildVersion(readFileSync(join(APP_DIR, "android/app/build.gradle"), "utf8"))
  }

  if (platform === "ios") {
    const project = readdirSync(join(APP_DIR, "ios")).find((entry) => entry.endsWith(".xcodeproj"))
    if (!project) throw new Error("Could not find an iOS Xcode project.")
    return getIosBuildVersion(readFileSync(join(APP_DIR, "ios", project, "project.pbxproj"), "utf8"), identifier)
  }

  throw new Error(`Unsupported EAS_BUILD_PLATFORM=${platform}.`)
}

export function findPreviousCommit(releases, { currentRelease, releasePrefix }) {
  return releases.find(
    (release) =>
      release.version !== currentRelease &&
      release.version.startsWith(releasePrefix) &&
      typeof release.lastCommit?.id === "string",
  )?.lastCommit.id
}

export function buildCommitSpec(previousCommit, currentCommit) {
  const commitRange = previousCommit ? `${previousCommit}..${currentCommit}` : currentCommit
  return `${SENTRY_REPOSITORY}@${commitRange}`
}

function run(command, args, { dryRun = false } = {}) {
  const rendered = [command, ...args].join(" ")
  if (dryRun) {
    console.log(`[Sentry] Dry run: ${rendered}`)
    return
  }

  const result = spawnSync(command, args, {
    env: process.env,
    stdio: "inherit",
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with status ${result.status ?? "unknown"}`)
  }
}

function readExpoConfig() {
  const expoCli = require.resolve("expo/bin/cli")
  const result = spawnSync(process.execPath, [expoCli, "config", "--json"], {
    encoding: "utf8",
    env: process.env,
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`expo config failed: ${result.stderr.trim()}`)
  }

  return JSON.parse(result.stdout)
}

function getSentryApiUrl(pathname) {
  const baseUrl = new URL(process.env.SENTRY_URL ?? DEFAULT_SENTRY_URL)
  return new URL(pathname.replace(/^\//, ""), baseUrl).toString()
}

async function fetchProjectReleases(authToken) {
  const url = getSentryApiUrl(
    `/api/0/projects/${encodeURIComponent(SENTRY_ORG)}/${encodeURIComponent(SENTRY_PROJECT)}/releases/?per_page=100`,
  )
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Could not list Sentry releases: HTTP ${response.status}`)
  }

  return response.json()
}

async function main() {
  if (!shouldAssociateCommits(process.env)) {
    console.log("[Sentry] Skipping commit association for this EAS build.")
    return
  }

  const platform = process.env.EAS_BUILD_PLATFORM
  const currentCommit = process.env.EAS_BUILD_GIT_COMMIT_HASH
  const authToken = process.env.SENTRY_AUTH_TOKEN

  if (!currentCommit) {
    throw new Error("EAS_BUILD_GIT_COMMIT_HASH is required to associate Sentry commits.")
  }

  if (!authToken) {
    throw new Error("SENTRY_AUTH_TOKEN is required to associate Sentry commits.")
  }

  const expoConfig = readExpoConfig()
  const identifier = getPlatformIdentifier(platform, expoConfig)
  if (!identifier) {
    throw new Error(`No application identifier is configured for EAS_BUILD_PLATFORM=${platform}.`)
  }
  const release = getReleaseName({
    platform,
    appVersion: expoConfig.version,
    buildVersion: process.env.SENTRY_RELEASE ? undefined : readNativeBuildVersion(platform, identifier),
    expoConfig,
    sentryRelease: process.env.SENTRY_RELEASE,
  })

  let previousCommit = process.env.SENTRY_EAS_RELEASE_PREVIOUS_COMMIT
  if (!previousCommit) {
    const releases = await fetchProjectReleases(authToken)
    previousCommit = findPreviousCommit(releases, {
      currentRelease: release,
      releasePrefix: `${identifier}@`,
    })
  }

  const sentryCli = require.resolve("@sentry/cli/bin/sentry-cli")
  const dryRun = process.env.SENTRY_EAS_RELEASE_DRY_RUN === "true"

  if (previousCommit === currentCommit) {
    console.log(`[Sentry] ${release} was built from the same commit as the previous ${platform} release.`)
  } else {
    if (!previousCommit) {
      console.log(`[Sentry] No previous ${platform} release was found; bootstrapping from ${currentCommit}.`)
    }

    run(
      process.execPath,
      [
        sentryCli,
        "releases",
        "set-commits",
        release,
        "--org",
        SENTRY_ORG,
        "--project",
        SENTRY_PROJECT,
        "--commit",
        buildCommitSpec(previousCommit, currentCommit),
        "--ignore-missing",
      ],
      { dryRun },
    )
  }

  run(process.execPath, [sentryCli, "releases", "finalize", release, "--org", SENTRY_ORG, "--project", SENTRY_PROJECT], {
    dryRun,
  })

  console.log(`[Sentry] Associated ${SENTRY_REPOSITORY} commits with ${release}.`)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[Sentry] Failed to associate EAS release commits: ${error.message}`)
    process.exitCode = 1
  })
}
