# Mobile release runbook

## Scope

The `Mobile internal release candidate` workflow replaces the former privileged `/publish` comment workflow. It builds signed EAS `preview` artifacts for internal testing from an explicitly approved commit on `main`.

It does not submit to the App Store, Google Play, TestFlight, or a production release track. Exact artifact promotion is a separate change.

## One-time repository setup

Repository administrators must configure the `mobile-release` GitHub Environment before using the workflow:

1. Require approval from a maintainer who is not the requester when GitHub supports that protection.
2. Allow deployments only from `main`.
3. Store `MOBILE_INTERNAL_EAS_TOKEN` only as an environment secret. Remove repository- or organization-level fallback copies with the same name. The workflow exposes it as `EXPO_TOKEN` only to the final EAS build step.
4. Add an environment variable named `MOBILE_RELEASE_APPROVED_SHA`.
5. Prevent administrators and maintainers from bypassing environment protection where the repository plan permits.

Environment settings are not encoded in the workflow file. Verify them in repository settings and review them periodically.

## Build an internal candidate

1. Confirm that `main` is green and contains the intended mobile version and native configuration.
2. Record the full `main` commit SHA in the release issue.
3. Set the `mobile-release` environment variable `MOBILE_RELEASE_APPROVED_SHA` to that exact commit SHA.
4. Open **Actions → Mobile internal release candidate → Run workflow**.
5. Select `main` and choose `all`, `android`, or `ios`.
6. The environment reviewer verifies the selected ref, commit SHA, app version, native changes, and release issue before approving the job.
7. Leave `MOBILE_RELEASE_APPROVED_SHA` unchanged until the build finishes, then clear it immediately.

The job fails closed if it is dispatched from another ref, the checked-out commit differs from the dispatch SHA, or `MOBILE_RELEASE_APPROVED_SHA` does not match. No pull request ref, issue text, review text, or comment body is executed.

## What the workflow verifies

- GitHub reports that the environment has required reviewers and protected-branch deployment rules before source is checked out.
- GitHub Actions have read-only repository permissions.
- Actions, Bun, and EAS CLI versions are pinned.
- The checkout uses the dispatch SHA and does not retain repository credentials.
- Dependencies use `bun install --frozen-lockfile`.
- The release-policy test, configured mobile test target, and explicit i18n contract test pass.
- Test commands do not receive release credentials and do not modify tracked files.
- Only the final EAS build step receives `MOBILE_INTERNAL_EAS_TOKEN`.
- The build is reported successful only when every requested platform has a finished internal preview artifact for the approved source SHA.
- The EAS command never auto-submits to a store.

The workflow summary records the Git SHA, initiator, workflow URL, EAS build IDs, platforms, statuses, app version, and native build version.

Record the operator, approving reviewer, environment approval/run URL, EAS build IDs, source SHA, and validation result in the release issue. The protected environment deployment history is the approval source of truth.

## Validate the candidate

Before any production decision:

1. Install the exact iOS and Android artifacts on representative devices.
2. Verify app launch, route planning, station search, favorites, sharing, calendar export, widgets, watch surfaces, and live rides.
3. Exercise offline, timeout, stale SIRI, cancelled train, and denied notification-permission paths.
4. Check crash-free sessions, ANRs, live-ride start/stop, push delivery, and Sentry release association against the recorded build IDs.
5. Record tester results and unresolved issues in the release issue.

A successful EAS build is not evidence that store rollout or device validation passed.

## Production handoff

Do not rebuild from a mutable branch and call it promotion. Do not submit a pull-request build to any store.

Exact artifact promotion, store receipts, Sentry association, staged rollout, halt thresholds, and rollback evidence will be added by the build-once/promotion change. Until that workflow is installed and rehearsed, production store submission remains a manual, maintainer-approved operation outside this workflow.

## Rollback and halt

For an internal candidate:

1. Cancel the EAS build if it is still running.
2. Remove the internal artifact or tester access.
3. Clear `MOBILE_RELEASE_APPROVED_SHA`.
4. Record the EAS build IDs and reason in the release issue.

For a store release:

1. Pause the Google Play staged rollout or App Store phased release, and stop the affected OTA channel, to prevent further exposure.
2. Do not describe that pause as a rollback: already updated devices keep the installed binary.
3. Recover affected clients with a tested forward fix using a higher app build version. Use a vendor withdrawal or unpublish procedure only when the applicable store policy and current rollout state allow it.
4. Record the affected versions, build IDs, halt reason, platform owner, and forward-fix release ID.

Do not claim that installed iOS or Android binaries can be remotely downgraded.

## Credential response

If a release credential may have been exposed:

1. Cancel active runs.
2. Revoke and rotate the affected EAS or store credential.
3. Review workflow, EAS, Apple, and Google audit records.
4. Preserve only bounded job metadata; do not paste tokens or build logs into the issue.
5. Complete rotation before another release is approved.

## Local workflow checks

Run from the repository root:

```sh
bun test ./.github/workflows/release.test.ts
actionlint .github/workflows/release.yml
zizmor .github/workflows/release.yml
```
