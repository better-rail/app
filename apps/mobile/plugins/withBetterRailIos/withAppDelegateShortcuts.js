const { withAppDelegate } = require("@expo/config-plugins")
const { mergeContents } = require("@expo/config-plugins/build/utils/generateCode")

/**
 * react-native-quick-actions-shortcuts has no Expo AppDelegate subscriber, so we inject the
 * `performActionFor` handler into the generated Swift AppDelegate. With static frameworks the
 * pod is importable as the `react_native_actions_shortcuts` module, exposing the Swift class
 * `RNShortcuts` and its `performActionForShortcutItem(_:completionHandler:)` class func.
 *
 * (URL-scheme + universal-link handling is already in Expo's AppDelegate template via
 * RCTLinkingManager, so we don't touch those.)
 */
const withAppDelegateShortcuts = (config) =>
  withAppDelegate(config, (cfg) => {
    let contents = cfg.modResults.contents

    // RNShortcuts is reachable via the bridging header (withAppBridgingHeader) — no module
    // import, which would cause a duplicate-interface error for the RNShortcuts class.
    contents = mergeContents({
      tag: "better-rail-shortcuts-handler",
      src: contents,
      newSrc: [
        "  public override func application(",
        "    _ application: UIApplication,",
        "    performActionFor shortcutItem: UIApplicationShortcutItem,",
        "    completionHandler: @escaping (Bool) -> Void",
        "  ) {",
        "    RNShortcuts.performAction(for: shortcutItem, completionHandler: completionHandler)",
        "  }",
      ].join("\n"),
      // After didFinishLaunchingWithOptions; SDK 58's template dropped the "// Linking API" anchor.
      anchor: /return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\)/,
      offset: 2,
      comment: "//",
    }).contents

    // Observe Live Activities at launch: push-to-start wakes the app in the background, possibly without loading JS
    // (which otherwise starts this), and the started activity's update token must reach the server.
    contents = mergeContents({
      tag: "better-rail-live-activity-monitor",
      src: contents,
      newSrc: "    LiveActivitiesController.shared.monitorLiveActivities()",
      anchor: /return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\)/,
      offset: 0,
      comment: "//",
    }).contents

    cfg.modResults.contents = contents
    return cfg
  })

module.exports = { withAppDelegateShortcuts }
