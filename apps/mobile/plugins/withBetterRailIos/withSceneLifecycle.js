const { withAppDelegate, withInfoPlist } = require("@expo/config-plugins")
const { mergeContents } = require("@expo/config-plugins/build/utils/generateCode")

const LEGACY_WINDOW_BOOTSTRAP = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif`

const SCENE_WINDOW_BOOTSTRAP = `#if os(iOS)
    // UI creation happens in SceneDelegate. iOS 27 requires the scene-based lifecycle.
    launchOptionsForScene = launchOptions
#elseif os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif`

const withSceneLifecycle = (config) => {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: "$(PRODUCT_MODULE_NAME).SceneDelegate",
          },
        ],
      },
    }
    return cfg
  })

  return withAppDelegate(config, (cfg) => {
    let contents = cfg.modResults.contents

    contents = mergeContents({
      tag: "better-rail-scene-launch-options",
      src: contents,
      newSrc: "  var launchOptionsForScene: [UIApplication.LaunchOptionsKey: Any]?",
      anchor: /  var window: UIWindow\?/,
      offset: 1,
      comment: "//",
    }).contents

    if (!contents.includes(LEGACY_WINDOW_BOOTSTRAP)) {
      throw new Error("Unable to find Expo's AppDelegate window bootstrap for UIScene migration")
    }

    cfg.modResults.contents = contents.replace(LEGACY_WINDOW_BOOTSTRAP, SCENE_WINDOW_BOOTSTRAP)
    return cfg
  })
}

module.exports = { withSceneLifecycle }
