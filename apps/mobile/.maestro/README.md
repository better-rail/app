# E2E tests (Maestro)

End-to-end tests run with [Maestro](https://maestro.mobile.dev) against the app on an iOS simulator.

## Prerequisites

- Maestro CLI installed (`curl -Ls https://get.maestro.mobile.dev | bash`)
- A booted iOS simulator with the Better Rail dev client installed (`bun ios`)
- Metro running: `bun start`

## Running

```sh
bun e2e                                    # all flows
maestro test .maestro/flows/plan-route.yaml  # a single flow
```

## Writing flows

- Select elements by `testID` (Maestro's `id:` selector), never by visible text —
  the app's display language follows the device locale, so text matching breaks
  between Hebrew/English/Russian/Arabic devices.
- Station search terms are typed in Hebrew: the search index always includes
  Hebrew station names regardless of the app's display language, so Hebrew input
  works on any device locale.
- Flows launch the app through the dev-client deep link
  (`betterrail://expo-development-client/?url=...`) so it connects to the local
  Metro server. The optional taps on "Open" handle iOS's link confirmation dialog.
  For testing release builds, replace `openLink` with a plain `launchApp`.

## CI (GitHub Actions)

`.github/workflows/e2e.yml` runs the flows on pull requests: it downloads the
latest `development-simulator` build from EAS, installs it on an iOS simulator,
starts Metro from the PR checkout, and runs Maestro. Because the dev client
loads JS from Metro, the PR's JavaScript is what gets tested — the EAS binary
only needs rebuilding when native dependencies change:

```sh
eas build --profile development-simulator --platform ios
```

Requirements: an `EXPO_TOKEN` repo secret (a robot access token from
expo.dev), and at least one finished `development-simulator` build on EAS.
Failed CI runs upload Maestro screenshots/logs and `metro.log` as a workflow
artifact.

## Debugging

Failed runs write screenshots and logs to `~/.maestro/tests/<timestamp>/`.
`maestro studio` opens an interactive inspector for the UI hierarchy.
