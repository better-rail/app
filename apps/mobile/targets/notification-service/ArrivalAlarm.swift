//
//  The ride's arrival alarm, compiled into both the app and the notification service extension.
//  Its state lives in the app group so the extension can move the alarm while the app isn't running.
//
//  The app and the extension can change the alarm at the same time: an arrival-alarm push reaches both,
//  and the rider can turn the alarm off meanwhile. The store is read and saved under a lock both processes
//  share, but scheduling an AlarmKit alarm is async and can't hold it. So a change first claims the ids of
//  the alarms it will schedule (`pending`), schedules them, and saves only if its claim still stands:
//  - The rider's latest schedule or cancel wins (`intent`), so an older schedule that finishes later loses.
//  - A move saves only onto the alarm it read (`revision`), and tries again on top of whatever won.
//  - A claim lapses after a while, so the alarms of a change that died (a killed extension) don't live on.
//  Once a change is saved, every AlarmKit alarm the store doesn't point to or claim is cancelled, including
//  whatever a change that lost left behind.
//

import Foundation
import SwiftUI
import AlarmKit

struct ArrivalAlarmStop: Codable, Equatable {
  /// The train the rider gets off, by its index in the route. Pushes refer to stops by it.
  let train: Int
  let title: String
  var fireDate: Date
  /// The AlarmKit alarm currently scheduled. Changes on every reschedule.
  var systemAlarmId: UUID? = nil
}

struct ArrivalAlarmState: Codable, Equatable {
  let rideId: String
  /// Identifies the alarm the rider set; pushes carry it. A new lead time or new stops get a new id.
  let alarmId: UUID
  /// Only shown on iOS 26.0, which still draws its own stop button.
  let stopText: String
  /// One alarm for each stop the rider gets off: a transfer, the destination, or both
  var stops: [ArrivalAlarmStop]
}

/// An AlarmKit alarm that a schedule or a move claimed and hasn't saved yet.
struct PendingSystemAlarm: Codable, Equatable {
  /// Longer than a notification service extension may run, and than scheduling a few alarms takes.
  static let lifetime: TimeInterval = 2 * 60

  let id: UUID
  /// A schedule's claim stands until the rider sets or turns off the alarm again.
  var intent: Int? = nil
  /// A move's claim stands until the alarm it read changes.
  var revision: Int? = nil
  var claimedAt = Date()

  func stands(in record: ArrivalAlarmRecord, at now: Date) -> Bool {
    (intent.map { $0 == record.intent } ?? true)
      && (revision.map { $0 == record.revision } ?? true)
      && now.timeIntervalSince(claimedAt) < Self.lifetime
  }
}

/// What's stored: the alarm, and what the app and the extension need to not undo each other's changes.
struct ArrivalAlarmRecord: Codable, Equatable {
  var state: ArrivalAlarmState?
  /// Goes up whenever the rider sets or turns off the alarm.
  var intent = 0
  /// Goes up whenever `state` changes.
  var revision = 0
  var pending: [PendingSystemAlarm] = []

  var systemAlarmIds: [UUID] { state?.stops.compactMap(\.systemAlarmId) ?? [] }

  /// Whether every one of `ids` is claimed by a claim that still stands
  func claims(_ ids: [UUID], at now: Date = Date()) -> Bool {
    ids.allSatisfy { id in pending.contains { $0.id == id && $0.stands(in: self, at: now) } }
  }
}

enum ArrivalAlarmStore {
  enum StoreError: Error {
    case unavailable
  }

  private static let suite = "group.il.co.better-rail"
  /// Where builds before the store moved to a file kept the alarm
  private static let legacyKey = "arrivalAlarm"

