import Foundation
import Intents
import WidgetKit
import ActivityKit

/// A set of common functions to be called from the RN app
@objc(RNBetterRail)
class RNBetterRail: NSObject {
  
  
  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }
  
  // MARK - Widget methods
  /// This saves the current origin & destination station IDs for use as StationIntent initial values.
  @objc func saveCurrentRoute(_ originId: String, destinationId: String) {
    let currentRoute = [originId, destinationId]
    
    UserDefaults(suiteName: "group.il.co.better-rail")!.set(currentRoute, forKey: "defaultRoute")
  }
  
  @objc func donateRouteIntent(_ originId: String, destinationId: String) {
    let intent = RouteIntent()
    
    let originStation = getStationById(Int(originId)!)!
    let destinationStation = getStationById(Int(destinationId)!)!
    
    intent.origin = INStation(identifier: originId, display: originStation.name)
    intent.destination = INStation(identifier: destinationId, display: destinationStation.name)
    
    let interaction = INInteraction(intent: intent, response: nil)
    interaction.donate { error in
      if let error = error {
        print("Unable to donate INInteraction: \(error)")
      }
    }
  }
  
  @objc func reloadAllTimelines() -> Void {
    if #available(iOS 14.0, *) {
      WidgetCenter.shared.reloadAllTimelines()
    }
  }
  
  // MARK - Live Activities methods
    @objc func monitorActivities() {
    LiveActivitiesController.shared.monitorLiveActivities()
  }
  
  /// data - A JSON representation of a Route
  @objc func startActivity(_ routeJSON: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    let decoder = JSONDecoder()

    do {
      let route = try decoder.decode(Route.self, from: routeJSON.data(using: .utf8)!)
      Task {
        await LiveActivitiesController.shared.startLiveActivity(route: route)

        // wait for the token to have it's ride Id assigned
        let newToken = await LiveActivitiesController.tokenRegistry.awaitNewTokenRegistration()
        
        // handle an errored ride
        if (newToken.rideId == "ERROR") {
          let errorDomain = "live-activity"
          let errorCode = 1001
          let errorUserInfo: [String: Any] = [
              NSLocalizedDescriptionKey: "Live Activity Server failed to start a new live activity.",
          ]
    
          // Create the NSError object
          let error = NSError(domain: errorDomain, code: errorCode, userInfo: errorUserInfo)
    
          await LiveActivitiesController.tokenRegistry.deleteRideToken(rideId: "ERROR")
          reject("error", "An error occurred while starting activity from RN", error)
        } else {
          resolve(newToken.rideId)
        }
      }
    } catch {
      print("Error decoding JSON: \(String(describing: error))")
      reject("error", "An error occurred while starting activity from RN", error)
    }
  }
  
  
  @objc func endActivity(_ rideId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    Task {
      // delete the activity on the device
      let rideEndResult = await LiveActivitiesController.shared.endLiveActivity(rideId: rideId)
      // delete the activity on the server
      
      if (rideEndResult == .deleted) {
        resolve(true)
        
        Task {
          try await ActivityNotificationsAPI.endRide(rideId: rideId)
        }
      } else {
        resolve(false)
      }
    }
  }
  
  @objc func isRideActive(_ rideId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    Task {
      let tokens = await LiveActivitiesController.tokenRegistry.getTokens()
      let jsonArray = tokens.map { (rideToken) -> [String: String] in
        return ["rideId": rideToken.rideId, "token": rideToken.token]
      }
      
      do {
          let jsonData = try JSONSerialization.data(withJSONObject: jsonArray, options: .prettyPrinted)
          if let jsonString = String(data: jsonData, encoding: .utf8) {
              resolve(jsonString)
          }
      } catch {
        print(error.localizedDescription)
          reject("error", "error", error)
      }
    }
  }

  @objc func activityAuthorizationInfo(_ emptyString: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    let info = ActivityAuthorizationInfo()
    resolve([
      "areActivitiesEnabled": info.areActivitiesEnabled,
      "frequentPushesEnabled": info.frequentPushesEnabled
    ])
  }
  
  @available(iOS 14.0, *)
  @objc func isRunningOnMac(_ resolve: RCTPromiseResolveBlock, rejecter reject: RCTPromiseRejectBlock) -> Void {
    if ProcessInfo.processInfo.isiOSAppOnMac {
      resolve(true)
    } else {
      resolve(false)
    }
  }
}
