import UserNotifications

/// Runs for every visible push before it's shown, even when the app was force-quit.
/// Arrival-alarm pushes move the alarm here, since the app may not get to run before it rings.
class NotificationService: UNNotificationServiceExtension {
  private var contentHandler: ((UNNotificationContent) -> Void)?
  private var content: UNMutableNotificationContent?
  private var failedBody: String?

  override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    let content = (request.content.mutableCopy() as? UNMutableNotificationContent) ?? UNMutableNotificationContent()
    self.contentHandler = contentHandler
    self.content = content

    guard #available(iOS 26.0, *), let push = ArrivalAlarmPush(userInfo: request.content.userInfo) else {
      deliver(failed: false)
      return
    }

    failedBody = push.failedBody
    Task {
      let moved = await ArrivalAlarmScheduler.move(push)
      deliver(failed: !moved)
    }
  }

  override func serviceExtensionTimeWillExpire() {
    deliver(failed: true)
  }

  /// Hands the notification over once, whichever of the move or the timeout finishes first.
  private func deliver(failed: Bool) {
    DispatchQueue.main.async { [self] in
      guard let contentHandler, let content else { return }
      self.contentHandler = nil

      if failed, let failedBody {
        content.body = failedBody
      }
      contentHandler(content)
    }
  }
}
