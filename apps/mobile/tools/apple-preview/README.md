# Apple targets preview

A standalone Xcode project that runs the **real** Better Rail Apple targets — the
home-screen widget, the Live Activity, the watch app and the watch widget — without
React Native or CocoaPods, so you can design and debug them in seconds instead of
rebuilding the whole app.

The Xcode project is **generated locally and never committed** — it compiles
`apps/mobile/targets/**` in place, so there are no copies to drift and editing through it
edits the code that ships.

```bash
apps/mobile/tools/apple-preview/preview.sh   # xcodegen + open (needs: brew install xcodegen)
```

## Schemes

| Scheme | Runs | Use it for |
| --- | --- | --- |
| `PreviewHost` | iOS host app + `targets/widget` | Home-screen widget, lock-screen Live Activity, Dynamic Island |
| `WatchApp` | `targets/watch` + `targets/watch-widget` | The watch app's screens and its complications |
| `WatchCardPreview` | watchOS app rendering `WatchActivityCard` | The Apple Watch Smart Stack Live Activity card, at true scale |

## Three ways to look at it

**Xcode Canvas (fastest)** — hit ⌥⌘↩ in:
- `Preview/WidgetPreviews.swift` — every widget family, the Live Activity lock screen and
  Dynamic Island (scheme `PreviewHost`).
- `WatchCardPreview/WatchPreviewApp.swift` — the Smart Stack card, rendered on a watch
  (scheme `WatchCardPreview`). It can't live with the others: `ActivityFamily.small` has no
  `ActivityPreviewViewKind`, and a widget extension can only host widget previews.

**A real Live Activity** — run `PreviewHost`, pick a status and delay, and start the
activity. Use **Time remaining** to check 1, 6, 12, 99, 120, or 999 minutes before starting;
end the activity before changing this value. It controls departure for waiting,
the next departure for an exchange, and arrival for in-transit states.
Lock the device (⌘L) for the lock-screen card. The sample route's times are
generated relative to now, so the countdown and progress ring behave.

**On a physical iPhone** — connect it by USB, unlock it, trust the Mac, and enable
Developer Mode in Settings → Privacy & Security if needed. Open
`ApplePreview.xcodeproj`, choose the `PreviewHost` scheme and your iPhone as the run
destination. Under Signing & Capabilities, select the Apple Developer team that owns
`group.il.co.better-rail` for the four iOS targets (`PreviewHost`, `WidgetExt`,
`StationIntent`, and `NotificationServiceExt`), then Run. Xcode uses automatic
development signing for the phone; the simulator still uses ad-hoc signing. This
builds only the native preview and extensions, without React Native or CocoaPods.
Start a new Live Activity after installing each build so an older activity doesn't
confuse comparisons. Compare the same language, time remaining, and orientation;
record the app language, iOS language, iOS version, and Display Zoom setting when
reporting clipping that occurs only on hardware.

**On a watch** — run `WatchApp` or `WatchCardPreview` on a watchOS simulator.

```bash
./shoot.sh                 # screenshots every Live Activity card state into .screens/
./seed.sh <watch-udid>     # seeds sample favourite routes so the watch app has content
```

## Structure

Everything in this folder is preview-only:

- `Host/` — iOS container app with Live Activity start/stop controls.
- `WatchCardPreview/` — watchOS app that renders the Smart Stack card at true scale.
- `Preview/` — sample data, the `#Preview` definitions, and the mock widget timeline the
  preview widget serves instead of live routes (scenarios in `MockTimeline.swift`).
- `project.yml` + `preview.sh` — the generator. `ApplePreview.xcodeproj` is gitignored;
  re-run `preview.sh` whenever `project.yml` changes or you need the project back.

## Caveats

- The watch app is built **standalone** here (the shipping one is an iPhone companion),
  so WatchConnectivity has nothing to talk to — use `./seed.sh` for content.
- Xcode has no preview kind for `ActivityFamily.small`, so the watch card is previewed
  directly rather than through `previewContext(_:viewKind:)`, at Apple's published Smart
  Stack sizes.
- A paired iPhone + Watch **simulator** pair does not relay Live Activities, so the real
  Smart Stack card can only be confirmed on hardware.
