import { describe, expect, test } from "bun:test"
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

type WorkflowStep = {
  name?: string
  uses?: string
  run?: string
  "continue-on-error"?: boolean
}

type WorkflowJob = {
  "continue-on-error"?: boolean
  steps: WorkflowStep[]
}

type Workflow = {
  on: Record<string, unknown>
  permissions: Record<string, string>
  concurrency: Record<string, unknown>
  defaults?: { run?: Record<string, string> }
  jobs: Record<string, WorkflowJob>
}

type PackageJson = {
  scripts?: Record<string, string>
}

const readPackage = (relativePath: string) =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), "utf8")) as PackageJson

const source = readFileSync(new URL("test.yml", import.meta.url), "utf8")
const runbook = readFileSync(new URL("../../docs/operations/CI.md", import.meta.url), "utf8")
const workflow = Bun.YAML.parse(source) as Workflow
const rootPackage = readPackage("../../package.json")
const mobilePackage = readPackage("../../apps/mobile/package.json")
const serverPackage = readPackage("../../apps/server/package.json")
const conductorPackage = readPackage("../../apps/conductor/package.json")
const allSteps = Object.values(workflow.jobs).flatMap((job) => job.steps)

const requiredJobs = [
  "frozen-install",
  "ci-contract",
  "lint-changed",
  "test-mobile",
  "test-server",
  "test-conductor",
  "expo-config",
  "test-fixtures",
  "website-boundary",
]

const step = (jobName: string, stepName: string) => {
  const match = workflow.jobs[jobName]?.steps.find((candidate) => candidate.name === stepName)
  if (!match) {
    throw new Error(`test.yml must define ${jobName}/${stepName}`)
  }
  return match
}

const withTempDir = (callback: (directory: string) => void) => {
  const directory = mkdtempSync(join(tmpdir(), "better-rail-ci-"))
  try {
    callback(directory)
  } finally {
    rmSync(directory, { recursive: true, force: true })
  }
}

