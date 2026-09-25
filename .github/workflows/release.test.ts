import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"
import { summarizeEasBuilds } from "../../apps/mobile/scripts/summarize-eas-builds.mjs"

type WorkflowStep = {
  name?: string
  uses?: string
  with?: Record<string, unknown>
  run?: string
  env?: Record<string, string>
}

type WorkflowJob = {
  if?: string
  "runs-on"?: string
  "timeout-minutes"?: number
  environment?: string
  env?: Record<string, string>
  permissions?: Record<string, string>
  steps: WorkflowStep[]
}

type Workflow = {
  on: Record<string, unknown>
  permissions: Record<string, string>
  concurrency: Record<string, unknown>
  jobs: Record<string, WorkflowJob>
}

type EasConfig = {
  build: Record<string, { distribution?: string }>
}

const source = readFileSync(new URL("release.yml", import.meta.url), "utf8")
const workflow = Bun.YAML.parse(source) as Workflow
const easConfig = JSON.parse(readFileSync(new URL("../../apps/mobile/eas.json", import.meta.url), "utf8")) as EasConfig
const buildJob = workflow.jobs.build

if (!buildJob) {
  throw new Error("release.yml must define the build job")
}

const allSteps = Object.values(workflow.jobs).flatMap((job) => job.steps)

const step = (name: string) => {
  const match = buildJob.steps.find((candidate) => candidate.name === name)
  if (!match) {
    throw new Error(`release.yml must define the ${name} step`)
  }
  return match
}

const acceptsDispatch = (eventName: string, ref: string) => Object.hasOwn(workflow.on, eventName) && ref === "refs/heads/main"
const approvedSha = "1".repeat(40)
const successfulBuild = (platform: "android" | "ios", overrides: Record<string, unknown> = {}) => ({
  id: `${platform}-build`,
  status: "FINISHED",
  platform,
  distribution: "INTERNAL",
  buildProfile: "preview",
  appVersion: "2.8.2",
  appBuildVersion: "803",
  gitCommitHash: approvedSha,
  artifacts: { applicationArchiveUrl: `artifact-${platform}` },
  ...overrides,
})

describe("EAS release result", () => {
  test("summarizes every finished artifact for the approved source", () => {
    const result = summarizeEasBuilds(JSON.stringify([successfulBuild("android"), successfulBuild("ios")]), "all", approvedSha)

    expect(result.map((build) => build.id)).toEqual(["android-build", "ios-build"])
  })

  test.each([
    ["malformed JSON", "{", "android"],
    ["no builds", "[]", "android"],
    ["canceled build", JSON.stringify([successfulBuild("android", { status: "CANCELED" })]), "android"],
    ["wrong source", JSON.stringify([successfulBuild("android", { gitCommitHash: "2".repeat(40) })]), "android"],
    ["missing artifact", JSON.stringify([successfulBuild("android", { artifacts: null })]), "android"],
    [
      "logs without artifact",
      JSON.stringify([successfulBuild("android", { artifacts: { xcodeBuildLogsUrl: "logs" } })]),
      "android",
    ],
    ["store distribution", JSON.stringify([successfulBuild("android", { distribution: "STORE" })]), "android"],
    ["missing platform", JSON.stringify([successfulBuild("android")]), "all"],
    ["duplicate platform", JSON.stringify([successfulBuild("android"), successfulBuild("android")]), "android"],
    ["unsupported platform", JSON.stringify([successfulBuild("android")]), "windows"],
  ])("rejects %s", (_scenario, raw, requestedPlatform) => {
    expect(() => summarizeEasBuilds(raw, requestedPlatform, approvedSha)).toThrow()
  })
})

