const { withAppDelegate } = require("@expo/config-plugins")
const { mergeContents } = require("@expo/config-plugins/build/utils/generateCode")

/**
 * react-native-quick-actions-shortcuts has no Expo AppDelegate subscriber, so we inject the
 * `performActionFor` handler into the generated Swift AppDelegate. With static frameworks the
 * pod is importable as the `react_native_actions_shortcuts` module, exposing the Swift class
 * `RNShortcuts` and its `performActionForShortcutItem(_:completionHandler:)` class func.
 *
 * Under the scene-based life cycle (SDK 58 template, required by the iOS 27 SDK) UIKit delivers
 * quick actions to the scene delegate; Expo's ExpoAppSceneDelegate forwards them back to this
 * AppDelegate override, so the handler stays here. The template no longer has a "Linking API"
 * section, so anchor on the end of didFinishLaunchingWithOptions instead (present in both the
 * SDK 57 and SDK 58 templates).
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
      // Insert right after the closing brace of didFinishLaunchingWithOptions:
      // offset 0 = the `return super.application(...)` line, 1 = `  }`, 2 = after it.
      anchor: /return super\.application\(application, didFinishLaunchingWithOptions: launchOptions\)/,
      offset: 2,
      comment: "//",
    }).contents

    cfg.modResults.contents = contents
    return cfg
  })

module.exports = { withAppDelegateShortcuts }
