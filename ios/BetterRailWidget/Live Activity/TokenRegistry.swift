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
    } else {
      let existingRide = registeredTokens.first(where: { $0.rideId == rideId } )
      
      // check if the Ride Id exists but the token is different
      if (existingRide != nil && existingRide!.token != token) {
        registeredTokens.remove(existingRide!)
        registeredTokens.insert(rideToken)
        return .registeredUpdate
      } else {
        registeredTokens.insert(rideToken)
        return .registeredNew
      }
     }
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
  
  func awaitNewTokenRegistration() async -> RideToken {
    return await withUnsafeContinuation { continuation in
      Task.detached {
        while true {
          let existingTokens = await self.registeredTokens
          try await Task.sleep(nanoseconds: 1_000_000_000) // sleep for 1 second
          
          // check if any new token was registered
          if await self.registeredTokens.subtracting(existingTokens).count > 0 {
            // get the newly registered token and resume the continuation
            if let token = await self.registeredTokens.subtracting(existingTokens).first {
              if (token.rideId != "") {
                continuation.resume(returning: token)
                return
              }
            }
          }
        }
      }
    }
  }
}
