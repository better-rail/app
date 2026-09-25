# CI quality-gate runbook

## Current gate contract

The `CI` workflow runs with `contents: read` and no secrets. Its required jobs are:

- frozen dependency install with a lockfile-drift check;
- CI contract and deliberate-failure probe tests;
- changed-file lint and format checks against the trusted base;
- mobile, server, and conductor tests;
- conductor typecheck;
- Expo public-config evaluation;
- the route fixture contract;
- the website boundary check.

All actions and Bun are pinned. Pull-request code runs without repository secrets, and checkout credentials are not persisted.

## Baseline reports

The repository currently has known-red checks that are reported but intentionally do not block merges yet:

- repository formatting/lint baseline;
- mobile TypeScript baseline;
- server TypeScript baseline, including test-runner and provider declaration gaps;
- high-severity dependency audit findings.

The report job is named `quality-baseline` and is not a success claim. Each report step is independently marked `continue-on-error` so later reports still run. The current observed counts and remediation status must be recorded in the pull request or follow-up issue.

Before removing a report's non-blocking marker:

1. Fix the underlying source or dependency issue in a focused change.
2. Run the command locally and in CI.
3. Observe seven consecutive stable `main` runs.
4. Update this runbook and the branch-protection checklist.
5. Remove only that report's `continue-on-error` marker.

Do not promote all reports at once.

## Deliberate-failure drill

Run these on a disposable branch and record the expected failing job:

| Failure                                               | Expected result                       |
| ----------------------------------------------------- | ------------------------------------- |
| Introduce a syntax error in a changed TypeScript file | `lint-changed` fails                  |
| Make a mobile or server unit test fail                | The corresponding test job fails      |
| Make `app.config.ts` invalid                          | `expo-config` fails                   |
| Modify `bun.lock` after frozen install                | `frozen-install` fails its diff check |
| Add a malformed route fixture                         | `test-fixtures` fails                 |
| Introduce `apps/web` without reviewed build scripts   | `website-boundary` fails              |

The known-red lint, typecheck, and audit reports are not expected to block until their remediation checklist is complete. This is the only intentional exception to the required-job policy.

## Website and accessibility boundaries

`apps/website` remains a static package and has no build claim. If `apps/web` is introduced, the boundary job fails until its own reviewed compile/test jobs and ownership are added.

No accessibility smoke gate is claimed until a deterministic local harness exists. Do not mark the CI contract complete based on a manual screen-reader check or on a website build that is not present on `main`.

## Local verification

From the repository root:

```sh
bun test ./.github/workflows/ci.test.ts
actionlint .github/workflows/test.yml
zizmor .github/workflows/test.yml
bun install --frozen-lockfile
bun run mobile:test
bun run server:test
bun run conductor:test
bun run conductor:check
bun run mobile:config > /dev/null
bun --cwd apps/mobile test ./src/services/api/e2e-route-fixtures.test.ts
```

The server and mobile test commands currently emit fixture error logs while passing. Treat those logs as test output, not production observability evidence.
