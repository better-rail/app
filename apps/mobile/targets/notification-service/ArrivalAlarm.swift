//
//  The ride's arrival alarm, compiled into both the app and the notification service extension.
//  Its state lives in the app group so the extension can move the alarm while the app isn't running.
//

import Foundation
import SwiftUI
import AlarmKit

struct ArrivalAlarmStop: Codable {
  /// The train the rider gets off, by its index in the route. Pushes refer to stops by it.
  let train: Int
  let title: String
  var fireDate: Date
  /// The AlarmKit alarm currently scheduled. Changes on every reschedule.
  var systemAlarmId: UUID? = nil
}

struct ArrivalAlarmState: Codable {
  let rideId: String
  /// Identifies the alarm the rider set; pushes carry it. A new lead time or new stops get a new id.
  let alarmId: UUID
  /// Only shown on iOS 26.0, which still draws its own stop button.
  let stopText: String
  /// One alarm for each stop the rider gets off: a transfer, the destination, or both
  var stops: [ArrivalAlarmStop]
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
  /// Where each stop's alarm moves to, by train
  let fireDates: [Int: Date]
  /// Replaces the notification body when the alarm couldn't be moved.
  let failedBody: String?

  init?(userInfo: [AnyHashable: Any]) {
    guard let alarm = userInfo["alarm"] as? [String: Any],
          let rideId = alarm["rideId"] as? String,
          let alarmId = (alarm["alarmId"] as? String).flatMap(UUID.init(uuidString:)),
          let stops = alarm["stops"] as? [[String: Any]]
    else { return nil }

    let fireDates = stops.compactMap { stop -> (Int, Date)? in
      guard let train = (stop["train"] as? NSNumber)?.intValue,
            let fireDate = (stop["fireDate"] as? NSNumber)?.doubleValue
      else { return nil }
      return (train, Date(timeIntervalSince1970: fireDate))
    }

    self.rideId = rideId
    self.alarmId = alarmId
    self.fireDates = Dictionary(fireDates, uniquingKeysWith: { _, last in last })
    self.failedBody = alarm["failedBody"] as? String
  }
}

@available(iOS 26.0, *)
struct ArrivalAlarmMetadata: AlarmMetadata {
  let rideId: String
}

@available(iOS 26.0, *)
enum ArrivalAlarmScheduler {
  /// Schedules every stop's alarm, replacing the current alarm. A date in the past rings right away, since the rider is already late.
  @discardableResult
  static func schedule(_ state: ArrivalAlarmState) async throws -> ArrivalAlarmState {
    let current = ArrivalAlarmStore.load()
    let scheduled = try await scheduleStops(of: state) { _ in true }
    current?.stops.compactMap(\.systemAlarmId).forEach(cancelSystemAlarm)

    ArrivalAlarmStore.save(scheduled)
    return scheduled
  }

  static func cancel() {
    ArrivalAlarmStore.load()?.stops.compactMap(\.systemAlarmId).forEach(cancelSystemAlarm)
    ArrivalAlarmStore.save(nil)
  }

  /// Whether the stop's alarm is still waiting to ring. A one-shot alarm is removed once it rang and was stopped.
  static func isScheduled(_ stop: ArrivalAlarmStop) -> Bool {
    guard let systemAlarmId = stop.systemAlarmId else { return false }
    return ((try? AlarmManager.shared.alarms) ?? []).contains { $0.id == systemAlarmId && $0.state == .scheduled }
  }

  /// Moves the stops that didn't ring yet to the dates a push asked for. Returns false when it couldn't.
  static func move(_ push: ArrivalAlarmPush) async -> Bool {
    // The rider turned the alarm off or changed it, so the push is stale.
    guard let state = ArrivalAlarmStore.load(), state.rideId == push.rideId, state.alarmId == push.alarmId else { return true }
    // A stop that already rang stays put, since moving it would ring it again.
    let pending = Set(state.stops.filter(isScheduled).map(\.train))
    guard !pending.isEmpty else { return true }
    guard AlarmManager.shared.authorizationState == .authorized else { return false }

    var moved = state
    for index in moved.stops.indices {
      if pending.contains(moved.stops[index].train), let fireDate = push.fireDates[moved.stops[index].train] {
        moved.stops[index].fireDate = fireDate
      }
    }

    do {
      let scheduled = try await scheduleStops(of: moved) { pending.contains($0.train) }
      state.stops.filter { pending.contains($0.train) }.compactMap(\.systemAlarmId).forEach(cancelSystemAlarm)
      ArrivalAlarmStore.save(scheduled)
      return true
    } catch {
      return false
    }
  }

  /// Schedules a new AlarmKit alarm for each matching stop. All or none, so a failure leaves the rider with the current ones.
  private static func scheduleStops(
    of state: ArrivalAlarmState,
    where shouldSchedule: (ArrivalAlarmStop) -> Bool
  ) async throws -> ArrivalAlarmState {
    var state = state
    var scheduledIds: [UUID] = []

    do {
      for index in state.stops.indices where shouldSchedule(state.stops[index]) {
        var stop = state.stops[index]
        stop.fireDate = max(stop.fireDate, Date().addingTimeInterval(5))

        let attributes = AlarmAttributes(
          presentation: AlarmPresentation(alert: alert(for: stop, stopText: state.stopText)),
          metadata: ArrivalAlarmMetadata(rideId: state.rideId),
          tintColor: Color(red: 251 / 255, green: 169 / 255, blue: 40 / 255)
        )

        let systemAlarmId = UUID()
        _ = try await AlarmManager.shared.schedule(id: systemAlarmId, configuration: .alarm(schedule: .fixed(stop.fireDate), attributes: attributes))
        scheduledIds.append(systemAlarmId)

        stop.systemAlarmId = systemAlarmId
        state.stops[index] = stop
      }
    } catch {
      scheduledIds.forEach(cancelSystemAlarm)
      throw error
    }

    return state
  }

  private static func cancelSystemAlarm(_ id: UUID) {
    try? AlarmManager.shared.cancel(id: id)
  }

  // TODO: add an "Open ride" secondary button (train symbol, brand tint, LiveActivityIntent opening the active ride).
  private static func alert(for stop: ArrivalAlarmStop, stopText: String) -> AlarmPresentation.Alert {
    let title = LocalizedStringResource(stringLiteral: stop.title)
    if #available(iOS 26.1, *) {
      return AlarmPresentation.Alert(title: title)
    }

    let stopButton = AlarmButton(text: LocalizedStringResource(stringLiteral: stopText), textColor: .white, systemImageName: "stop.circle")
    return AlarmPresentation.Alert(title: title, stopButton: stopButton)
  }
}
