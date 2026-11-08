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
  private var registrations: [String: ActivityRegistration] = [:]
  /// Removed activities, so a token that arrives late can't re-register one and start an orphan ride.
  private var endedActivityIds: Set<String> = []

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
    return .updateToken(rideId: rideId)
  }

  /// Stores the server's ride ID and returns the activity's latest token, or nil if the activity ended meanwhile.
  func setRideId(activityId: String, rideId: String) -> String? {
    guard var registration = registrations[activityId] else { return nil }
    registration.rideId = rideId
    registrations[activityId] = registration
    return registration.token
  }

  func markFailed(activityId: String, failure: RideStartFailure) {
    registrations[activityId]?.failure = failure
  }

  func delete(activityId: String) {
    registrations.removeValue(forKey: activityId)
    endedActivityIds.insert(activityId)
  }

  func activityId(rideId: String) -> String? {
    registrations.first(where: { $0.value.rideId == rideId })?.key
  }

  /// False for an activity requested before the app was relaunched, which this registry never saw.
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
