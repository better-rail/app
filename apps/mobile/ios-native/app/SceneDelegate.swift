internal import ExpoModulesCore
import React
import UIKit

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(
    _ scene: UIScene,
    willConnectTo session: UISceneSession,
    options connectionOptions: UIScene.ConnectionOptions
  ) {
    guard let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory
    else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    self.window = window
    // Expo modules still discover the app's primary window through UIApplicationDelegate.
    appDelegate.window = window

    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions(
        appLaunchOptions: appDelegate.launchOptionsForScene,
        connectionOptions: connectionOptions
      )
    )

    if let shortcutItem = connectionOptions.shortcutItem {
      RNShortcuts.performAction(for: shortcutItem, completionHandler: { _ in })
    }
  }

  func sceneDidBecomeActive(_ scene: UIScene) {
    ExpoAppDelegateSubscriberManager.applicationDidBecomeActive(UIApplication.shared)
  }

  func sceneWillResignActive(_ scene: UIScene) {
    ExpoAppDelegateSubscriberManager.applicationWillResignActive(UIApplication.shared)
  }

  func sceneDidEnterBackground(_ scene: UIScene) {
    ExpoAppDelegateSubscriberManager.applicationDidEnterBackground(UIApplication.shared)
  }

  func sceneWillEnterForeground(_ scene: UIScene) {
    ExpoAppDelegateSubscriberManager.applicationWillEnterForeground(UIApplication.shared)
  }

  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }

    for context in URLContexts {
      _ = appDelegate.application(
        UIApplication.shared,
        open: context.url,
        options: openURLOptions(from: context.options)
      )
    }
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else { return }

    _ = appDelegate.application(
      UIApplication.shared,
      continue: userActivity,
      restorationHandler: { _ in }
    )
  }

  func windowScene(
    _ windowScene: UIWindowScene,
    performActionFor shortcutItem: UIApplicationShortcutItem,
    completionHandler: @escaping (Bool) -> Void
  ) {
    RNShortcuts.performAction(for: shortcutItem, completionHandler: completionHandler)
  }

  private func launchOptions(
    appLaunchOptions: [UIApplication.LaunchOptionsKey: Any]?,
    connectionOptions: UIScene.ConnectionOptions
  ) -> [UIApplication.LaunchOptionsKey: Any]? {
    var launchOptions = appLaunchOptions ?? [:]

    if let urlContext = connectionOptions.urlContexts.first {
      launchOptions[.url] = urlContext.url
      launchOptions[.sourceApplication] = urlContext.options.sourceApplication
      launchOptions[.annotation] = urlContext.options.annotation
    }

    if let userActivity = connectionOptions.userActivities.first {
      launchOptions[.userActivityDictionary] = [
        UIApplication.LaunchOptionsKey.userActivityType.rawValue: userActivity.activityType,
        "UIApplicationLaunchOptionsUserActivityKey": userActivity,
      ]
    }

    return launchOptions.isEmpty ? nil : launchOptions
  }

  private func openURLOptions(
    from options: UIScene.OpenURLOptions
  ) -> [UIApplication.OpenURLOptionsKey: Any] {
    [
      .sourceApplication: options.sourceApplication as Any,
      .annotation: options.annotation as Any,
      .openInPlace: options.openInPlace,
    ]
  }
}
