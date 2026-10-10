# Apple targets — agent instructions

The iOS/watchOS extensions that ship alongside the React Native app via
`@bacons/apple-targets`: `widget` (home-screen widget + Live Activity), `intent` (the
widget's SiriKit configuration UI), `watch` (watchOS app), `watch-widget` (its
complications).

## Seeing a change without rebuilding the RN app

**Do not** run `expo prebuild` / rebuild the whole app to look at a native UI change.
There is a generated Xcode project that compiles these folders in place:

```bash
apps/mobile/tools/apple-preview/preview.sh --no-open   # generates ApplePreview.xcodeproj
```

Then build and run whichever scheme covers what you touched:

| Touched | Scheme | Platform |
| --- | --- | --- |
| `widget/`, `intent/` | `PreviewHost` | iOS Simulator |
| `watch/`, `watch-widget/` | `WatchApp` | watchOS Simulator |
| `widget/Live Activity/Views/Watch/` | `WatchCardPreview` | watchOS Simulator |

```bash
cd apps/mobile/tools/apple-preview
xcodebuild -project ApplePreview.xcodeproj -scheme PreviewHost \
  -destination 'generic/platform=iOS Simulator' build
```

Install to a simulator with `xcrun simctl install`, then drive and screenshot it with
argent. `./shoot.sh <watch-udid>` captures every Live Activity card state; `./seed.sh
<watch-udid>` gives the watch app sample favourites.

Read `apps/mobile/tools/apple-preview/CLAUDE.md` before using it — it covers the
non-obvious failure modes (unsigned extensions render nothing, sample routes in the past
crash the Live Activity, the Smart Stack card can't be verified on a simulator).
