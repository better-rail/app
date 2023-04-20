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
}

/// keeps track of the activity token registrations, and makes sure we don't register the same token twice
actor TokenRegistry {
  private var registeredTokens: Set<RideToken> = Set()
    
  func registerTokenIfNew(rideId: String, token: String) -> TokenRegistryResponse {
    let rideToken = RideToken(rideId: rideId, token: token)
    
    if registeredTokens.contains(rideToken) {
      return .alreadyExists
    } else {
      registeredTokens.insert(rideToken)

      // check if the Ride Id exists but the token is different
      let existingRide = registeredTokens.first(where: { $0.rideId == rideId } )
      
      if (existingRide != nil && existingRide!.token != token) {
        return .registeredUpdate
      } else {
        return .registeredNew
      }
     }
  }
}