  private static var directory: URL? {
    FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: suite)
  }

  static func load() -> ArrivalAlarmState? {
    try? update { $0.state }
  }

  /// Reads the record, lets `body` change it, and saves it, while no other process or task can.
  /// Keep `body` short and off AlarmKit: an app suspended while holding a lock in the app group is killed.
  static func update<T>(_ body: (inout ArrivalAlarmRecord) throws -> T) throws -> T {
    guard let directory else { throw StoreError.unavailable }
    let file = directory.appendingPathComponent("arrival-alarm.json")

    // flock is held by this open file, so even two tasks in the same process wait for each other.
    let lock = open(directory.appendingPathComponent("arrival-alarm.lock").path, O_RDWR | O_CREAT | O_CLOEXEC, 0o600)
    guard lock >= 0 else { throw StoreError.unavailable }
    defer { close(lock) }
    while flock(lock, LOCK_EX) != 0 {
      guard errno == EINTR else { throw StoreError.unavailable }
    }

    var record = ArrivalAlarmRecord()
    var migrated = false
    if let stored = try? Data(contentsOf: file) {
      record = (try? JSONDecoder().decode(ArrivalAlarmRecord.self, from: stored)) ?? record
    } else if let legacy = UserDefaults(suiteName: suite)?.data(forKey: legacyKey) {
      record.state = try? JSONDecoder().decode(ArrivalAlarmState.self, from: legacy)
      migrated = true
    }

    let original = record
    let result = try body(&record)

    if record != original || migrated {
      let data = try JSONEncoder().encode(record)
      // The extension runs while the phone is locked.
      try data.write(to: file, options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    }
    if migrated {
      UserDefaults(suiteName: suite)?.removeObject(forKey: legacyKey)
    }
    return result
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

/// What became of a stop's alarm.
enum ArrivalAlarmStopStatus: String {
  /// Waiting to ring
  case scheduled
  /// Ringing, or gone after its time. AlarmKit keeps no history, so that it rang is inferred.
  case rang
  /// Gone without ringing: alarms were turned off in Settings, or it was removed before its time.
  case missed
  /// AlarmKit couldn't say. Ask again later.
  case unknown
}

@available(iOS 26.0, *)
struct ArrivalAlarmMetadata: AlarmMetadata {
  let rideId: String
}

@available(iOS 26.0, *)
enum ArrivalAlarmScheduler {
  enum ScheduleError: Error {
    /// The rider set or turned off the alarm again before this one was saved.
    case superseded
  }

  /// Schedules every stop's alarm, replacing the current alarm. A date in the past rings right away, since the rider is already late.
  @discardableResult
  static func schedule(_ state: ArrivalAlarmState) async throws -> ArrivalAlarmState {
    var state = state
    for index in state.stops.indices {
      state.stops[index].systemAlarmId = UUID()
    }
    let ids = state.stops.compactMap(\.systemAlarmId)

    // A new intent, so this wins over any schedule before it, and loses to any schedule or cancel after.
    try change { record in
      record.intent += 1
      record.pending += ids.map { PendingSystemAlarm(id: $0, intent: record.intent) }
    }

    do {
      state = try await scheduleStops(of: state, trains: Set(state.stops.map(\.train)))
    } catch {
      release(ids)
      throw error
    }

    guard save(state, claiming: ids) else {
      ids.forEach(cancelSystemAlarm)
      throw ScheduleError.superseded
    }
    return state
  }

  static func cancel() {
    let cancelled: Void? = try? change { record in
      record.intent += 1
      record.state = nil
      record.revision += 1
    }
    // Without the store, every alarm goes: the app sets no others.
    if cancelled == nil {
      ((try? AlarmManager.shared.alarms) ?? []).forEach { cancelSystemAlarm($0.id) }
    }
  }

  /// The alarm with what became of each stop's alarm, by train. Also cancels the alarms nothing points to.
  static func current() -> (state: ArrivalAlarmState, statuses: [Int: ArrivalAlarmStopStatus])? {
    for attempt in 1...3 {
      guard let read = try? ArrivalAlarmStore.update({ $0 }) else { return nil }
      let snapshot = Snapshot.take()

      let result: (consistent: Bool, state: ArrivalAlarmState?)? = try? change(seeing: snapshot) { record in
        (record.revision == read.revision, record.state)
      }
      // The cleanup couldn't be saved, but the alarm is still there and its alarms still ring.
      guard let result else { return read.state.map { ($0, statuses(of: $0, in: nil)) } }
      guard let state = result.state else { return nil }
      if result.consistent {
        return (state, statuses(of: state, in: snapshot))
      }
      if attempt == 3 {
        return (state, statuses(of: state, in: nil))
      }
    }
    return nil
  }

  /// Moves the stops that didn't ring yet to the dates a push asked for. Returns false when it couldn't.
  static func move(_ push: ArrivalAlarmPush) async -> Bool {
    // The app and the extension both get the push, so a move that lost tries again on top of the one that won.
    for _ in 0..<3 {
      guard let read = try? ArrivalAlarmStore.update({ $0 }) else { return false }
      let snapshot = Snapshot.take()

      let step: MoveStep
      do {
        step = try change(seeing: snapshot) { record in
          record.revision == read.revision ? plan(push, in: &record, snapshot: snapshot) : .retry
        }
      } catch {
        return false
      }

      switch step {
      case .done: return true
      case .failed: return false
      case .retry: continue
      case let .move(moved, trains, ids):
        let scheduled: ArrivalAlarmState
        do {
          scheduled = try await scheduleStops(of: moved, trains: trains)
        } catch {
          release(ids)
          return false
        }

        if save(scheduled, claiming: ids) { return true }
        ids.forEach(cancelSystemAlarm)
      }
    }
    return false
  }

  /// AlarmKit's alarms, listed outside the store's lock.
  /// A stop's alarm is only cancelled after a save replaced it, so the listing is current for a state whose revision didn't change since.
  private struct Snapshot {
    let isAuthorized: Bool
    /// Nil when AlarmKit couldn't list them
    let alarms: [UUID: Alarm.State]?

    static func take() -> Snapshot {
      Snapshot(
        isAuthorized: AlarmManager.shared.authorizationState == .authorized,
        alarms: (try? AlarmManager.shared.alarms).map { alarms in
          Dictionary(alarms.map { ($0.id, $0.state) }, uniquingKeysWith: { first, _ in first })
        }
      )
    }
  }

  private enum MoveStep {
    case done
    case failed
    /// The store changed since it was read
    case retry
    /// Schedule `trains` of the moved alarm with the ids claimed for them, then save it if the claim still stands.
    case move(ArrivalAlarmState, trains: Set<Int>, ids: [UUID])
  }

  private static func plan(_ push: ArrivalAlarmPush, in record: inout ArrivalAlarmRecord, snapshot: Snapshot) -> MoveStep {
    // The rider turned the alarm off or changed it, so the push is stale.
    guard let state = record.state, state.rideId == push.rideId, state.alarmId == push.alarmId else { return .done }
    guard snapshot.isAuthorized else { return .failed }

    let statuses = statuses(of: state, in: snapshot)
    guard !statuses.values.contains(.unknown) else { return .failed }

    var moved = state
    var trains = Set<Int>()
    for index in moved.stops.indices {
      let stop = moved.stops[index]
      // A stop that already rang stays put, since moving it would ring it again.
      guard statuses[stop.train] == .scheduled, let fireDate = push.fireDates[stop.train], fireDate != stop.fireDate else { continue }
      moved.stops[index].fireDate = fireDate
      moved.stops[index].systemAlarmId = UUID()
      trains.insert(stop.train)
    }
    guard !trains.isEmpty else { return .done }

    let ids = moved.stops.filter { trains.contains($0.train) }.compactMap(\.systemAlarmId)
    record.pending += ids.map { PendingSystemAlarm(id: $0, revision: record.revision) }
    return .move(moved, trains: trains, ids: ids)
  }

  /// `snapshot` nil for when the listing can't be trusted
  private static func statuses(of state: ArrivalAlarmState, in snapshot: Snapshot?, now: Date = Date()) -> [Int: ArrivalAlarmStopStatus] {
    func status(of stop: ArrivalAlarmStop) -> ArrivalAlarmStopStatus {
      guard let snapshot else { return .unknown }
      // Turning alarms off in Settings removes them without ringing.
      guard snapshot.isAuthorized else { return .missed }
      guard let alarms = snapshot.alarms else { return .unknown }

      if let id = stop.systemAlarmId, let alarm = alarms[id] {
        return alarm == .alerting ? .rang : .scheduled
      }
      // A one-shot alarm is removed once it rang and was stopped.
      return stop.systemAlarmId != nil && stop.fireDate <= now ? .rang : .missed
    }

    return Dictionary(state.stops.map { ($0.train, status(of: $0)) }, uniquingKeysWith: { first, _ in first })
  }

  /// Saves the state if the alarms it schedules are still claimed. False when another change won.
  private static func save(_ state: ArrivalAlarmState, claiming ids: [UUID]) -> Bool {
    (try? change { record -> Bool in
      guard record.claims(ids) else { return false }
      record.pending.removeAll { ids.contains($0.id) }
      record.state = state
      record.revision += 1
      return true
    }) ?? false
  }

  /// Gives up the alarms a schedule or a move claimed but couldn't set.
  private static func release(_ ids: [UUID]) {
    _ = try? change { record in
      record.pending.removeAll { ids.contains($0.id) }
    }
  }

  /// Changes the store, then, once it's saved, cancels every alarm it neither points to nor claims: the ones the change
  /// replaced, and any other in `snapshot`, like those of a change that lost. Nothing is cancelled if the save fails.
  /// The snapshot can be older than the change: an id is claimed before its alarm is scheduled, and an id that's
  /// neither stored nor claimed never will be again.
  @discardableResult
  private static func change<T>(seeing snapshot: Snapshot = .take(), _ body: (inout ArrivalAlarmRecord) throws -> T) throws -> T {
    var unreferenced = Set<UUID>()
    let result = try ArrivalAlarmStore.update { record in
      let known = record.systemAlarmIds + record.pending.map(\.id)
      let result = try body(&record)

      let now = Date()
      let changed = record
      record.pending.removeAll { !$0.stands(in: changed, at: now) }
      let listed = snapshot.alarms.map { Array($0.keys) } ?? []
      unreferenced = Set(known + listed).subtracting(record.systemAlarmIds + record.pending.map(\.id))
      return result
    }

    unreferenced.forEach(cancelSystemAlarm)
    return result
  }

  /// Schedules a new AlarmKit alarm for each stop in `trains`, with the id it already has. All or none, so a failure leaves the rider with the current ones.
  private static func scheduleStops(of state: ArrivalAlarmState, trains: Set<Int>) async throws -> ArrivalAlarmState {
    var state = state
    var scheduledIds: [UUID] = []

    do {
      for index in state.stops.indices where trains.contains(state.stops[index].train) {
        var stop = state.stops[index]
        guard let systemAlarmId = stop.systemAlarmId else { continue }
        stop.fireDate = max(stop.fireDate, Date().addingTimeInterval(5))

        let attributes = AlarmAttributes(
          presentation: AlarmPresentation(alert: alert(for: stop, stopText: state.stopText)),
          metadata: ArrivalAlarmMetadata(rideId: state.rideId),
          tintColor: Color(red: 251 / 255, green: 169 / 255, blue: 40 / 255)
        )

        _ = try await AlarmManager.shared.schedule(id: systemAlarmId, configuration: .alarm(schedule: .fixed(stop.fireDate), attributes: attributes))
        scheduledIds.append(systemAlarmId)
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
