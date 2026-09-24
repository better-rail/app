//
//  TokenRegistry keep tracks of the current ride Ids and their activity tokens
//  It makes sure we don't register new rides if they already exist, and whether we shuold update
//  a token for a ride in the API if the token has changed over the course of an activity.
//

import Foundation

struct RideToken: Hashable {
  let rideId: String
  let token: String
}

enum TokenRegistryResponse {
  case registeredNew
  case registeredUpdate
  case alreadyExists
  case deleted
  case failed
}

/// keeps track of the activity token registrations, and makes sure we don't register the same token twice
actor TokenRegistry {
  private var registeredTokens: Set<RideToken> = Set()
    
  func registerTokenIfNew(rideId: String, token: String) -> TokenRegistryResponse {
    let rideToken = RideToken(rideId: rideId, token: token)

    if registeredTokens.contains(rideToken) {
      return .alreadyExists
    }

    // A registered ride whose token rotated: swap the token instead of starting a second ride.
    if !rideId.isEmpty, let existingRide = registeredTokens.first(where: { $0.rideId == rideId }) {
      registeredTokens.remove(existingRide)
      registeredTokens.insert(rideToken)
      return .registeredUpdate
    }

    registeredTokens.insert(rideToken)
    return .registeredNew
  }
  
  func updateRideId(rideId: String, token: String) -> TokenRegistryResponse {

    if let existingRide = registeredTokens.first(where: { $0.token == token } ) {
      registeredTokens.remove(existingRide)
      let updatedToken = RideToken(rideId: rideId, token: token)
      registeredTokens.insert(updatedToken)
      return .registeredUpdate
    }
    
    return .failed
  }
  
  func deleteRideToken(rideId: String) -> TokenRegistryResponse {
    if let rideToken = registeredTokens.first(where: { $0.rideId == rideId } ) {
      registeredTokens.remove(rideToken)
      return .deleted
    }
    
    return .failed
  }
  
  func getTokens() -> Set<RideToken> {
    return registeredTokens
  }
  
  /// Waits for a token that isn't in `baseline` to get a ride ID (or "ERROR").
  /// Diffing against a fixed baseline means a registration can't slip between polls.
  func awaitNewTokenRegistration(since baseline: Set<RideToken>) async -> RideToken {
    while true {
      if let token = registeredTokens.subtracting(baseline).first(where: { !$0.rideId.isEmpty }) {
        return token
      }
      try? await Task.sleep(nanoseconds: 500_000_000)
    }
  }
}