describe("mobile release workflow trust boundary", () => {
  test("only manual main dispatches can reach the build job", () => {
    expect(Object.keys(workflow.on)).toEqual(["workflow_dispatch"])
    expect(buildJob.if).toBe("github.ref == 'refs/heads/main'")
    expect(acceptsDispatch("workflow_dispatch", "refs/heads/main")).toBe(true)
    expect(acceptsDispatch("workflow_dispatch", "refs/pull/739/head")).toBe(false)
  })

  test.each([
    ["outsider issue comment", "issue_comment"],
    ["collaborator issue comment", "issue_comment"],
    ["merged-main push", "push"],
    ["pull request", "pull_request"],
  ])("%s cannot start a release", (_scenario, eventName) => {
    expect(acceptsDispatch(eventName, "refs/heads/main")).toBe(false)
  })

  test("uses read-only permissions and a protected release environment", () => {
    expect(Object.keys(workflow.jobs)).toEqual(["build"])
    expect(workflow.permissions).toEqual({ contents: "read", deployments: "read" })
    expect(buildJob.permissions).toBeUndefined()
    expect(workflow.concurrency).toEqual({ group: "mobile-internal-release", "cancel-in-progress": false })
    expect(buildJob["runs-on"]).toBe("ubuntu-24.04")
    expect(buildJob["timeout-minutes"]).toBe(60)
    expect(buildJob.environment).toBe("mobile-release")
    expect(buildJob.env).toEqual({ RELEASE_APPROVED_SHA: "${{ vars.MOBILE_RELEASE_APPROVED_SHA }}" })
  })

  test("fails closed unless GitHub reports required reviewers and protected branches", () => {
    const verification = step("Verify protected release environment").run ?? ""

    expect(verification).toContain("/environments/mobile-release")
    expect(verification).toContain(".deployment_branch_policy.protected_branches == true")
    expect(verification).toContain('.type == "required_reviewers"')
  })

  test("pins actions and release toolchains", () => {
    const actionRefs = allSteps.flatMap((candidate) => (candidate.uses ? [candidate.uses] : []))

    expect(actionRefs).toEqual([
      "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
      "oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6",
      "expo/expo-github-action@c7b66a9c327a43a8fa7c0158e7f30d6040d2481e",
    ])
    expect(actionRefs.every((ref) => /@[a-f0-9]{40}$/.test(ref))).toBe(true)
    expect(step("Setup Bun").with).toMatchObject({ "bun-version": "1.3.10" })
    expect(step("Setup EAS CLI").with).toMatchObject({ "eas-version": "24.8.0", "eas-cache": false, packager: "bun" })
  })

  test("checks out only the dispatch SHA without persisted credentials", () => {
    expect(step("Checkout trusted source").with).toMatchObject({
      ref: "${{ github.sha }}",
      "persist-credentials": false,
    })
  })

  test("requires an independently approved main SHA", () => {
    const verification = step("Verify trusted source").run ?? ""

    expect(verification).toContain('test -n "$RELEASE_APPROVED_SHA"')
    expect(verification).toContain('test "$RELEASE_APPROVED_SHA" = "$RELEASE_SHA"')
    expect(verification).toContain('test "$RELEASE_REF" = "refs/heads/main"')
    expect(verification).toContain('test "$(git rev-parse HEAD)" = "$RELEASE_SHA"')
  })

  test("validates without release credentials and rejects source mutation", () => {
    expect(step("Install dependencies").run).toBe("bun install --frozen-lockfile")
    expect(step("Validate source").run).toContain("bun test ./.github/workflows/release.test.ts")
    expect(step("Validate source").run).toContain("bun run mobile:test")
    expect(step("Validate source").run).toContain("bun --cwd apps/mobile test ./test/i18n.test.ts")
    expect(step("Verify source was not modified").run).toContain('test -z "$(git status --porcelain)"')

    const secretSteps = allSteps.filter((candidate) => JSON.stringify(candidate).includes("secrets."))
    expect(secretSteps.map((candidate) => candidate.name)).toEqual(["Build signed internal candidate"])
  })

  test("builds only non-interactive internal candidates without auto-submit", () => {
    const build = step("Build signed internal candidate")
    const script = build.run ?? ""

    expect(script).toContain("--non-interactive")
    expect(script).toContain("--profile preview")
    expect(script).toContain("build_status=$?")
    expect(script).toContain("summarize-eas-builds.mjs")
    expect(script).toContain("exit 1")
    expect(script).toContain('exit "$build_status"')
    expect(script).not.toContain("auto-submit")
    expect(easConfig.build.preview?.distribution).toBe("internal")
    expect(build.env).toEqual({
      EAS_PLATFORM: "${{ inputs.platform }}",
      EXPO_TOKEN: "${{ secrets.MOBILE_INTERNAL_EAS_TOKEN }}",
    })
  })

  test("contains no event interpolation or retired release credentials", () => {
    const scripts = allSteps.map((candidate) => candidate.run ?? "").join("\n")

    expect(scripts).not.toContain("${{")
    expect(source).not.toMatch(/github\.event\./)
    expect(source).not.toContain("refs/pull/")
    expect(source).not.toMatch(/ANDROID_(?:KEYSTORE|PLAY_STORE|GOOGLE_SERVICES)/)
    expect(source).not.toMatch(/TELEGRAM_(?:BOT_API_KEY|CHAT_ID)|SENTRY_AUTH_TOKEN|POSTHOG_API_KEY/)
  })
})
