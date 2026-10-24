import UIKit

/// Registers for remote notifications so a real APNs push can reach the notification service extension.
/// The token is shown in the Arrival alarm section.
final class PushTokenDelegate: NSObject, UIApplicationDelegate {
  func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
    application.registerForRemoteNotifications()
    return true
  }

  func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    UserDefaults.standard.set(deviceToken.map { String(format: "%02x", $0) }.joined(), forKey: "pushToken")
  }

  func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
    UserDefaults.standard.set("Failed: \(error.localizedDescription)", forKey: "pushToken")
  }
}
