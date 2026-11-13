//
//  TokenRegistry tracks each Live Activity's push token and server ride ID, keyed by activity ID,
//  so a token (or its rotation) is always tied to the activity it belongs to and never starts a second ride.
//

import Foundation

struct ActivityRegistration {
  var token: String?
  /// nil until the server answers the start request.
  var rideId: String?
  /// Set when the server didn't start the ride.
  var failure: RideStartFailure?
}

/// Keeps each registered activity's ride ID and token across launches. ActivityKit hands a relaunched app the
/// activities (and push tokens) of earlier launches, and without these the registry would start a second ride for them.
struct ActivityRegistrationStore {
  private static let key = "liveActivityRegistrations"
  private let defaults: UserDefaults

  init(defaults: UserDefaults = .standard) {
    self.defaults = defaults
  }

  /// Activity ID → registration with both a ride ID and a token.
  func load() -> [String: ActivityRegistration] {
    let stored = defaults.dictionary(forKey: Self.key) as? [String: [String: String]] ?? [:]
    return stored.compactMapValues { entry in
      guard let rideId = entry["rideId"], let token = entry["token"] else { return nil }
      return ActivityRegistration(token: token, rideId: rideId)
    }
  }

  func save(_ registrations: [String: ActivityRegistration]) {
    let stored = registrations.compactMapValues { registration -> [String: String]? in
      guard let rideId = registration.rideId, let token = registration.token else { return nil }
      return ["rideId": rideId, "token": token]
    }
    defaults.set(stored, forKey: Self.key)
  }
}

/// What the server needs after an activity reports a push token.
enum TokenRegistration {
  case startRide
  case updateToken(rideId: String)
  case nothing
}

enum RideRegistrationResult {
  case registered(rideId: String)
  case failed(RideStartFailure)
  case ended
  /// `hadToken` is false when the push token never arrived, and true when the server didn't answer in time.
  case timedOut(hadToken: Bool)
}

actor TokenRegistry {
  private let store: ActivityRegistrationStore
  private var registrations: [String: ActivityRegistration]
  /// Removed activities, so a token that arrives late can't re-register one and start an orphan ride.
  private var endedActivityIds: Set<String> = []

  /// Starts with the rides registered by earlier launches, so their activities' tokens don't start new rides.
  init(store: ActivityRegistrationStore = ActivityRegistrationStore()) {
    self.store = store
    registrations = store.load()
  }

  /// Drops stored rides whose activities are gone. Their `.ended` event may have fired while the app wasn't running.
  func prune(keeping activityIds: Set<String>) {
    registrations = registrations.filter { activityIds.contains($0.key) || $0.value.rideId == nil }
    store.save(registrations)
  }

  /// Called right after requesting an activity, so `awaitRideId` can tell "no token yet" from "ended".
  func track(activityId: String) {
    if registrations[activityId] == nil {
      registrations[activityId] = ActivityRegistration()
    }
  }

  func registerToken(activityId: String, token: String) -> TokenRegistration {
    if endedActivityIds.contains(activityId) { return .nothing }

    var registration = registrations[activityId] ?? ActivityRegistration()
    if registration.token == token { return .nothing }

    let isFirstToken = registration.token == nil
    registration.token = token
    registrations[activityId] = registration

    if isFirstToken { return .startRide }
    // A rotation during the start request is sent once `setRideId` returns the latest token.
    guard let rideId = registration.rideId else { return .nothing }
    store.save(registrations)
    return .updateToken(rideId: rideId)
  }

  /// Stores the server's ride ID and returns the activity's latest token, or nil if the activity ended meanwhile.
  func setRideId(activityId: String, rideId: String) -> String? {
    guard var registration = registrations[activityId] else { return nil }
    registration.rideId = rideId
    registrations[activityId] = registration
    store.save(registrations)
    return registration.token
  }

  func markFailed(activityId: String, failure: RideStartFailure) {
    registrations[activityId]?.failure = failure
  }

  func delete(activityId: String) {
    if registrations.removeValue(forKey: activityId)?.rideId != nil {
      store.save(registrations)
    }
    endedActivityIds.insert(activityId)
  }

  func rideId(activityId: String) -> String? {
    registrations[activityId]?.rideId
  }

  func activityId(rideId: String) -> String? {
    registrations.first(where: { $0.value.rideId == rideId })?.key
  }

  /// False for an activity this registry never saw, e.g. one whose ride never started before the app was relaunched.
  func isKnown(activityId: String) -> Bool {
    registrations[activityId] != nil || endedActivityIds.contains(activityId)
  }

  func awaitRideId(activityId: String, timeout: TimeInterval) async -> RideRegistrationResult {
    let deadline = Date().addingTimeInterval(timeout)

    while true {
      guard let registration = registrations[activityId] else { return .ended }
      if let rideId = registration.rideId { return .registered(rideId: rideId) }
      if let failure = registration.failure { return .failed(failure) }

      // Check and drop in one actor turn, so a ride ID landing later makes `setRideId` return nil and end the server ride.
      if Date() >= deadline {
        delete(activityId: activityId)
        return .timedOut(hadToken: registration.token != nil)
      }

      try? await Task.sleep(nanoseconds: 250_000_000)
    }
  }
}
