# Apple targets preview — agent instructions

A **standalone Xcode project for running and designing the Apple targets**: the iOS
widget, the Live Activity (including the Apple Watch Smart Stack card), the watch app and
the watch widget.

The project is **generated, never committed** (`./preview.sh`, needs `xcodegen`), and it
compiles `apps/mobile/targets/**` in place — no copies, one source of truth. Edits made
while working here land directly in the code that ships via `@bacons/apple-targets`, so
treat them as real changes.

It exists because an `.appex` can't be previewed on its own, and previewing through the
real RN app rebuilds the entire React Native project.

## Workflow

1. `./preview.sh --no-open` if `ApplePreview.xcodeproj` isn't there yet.
2. Edit `apps/mobile/targets/{widget,watch,watch-widget}` as normal.
3. Build what you touched:
   ```bash
   xcodebuild -project ApplePreview.xcodeproj -scheme PreviewHost \
     -destination 'generic/platform=iOS Simulator' build
   xcodebuild -project ApplePreview.xcodeproj -scheme WatchApp \
     -destination 'generic/platform=watchOS Simulator' build
   xcodebuild -project ApplePreview.xcodeproj -scheme WatchCardPreview \
     -destination 'generic/platform=watchOS Simulator' build
   ```
4. Show the user screenshots. `./shoot.sh` covers every Live Activity card state on a
   watch simulator; for the widget / watch app, install and screenshot with argent.

## Preview-only files (safe to change freely)

`Host/`, `WatchCardPreview/`, `Preview/`, `project.yml`, `preview.sh`, `shoot.sh`,
`seed.sh`. Nothing here duplicates target code.

## Notes

- `targets/widget/Live Activity/Views/Watch/WatchActivityCard.swift` deliberately has no
  ActivityKit import so `WatchCardPreview` can compile it for watchOS. Keep it that way;
  the ActivityKit bridge is `WatchLiveActivityView.swift` (iOS only).
- **Ad-hoc signing is required.** With `CODE_SIGNING_ALLOWED=NO` the simulator silently
  refuses to render widgets and Live Activities — the activity starts, `liveactivitiesd`
  registers it, and the renderer never gets content.
- `Preview/SampleRoute.swift` generates times relative to now on purpose. A route in the
  past makes `CircularProgressView`'s `ProgressView(timerInterval:)` trap on an inverted
  range and the extension crashes with no visible error beyond an empty card.
- The preview widget serves `Preview/MockTimeline.swift` instead of live routes
  (`PREVIEW_MOCK_TIMELINE`, set in `project.yml`). Switch scenarios through the extension's
  defaults domain and reinstall the app to reload the timeline:
  ```bash
  xcrun simctl spawn <udid> defaults write il.co.better-rail.preview.BetterRailWidget previewScenario tomorrow  # tomorrow | empty | error
  xcrun simctl spawn <udid> defaults write il.co.better-rail.preview.BetterRailWidget previewLabel Work
  xcrun simctl spawn <udid> defaults delete il.co.better-rail.preview.BetterRailWidget previewScenario
  ```
- `Route.intentdefinition` is compiled into the widget bundle by a script phase (compiling it
  as a source would regenerate `RouteIntent.swift`). Without it iOS treats the widget as
  non-configurable: no "Edit Widget", and the timeline never gets a route.
- To add the widget on the simulator: long-press the home screen → Edit → Add Widget →
  BR Preview, swipe to the size, Add. Long-press the widget → Edit Widget to change the route.
- `WatchCardPreview` copies the widget's `.lproj` folders into its bundle in a build
  phase — a variant group can only belong to one target.
- Keep the watch-card `#Preview`s in `WatchCardPreview/`. A widget extension can only host
  widget previews, so a plain view preview in `Preview/WidgetPreviews.swift` fails with
  `UnsupportedPreviewContentInExtensionError`.
- The watch app is standalone here, so it has no WatchConnectivity peer. Run
  `./seed.sh <watch-udid>` to put sample favourites in the App Group.
- A paired iPhone + Watch simulator pair does **not** relay Live Activities. The Smart
  Stack card can only be verified on hardware; use `WatchCardPreview` otherwise.
- Re-run `./preview.sh` after editing `project.yml`.
- `ApplePreview.xcodeproj/`, `Generated/`, `.build/` and `.screens/` are gitignored.
