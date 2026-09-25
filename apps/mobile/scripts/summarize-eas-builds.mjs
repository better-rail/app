const supportedPlatforms = new Set(["android", "ios"])
const artifactFields = ["buildUrl", "applicationArchiveUrl", "buildArtifactsUrl"]

export function summarizeEasBuilds(raw, requestedPlatform, expectedCommitSha) {
  const normalizedPlatform = String(requestedPlatform).toLowerCase()
  const expectedPlatforms = normalizedPlatform === "all" ? supportedPlatforms : new Set([normalizedPlatform])

  if (expectedPlatforms.size === 0 || [...expectedPlatforms].some((platform) => !supportedPlatforms.has(platform))) {
    throw new Error("Unsupported EAS platform selection.")
  }

  let builds
  try {
    builds = JSON.parse(raw)
  } catch {
    throw new Error("EAS build result is not valid JSON.")
  }

  if (!Array.isArray(builds) || builds.length === 0) {
    throw new Error("EAS build result must contain at least one build.")
  }

  const seenPlatforms = new Set()
  const summary = builds.map((build) => {
    if (!build || typeof build !== "object") {
      throw new Error("EAS build result contains an invalid build.")
    }

    const platform = String(build.platform ?? "").toLowerCase()
    if (!expectedPlatforms.has(platform) || seenPlatforms.has(platform)) {
      throw new Error("EAS build result does not match the requested platforms.")
    }
    seenPlatforms.add(platform)

    if (build.status !== "FINISHED" || build.distribution !== "INTERNAL" || build.buildProfile !== "preview") {
      throw new Error("EAS build did not finish as an internal preview build.")
    }
    if (typeof build.id !== "string" || build.id.length === 0 || build.gitCommitHash !== expectedCommitSha) {
      throw new Error("EAS build identity does not match the approved source.")
    }
    if (
      !build.artifacts ||
      !artifactFields.some((field) => typeof build.artifacts[field] === "string" && build.artifacts[field].length > 0)
    ) {
      throw new Error("EAS build result does not contain an installable artifact.")
    }

    return {
      id: build.id,
      platform: build.platform,
      status: build.status,
      appVersion: build.appVersion,
      appBuildVersion: build.appBuildVersion,
      gitCommitHash: build.gitCommitHash,
    }
  })

  if (seenPlatforms.size !== expectedPlatforms.size) {
    throw new Error("EAS build result is missing a requested platform.")
  }

  return summary
}
