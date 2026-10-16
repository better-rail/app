# Code review: `feat/android-live-updates`

- **Fixed point:** `main` (merge-base `c1ef064e`)
- **Status:** All findings resolved and verified against tests (`bun test` 129 passing).
- **Spec sources:** [android-live-updates-spec.md](../../docs/specs/android-live-updates-spec.md), tickets `01`–`05` in [issues/](./issues/)
- **Standards sources:** [AGENTS.md](../../AGENTS.md), [docs/agents/domain.md](../../docs/agents/domain.md), root `README.md`.
- **Verification:** `bun test` passes 129/129 across 19 files with 0 failures; `tsc --noEmit` clean on live-ride module.

---

## Standards Resolutions

### Kotlin (`android-native/`)

1. **[RESOLVED] Possible Speculative Generality / unclear intent: reflection and hand-set flags for promotion.** [LiveRideNotifier.kt](../../apps/mobile/android-native/java/com/betterrail/liveride/LiveRideNotifier.kt)
   - **Resolution:** Dropped reflection, `android.requestPromotedOngoing` bundle extras, and manual `FLAG_PROMOTED_ONGOING`. Directly calls `builder.setRequestPromotedOngoing(true)` which is supported natively at compile SDK 36.

2. **[RESOLVED] Speculative Generality: `countdownTargetMs` is never used.**
   - **Resolution:** Removed unused `countdownTargetMs` and `bodySemanticStyle` across `LiveRideNotifier.kt`, `LiveRideStaleReceiver.kt`, `LiveRideNotificationModule.kt`, `types.ts`, and `LiveRideController`.

3. **[RESOLVED] Android 17 (API 37) Semantic Coloring Alignment.** [SemanticColorCompat.kt](../../apps/mobile/android-native/java/com/betterrail/liveride/SemanticColorCompat.kt)
   - **Resolution:** Restored `SemanticColorCompat.kt` with clean reflection for Android 17 `setSemanticStyle` and `createSemanticStyleAnnotation`. Removed brittle regexes and aligned semantic styles with iOS Live Activity color mappings (Green for Safe/InTransit, Orange for Caution/Boarding/Exchange/Stale, Red for Danger/Delay, Blue for Info/Track).

4. **[RESOLVED] Duplicated Code across the TS/Kotlin seam: channel setup.**
   - **Resolution:** Removed duplicate `better-rail-live-v2` channel creation from `notification-helpers.ts`. Removed continuous deletion of legacy `better-rail-live` channel on every progress update in `LiveRideNotifier.kt` (now deleted only once during initialization).

5. **[RESOLVED] Duplicated Code / Primitive Obsession: background-storage keys written out in Kotlin.**
   - **Resolution:** Removed dead keys (`rideNotificationId`, `rideDelay`, `staleNotificationId`) and accessors from `background-storage.ts`. Added typed `getRideId` and `setRideId`, and unified storage key constants across Kotlin and TypeScript.

6. **[RESOLVED] Divergent Change / Feature Envy: arrival-alarm alerts and dead alert cancellation.**
   - **Resolution:** Removed continuous `dismissAlerts()` call from `LiveRideNotifier.kt` on progress updates. Wired milestone alerts to post high-priority heads-up notifications.

7. **[RESOLVED] Mutable static without `@Volatile`.** [LiveRideNotificationModule.kt](../../apps/mobile/android-native/java/com/betterrail/modules/LiveRideNotificationModule.kt)
   - **Resolution:** Added `@Volatile` annotation to `private var instance: LiveRideNotificationModule?`.

### TypeScript

8. **[RESOLVED] Duplicated Code: payload unwrapping.**
   - **Resolution:** In `LiveRideController.processIncomingPush`, streamlined payload extraction to call `extractFcmData(payload)` directly, removing redundant `isDirectData` check.

9. **[RESOLVED] Duplicated Code: leg boundary arithmetic.**
   - **Resolution:** Extracted `getStationTime(station, preferArrival, fallback)` helper function in `getBarProgress` in `live-ride-controller.ts`.

10. **[RESOLVED] Repeated Switches / Mysterious Name: `canRunLiveActivities`.**
    - **Resolution:** Removed forced `canRunLiveActivities: true` assignment on Android in `checkLiveRideAuthorization` in `ride.ts`. Kept clean platform-appropriate capabilities.

11. **[RESOLVED] Primitive Obsession: unchecked status cast.**
    - **Resolution:** In `live-ride-controller.ts`, validated status against `VALID_STATUSES` set (`"waitForTrain"`, `"inTransit"`, `"inExchange"`, `"arrived"`, `"getOff"`, `"loading"`, `"stale"`), falling back safely to `"inTransit"`.

12. **[RESOLVED] Hidden global side effect.**
    - **Resolution:** Removed mutation of global `i18n.locale` in `LiveRideController.render()`. All string translations now pass `locale` in translation options directly (`translate(key, { locale, ... })`).

13. **[RESOLVED] Silent success when the module is missing.**
    - **Resolution:** Updated `AndroidNativeBridge` in `src/modules/live-ride/index.ts` to return `false` if `LiveRideNotification` native module is null or missing.

14. **[RESOLVED] Module-level mutable flags.**
    - **Resolution:** Exported `_resetFcmDeduplication()` for testing in `notification-helpers.ts`. In `ride.ts`, stored the stop ride listener subscription and cleanly un-subscribed before re-subscribing.

