# Maestro E2E tests

The same Maestro suite runs against iOS and Android installable builds. It covers:

- planner station search, route reversal, and recent stations;
- route results, details, train information, and favorite routes;
- route filtering; and
- settings navigation plus persisted appearance and language preferences.

Selectors use React Native `testID` values rather than translated text. The E2E build
starts in English so station queries use ASCII input, which also works with Maestro's
Android driver.

## Deterministic E2E build

The `e2e` profile in `eas.json` creates an Android APK or iOS Simulator `.app` with
`EXPO_PUBLIC_E2E=true`. Only this profile uses the small, in-app timetable fixture in
`src/services/api/e2e-route-fixtures.ts`; all other builds continue to use the live
Better Rail API. The fixture follows the requested date and time, so normal route
grouping, filtering, details, and persistence code still runs without depending on
rail service availability or current schedules.

The E2E build also disables OTA updates, analytics/error reporting, and fixes the
initial locale to English. Disabling OTA updates guarantees the installed binary runs
the commit being tested. Every flow begins by clearing app state.

## Run locally

Install Maestro and create the installable E2E builds:

```sh
curl -Ls https://get.maestro.mobile.dev | bash
cd apps/mobile
eas build --profile e2e --platform all
```

Install the appropriate finished build on a booted emulator/simulator, then run:

```sh
bun e2e:ios       # iOS Simulator, bundle ID il.co.better-rail
bun e2e:android   # Android emulator, package com.betterrail
```

Run one flow by passing the platform's app ID directly:

```sh
maestro test -e MAESTRO_APP_ID=il.co.better-rail \
  .maestro/flows/02-routes-details-and-favorites.yaml
```

`maestro studio` is useful for inspecting the accessibility hierarchy. Local failure
artifacts are written under `~/.maestro/tests/`.

## CI: EAS Workflows

The project uses `apps/mobile/.eas/workflows/e2e.yml`. EAS Workflows is the best fit
here because it natively creates both required binary formats and runs Maestro on
managed Android emulators and iOS simulators. It avoids maintaining nested Android
virtualization and macOS simulator setup in GitHub Actions.

The workflow:

1. fingerprints both native projects;
2. finds an existing compatible `e2e` build;
3. repacks that build with the pull request's JavaScript when native inputs have not
   changed, or performs a full build when they have; and
4. runs the flows on both platforms, retries failures once, and records video.

It runs when a pull request is labeled `run-e2e`, and can also be started manually:

```sh
cd apps/mobile
eas workflow:run .eas/workflows/e2e.yml
```

Automatic pull-request triggers require the GitHub repository to be linked from the
EAS project's GitHub settings. Direct EAS triggers do not use the old `EXPO_TOKEN`
GitHub Actions setup.

EAS's Maestro job is currently marked alpha. If the team later needs a larger device
matrix, higher parallelism, or stronger hosted-test guarantees, Maestro Cloud is the
natural paid alternative: keep these flows and change the EAS jobs from `maestro` to
`maestro-cloud`. A self-managed GitHub Actions emulator setup is possible, but is the
highest-maintenance option and recreates the slow/flaky simulator orchestration this
repository previously had.

References:

- [Expo: Maestro tests with EAS Workflows](https://docs.expo.dev/eas/workflows/examples/e2e-tests/)
- [Expo: Fingerprint and Repack](https://docs.expo.dev/build-reference/repack/)
- [Maestro: cross-platform app IDs](https://docs.maestro.dev/extra-materials/troubleshooting/faq)
- [Maestro Cloud](https://docs.maestro.dev/maestro-cloud)
