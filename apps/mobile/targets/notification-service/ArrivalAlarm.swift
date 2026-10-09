//
//  The ride's arrival alarm, compiled into both the app and the notification service extension.
//  Its state lives in the app group so the extension can move the alarm while the app isn't running.
//

import Foundation
import SwiftUI
import AlarmKit

struct ArrivalAlarmState: Codable {
  let rideId: String
  /// Identifies the alarm the rider set; pushes carry it. A new lead time gets a new id.
  let alarmId: UUID
  let title: String
  /// Only shown on iOS 26.0, which still draws its own stop button.
  let stopText: String
  var fireDate: Date
  /// The AlarmKit alarm currently scheduled. Changes on every reschedule.
  var systemAlarmId: UUID? = nil
}

enum ArrivalAlarmStore {
  private static let key = "arrivalAlarm"
  private static var defaults: UserDefaults? { UserDefaults(suiteName: "group.il.co.better-rail") }

  static func load() -> ArrivalAlarmState? {
    guard let data = defaults?.data(forKey: key) else { return nil }
    return try? JSONDecoder().decode(ArrivalAlarmState.self, from: data)
  }

  static func save(_ state: ArrivalAlarmState?) {
    if let state, let data = try? JSONEncoder().encode(state) {
      defaults?.set(data, forKey: key)
    } else {
      defaults?.removeObject(forKey: key)
    }
  }
}

/// The `alarm` object the server adds to a push when the arrival time changed.
struct ArrivalAlarmPush {
  let rideId: String
  let alarmId: UUID
  let fireDate: Date
  /// Replaces the notification body when the alarm couldn't be moved.
  let failedBody: String?

  init?(userInfo: [AnyHashable: Any]) {
    guard let alarm = userInfo["alarm"] as? [String: Any],
          let rideId = alarm["rideId"] as? String,
          let alarmId = (alarm["alarmId"] as? String).flatMap(UUID.init(uuidString:)),
          let fireDate = (alarm["fireDate"] as? NSNumber)?.doubleValue
    else { return nil }

    self.rideId = rideId
    self.alarmId = alarmId
    self.fireDate = Date(timeIntervalSince1970: fireDate)
    self.failedBody = alarm["failedBody"] as? String
  }
}

@available(iOS 26.0, *)
struct ArrivalAlarmMetadata: AlarmMetadata {
  let rideId: String
}

@available(iOS 26.0, *)
enum ArrivalAlarmScheduler {
  /// Schedules the alarm, replacing the current one. A date in the past rings right away, since the rider is already late.
  @discardableResult
  static func schedule(_ state: ArrivalAlarmState) async throws -> ArrivalAlarmState {
    var state = state
    state.fireDate = max(state.fireDate, Date().addingTimeInterval(5))

    let attributes = AlarmAttributes(
      presentation: AlarmPresentation(alert: alert(for: state)),
      metadata: ArrivalAlarmMetadata(rideId: state.rideId),
      tintColor: Color(red: 251 / 255, green: 169 / 255, blue: 40 / 255)
    )

    // Schedule the new alarm before cancelling the current one, so a failure leaves the rider with an alarm.
    let systemAlarmId = UUID()
    _ = try await AlarmManager.shared.schedule(id: systemAlarmId, configuration: .alarm(schedule: .fixed(state.fireDate), attributes: attributes))
    if let current = ArrivalAlarmStore.load()?.systemAlarmId {
      try? AlarmManager.shared.cancel(id: current)
    }

    state.systemAlarmId = systemAlarmId
    ArrivalAlarmStore.save(state)
    return state
  }

  static func cancel() {
    if let systemAlarmId = ArrivalAlarmStore.load()?.systemAlarmId {
      try? AlarmManager.shared.cancel(id: systemAlarmId)
    }
    ArrivalAlarmStore.save(nil)
  }

  /// Whether the alarm is still waiting to ring. A one-shot alarm is removed once it rang and was stopped.
  static func isScheduled(_ state: ArrivalAlarmState) -> Bool {
    guard let systemAlarmId = state.systemAlarmId else { return false }
    return ((try? AlarmManager.shared.alarms) ?? []).contains { $0.id == systemAlarmId && $0.state == .scheduled }
  }

  /// Moves the alarm to the date a push asked for. Returns false when it couldn't.
  static func move(_ push: ArrivalAlarmPush) async -> Bool {
    // The rider turned the alarm off or changed it, so the push is stale.
    guard let state = ArrivalAlarmStore.load(), state.rideId == push.rideId, state.alarmId == push.alarmId else { return true }
    // It already rang, and moving it would ring it again.
    guard isScheduled(state) else { return true }
    guard AlarmManager.shared.authorizationState == .authorized else { return false }

    var moved = state
    moved.fireDate = push.fireDate

    do {
      try await schedule(moved)
      return true
    } catch {
      return false
    }
  }

  // TODO: add an "Open ride" secondary button (train symbol, brand tint, LiveActivityIntent opening the active ride).
  private static func alert(for state: ArrivalAlarmState) -> AlarmPresentation.Alert {
    let title = LocalizedStringResource(stringLiteral: state.title)
    if #available(iOS 26.1, *) {
      return AlarmPresentation.Alert(title: title)
    }

    let stopButton = AlarmButton(text: LocalizedStringResource(stringLiteral: state.stopText), textColor: .white, systemImageName: "stop.circle")
    return AlarmPresentation.Alert(title: title, stopButton: stopButton)
  }
}