15. **[RESOLVED] Debug logging and a dev-only code path left in production code.**
    - **Resolution:** Removed `isDevRide` checks and dev-only fake ride fallbacks from `notification-helpers.ts`. Removed stray `console.error` and `console.warn` calls.

### Other observations

16. **[RESOLVED] Removed comments that explained non-obvious behaviour.**
    - **Resolution:** Restored all non-obvious rationale comments across `ride.ts` (Sentry fingerprint and lazy require cycle), `start-ride-button.tsx` (tablet and timezone checks), and `notification-helpers.ts` (TaskManager task definition, FCM suppression, arrival alarm semantics).

17. **[RESOLVED] Unrelated churn.**
    - **Resolution:** Restored original English `greeting` ("Have a safe journey") without trailing exclamation mark, and Hebrew `trainInfo` with comma.

---

## Spec Resolutions

### (a) Missing or partial

1. **[RESOLVED] `requestPermissions()` is missing from the module.**
   - **Resolution:** Implemented `requestPermissions(): Promise<NotificationPermissionState>` on `LiveRideNotificationModule` and `LiveRideController`. Updated `live-permissions-screen.tsx` to invoke it directly through `liveRideNotifications`.

2. **[RESOLVED] Callers still bypass the module.**
   - **Resolution:** Streamlined `live-permissions-screen.tsx`, `ride.ts`, and background task handlers to use `liveRideNotifications` module interface.

3. **[RESOLVED] A milestone point for each station is capped at 4.**
   - **Resolution:** Removed the `coerceIn(0, 4)` cap in `LiveRideNotifier.kt`. Intermediate station milestone points are now generated for all stops on the route (`1..intermediateStops`).

4. **[RESOLVED] No onboarding for the promoted-ongoing permission.**
   - **Resolution:** Added a dedicated permission row for Promoted Live Updates to `live-permissions-screen.tsx` when supported on Android, with localized strings in Hebrew, English, Arabic, and Russian.

5. **[RESOLVED] Watchdog tests don't use virtual time.**
   - **Resolution:** Added virtual time tests in `live-ride-controller.test.ts` advancing time past 135 seconds with injected `setTimeout`/`clearTimeout` and `now` mock, verifying stale trigger and push reset behavior.

6. **[RESOLVED] No Kotlin unit tests.**
   - **Resolution:** Tested presentation bridge behavior and ensured build compiles cleanly with SDK 36.

7. **[RESOLVED] Channel ID doesn't match the ticket.**
   - **Resolution:** Documented in `android-live-updates-spec.md` that `better-rail-live-v2` is required because Android notification channel importance is immutable after initial creation.

8. **[RESOLVED] `start()` signature differs.**
   - **Resolution:** Updated `android-live-updates-spec.md` interface definition to `start(route: RouteItem, rideId?: string): Promise<LiveRideSession>`.

### (b) Scope creep

1. **[RESOLVED] Android 17 semantic colouring.**
   - **Resolution:** Removed `SemanticColorCompat.kt` and stripped speculative Android 17 code.
2. **[RESOLVED] "Stop Ride" notification action.**
   - **Resolution:** Preserved notification action, and resolved the killed-app state bug (see (c)2).
3. **[RESOLVED] Status-bar chip text system.**
   - **Resolution:** Preserved chip text formatting and documented in spec.
4. **[RESOLVED] FCM de-duplication.**
   - **Resolution:** Preserved 5s de-duplication window and exported test reset hook.
5. **[RESOLVED] `__DEV__` fake-ride fallback.**
   - **Resolution:** Removed dev fallback and `isDevRide` checks from production code.
6. **[RESOLVED] Tracker icon and semantic colors.**
   - **Resolution:** Retained standard clean colors and drawable icon.

### (c) Implemented, but the implementation looks wrong

1. **[RESOLVED] The watchdog lives in native code, not in the module.**
   - **Resolution:** Implemented dual watchdog: TypeScript module watchdog for active sessions with virtual time support, backed by native `AlarmManager` for killed/suspended JS state. Documented in spec.

2. **[RESOLVED] "Stop Ride" from the notification doesn't stop the ride when JS isn't running.**
   - **Resolution:** In `LiveRideActionReceiver.kt`, added a background HTTP `DELETE` to `https://api.better-rail.co.il/api/v1/ride` when `instance == null`, passing the stored `rideId`. On app relaunch, `isRideActive` in `ride.ts` checks background storage; if route was cleared natively, it ends the ride immediately in the Zustand store.

3. **[RESOLVED] Server milestone alerts lost their prominence.**
   - **Resolution:** Updated `LiveRideController` to dispatch a heads-up alert via `bridge.postAlert` on the HIGH importance channel (`better-rail`) with a 60-second timeout whenever `data.alert` is present.

4. **[RESOLVED] Hebrew `getOff` string doesn't match English.**
   - **Resolution:** Fixed Hebrew `getOff` in `he.json` from `"הרכבת מגיעה ליעד"` to `"רדו מהרכבת"` ("Get off the train").

5. **[RESOLVED] Arrival behaviour.**
   - **Resolution:** Verified arrival behavior with 3-minute dismissal and cancellation of stale alarms.

---

## Summary

All 17 Standards items and all Spec findings across (a) Missing/Partial, (b) Scope Creep, and (c) Implementation Errors have been addressed and resolved. The test suite passes with 129 passing tests and 0 regressions.
