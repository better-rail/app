#!/usr/bin/env node

import { spawnSync } from "node:child_process"
import { createRequire } from "node:module"
import { pathToFileURL } from "node:url"

const require = createRequire(import.meta.url)

export const SENTRY_ORG = "better-rail"
export const SENTRY_PROJECT = "better-rail"
export const SENTRY_REPOSITORY = "better-rail/app"

const DEFAULT_SENTRY_URL = "https://sentry.io/"

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
    throw new Error(
      "Could not determine the Sentry release. EAS_BUILD_PLATFORM, EAS_BUILD_APP_VERSION, " +
        "EAS_BUILD_APP_BUILD_VERSION, and the platform application identifier are required.",
    )
  }

  return `${identifier}@${appVersion}+${buildVersion}`
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
  return `${SENTRY_REPOSITORY}@${previousCommit}..${currentCommit}`
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

  if (!authToken && process.env.SENTRY_EAS_RELEASE_DRY_RUN !== "true") {
    throw new Error("SENTRY_AUTH_TOKEN is required to associate Sentry commits.")
  }

  const expoConfig = readExpoConfig()
  const identifier = getPlatformIdentifier(platform, expoConfig)
  const release = getReleaseName({
    platform,
    appVersion: process.env.EAS_BUILD_APP_VERSION,
    buildVersion: process.env.EAS_BUILD_APP_BUILD_VERSION,
    expoConfig,
    sentryRelease: process.env.SENTRY_RELEASE,
  })

  if (!identifier) {
    throw new Error(`No application identifier is configured for EAS_BUILD_PLATFORM=${platform}.`)
  }

  let previousCommit = process.env.SENTRY_EAS_RELEASE_PREVIOUS_COMMIT
  if (!previousCommit) {
    const releases = await fetchProjectReleases(authToken)
    previousCommit = findPreviousCommit(releases, {
      currentRelease: release,
      releasePrefix: `${identifier}@`,
    })
  }

  if (!previousCommit) {
    throw new Error(
      `No previous commit-associated ${platform} release was found. ` +
        "Bootstrap one release before relying on the EAS success hook.",
    )
  }

  const sentryCli = require.resolve("@sentry/cli/bin/sentry-cli")
  const dryRun = process.env.SENTRY_EAS_RELEASE_DRY_RUN === "true"

  if (previousCommit === currentCommit) {
    console.log(`[Sentry] ${release} was built from the same commit as the previous ${platform} release.`)
  } else {
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`[Sentry] Failed to associate EAS release commits: ${error.message}`)
    process.exitCode = 1
  })
}