describe("CI quality gate", () => {
  test("uses read-only permissions and pinned actions", () => {
    expect(workflow.permissions).toEqual({ contents: "read" })
    expect(Object.keys(workflow.on)).toEqual(["push", "pull_request"])
    expect(workflow.defaults?.run?.shell).toBe("bash")
    expect(workflow.concurrency).toEqual({ group: "${{ github.workflow }}-${{ github.ref }}", "cancel-in-progress": true })

    const actionRefs = allSteps.flatMap((candidate) => (candidate.uses ? [candidate.uses] : []))
    expect(actionRefs.length).toBeGreaterThan(0)
    expect(actionRefs.every((ref) => /^[^\s]+@[a-f0-9]{40}$/.test(ref))).toBe(true)
    expect(new Set(actionRefs)).toEqual(
      new Set([
        "actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1",
        "oven-sh/setup-bun@0c5077e51419868618aeaa5fe8019c62421857d6",
      ]),
    )
  })

  test("requires the green install, test, config, and boundary jobs", () => {
    for (const jobName of requiredJobs) {
      expect(workflow.jobs[jobName]).toBeDefined()
      expect(workflow.jobs[jobName]?.["continue-on-error"]).not.toBe(true)
    }
    expect(step("ci-contract", "Run CI contract tests").run).toBe("bun test ./.github/workflows/ci.test.ts")
  })

  test("freezes installation and detects lockfile drift", () => {
    const install = step("frozen-install", "Install without lockfile changes").run ?? ""

    expect(install).toContain("bun install --frozen-lockfile")
    expect(install).toContain("git diff --exit-code -- bun.lock")
  })

  test("checks changed code and format against the trusted base", () => {
    const check = step("lint-changed", "Check changed source quality").run ?? ""

    expect(check).toContain("BASE_SHA")
    expect(check).toContain("GITHUB_SHA")
    expect(check).toContain("git cat-file -e")
    expect(check).toContain("git diff --name-only")
    expect(check).toContain("mktemp")
    expect(check).toContain("bunx --no-install oxlint")
    expect(check).toContain("bunx --no-install oxfmt --check")
    expect(check).not.toContain("< <(git diff")
  })

  test("executes deliberate lint and unit failure probes", () => {
    withTempDir((directory) => {
      const lintFile = join(directory, "invalid.ts")
      const unitFile = join(directory, "invalid.test.ts")
      writeFileSync(lintFile, "const = 1\n")
      writeFileSync(unitFile, 'import { test } from "bun:test"\ntest("intentional", () => { throw new Error("intentional") })\n')

      const lint = spawnSync("bunx", ["--no-install", "oxlint", lintFile], { encoding: "utf8" })
      const unit = spawnSync("bun", ["test", unitFile], { cwd: directory, encoding: "utf8" })

      expect(lint.status).not.toBe(0)
      expect(unit.status).not.toBe(0)
    })
  })

  test("executes a lockfile drift probe", () => {
    withTempDir((directory) => {
      const lockfile = join(directory, "bun.lock")
      writeFileSync(lockfile, "original\n")
      expect(spawnSync("git", ["init", "--quiet"], { cwd: directory }).status).toBe(0)
      expect(
        spawnSync("git", ["-c", "user.name=CI", "-c", "user.email=ci@example.invalid", "add", "bun.lock"], {
          cwd: directory,
        }).status,
      ).toBe(0)
      expect(
        spawnSync("git", ["-c", "user.name=CI", "-c", "user.email=ci@example.invalid", "commit", "-m", "fixture"], {
          cwd: directory,
        }).status,
      ).toBe(0)
      writeFileSync(lockfile, "changed\n")
      expect(spawnSync("git", ["diff", "--exit-code", "--", "bun.lock"], { cwd: directory }).status).toBe(1)
    })
  })

  test("runs mobile, server, and conductor coverage through root scripts", () => {
    expect(step("test-mobile", "Run mobile tests").run).toBe("bun run mobile:test")
    expect(step("test-server", "Run server tests").run).toBe("bun run server:test")
    expect(step("test-conductor", "Run conductor tests").run).toBe("bun run conductor:test")
    expect(step("test-conductor", "Typecheck conductor").run).toBe("bun run conductor:check")
    expect(rootPackage.scripts?.test).toContain("conductor:test")
    expect(rootPackage.scripts?.["mobile:config"]).toBeDefined()
    expect(rootPackage.scripts?.["server:check"]).toBeDefined()
    expect(rootPackage.scripts?.["conductor:test"]).toBeDefined()
    expect(rootPackage.scripts?.["conductor:check"]).toBeDefined()
  })

  test("validates Expo config without claiming a website build", () => {
    expect(step("expo-config", "Validate Expo config").run).toBe("bun run mobile:config > /dev/null")
    expect(step("test-fixtures", "Run route fixture contract").run).toBe(
      "bun --cwd apps/mobile test ./src/services/api/e2e-route-fixtures.test.ts",
    )
    expect(mobilePackage.scripts?.config).toBe("expo config --type public --json")
    expect(step("website-boundary", "Refuse unowned website build claims").run).toContain("apps/web")
    expect(source).not.toContain("apps/web/package.json")
    expect(source).not.toContain("website:dev")
  })

  test("keeps known-red baseline checks visible but non-blocking", () => {
    const baseline = workflow.jobs["quality-baseline"]

    expect(baseline?.["continue-on-error"]).toBeUndefined()
    expect(
      baseline?.steps.filter((candidate) => candidate["continue-on-error"] === true).map((candidate) => candidate.name),
    ).toEqual([
      "Report repository lint baseline",
      "Report mobile typecheck baseline",
      "Report server typecheck baseline",
      "Report dependency audit baseline",
    ])
    expect(baseline?.steps.map((candidate) => candidate.run).join("\n")).toContain("bun audit --audit-level=high")
    expect(baseline?.steps.at(-1)?.run).toContain("non-blocking")
  })

  test("assigns deliberate failures to blocking jobs", () => {
    const failureContracts = [
      ["lint", "lint-changed", "oxlint"],
      ["mobile unit", "test-mobile", "mobile:test"],
      ["server unit", "test-server", "server:test"],
      ["config", "expo-config", "mobile:config"],
      ["fixture", "test-fixtures", "e2e-route-fixtures"],
      ["lock drift", "frozen-install", "bun.lock"],
    ] as const

    for (const [, jobName, marker] of failureContracts) {
      expect(workflow.jobs[jobName]?.["continue-on-error"]).not.toBe(true)
      expect(JSON.stringify(workflow.jobs[jobName])).toContain(marker)
    }
  })

  test("documents the staged baseline and deliberate-failure policy", () => {
    expect(runbook).toContain("known-red checks")
    expect(runbook).toContain("Deliberate-failure drill")
    expect(runbook).toContain("seven consecutive stable `main` runs")
    expect(runbook).toContain("No accessibility smoke gate is claimed")
  })

  test("exposes package-level commands without embedding secrets", () => {
    expect(serverPackage.scripts?.check).toBe("tsc --noEmit -p tsconfig.json --pretty false")
    expect(conductorPackage.scripts?.check).toBe("tsc --noEmit")
    expect(conductorPackage.scripts?.test).toBe("bun test")
    expect(source).not.toContain("secrets.")
    expect(source).not.toMatch(/id-token\s*:|pull_request_target|workflow_run/)
  })
})
