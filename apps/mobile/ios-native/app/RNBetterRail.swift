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
        let controller = LiveActivitiesController.shared
        let activityId: String

        do {
          activityId = try await controller.startLiveActivity(route: route)
        } catch {
          reject("error", "An error occurred while starting activity from RN", error)
          return
        }

        let result = await LiveActivitiesController.tokenRegistry.awaitRideId(activityId: activityId, timeout: LiveActivitiesController.rideStartTimeout)
        if case .registered(let rideId) = result {
          resolve(rideId)
          return
        }

        // The server won't be pushing updates to it, so don't leave the activity on screen.
        await controller.endLiveActivity(activityId: activityId)

        let (code, description): (Int, String) = switch result {
          case .failed: (1001, "Live Activity Server failed to start a new live activity.")
          case .ended: (1003, "The live activity ended before its ride started.")
          default: (1004, "Timed out waiting for the live activity push token or ride ID.")
        }
        let error = NSError(domain: "live-activity", code: code, userInfo: [NSLocalizedDescriptionKey: description])
        reject("error", "An error occurred while starting activity from RN", error)
      }
    } catch {
      print("Error decoding JSON: \(String(describing: error))")
      reject("error", "An error occurred while starting activity from RN", error)
    }
  }
  
  
  @objc func endActivity(_ rideId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    Task {
      // delete the activity on the device
      await LiveActivitiesController.shared.endLiveActivity(rideId: rideId)
      resolve(true)

      // End it on the server even if this session didn't register it (e.g. the app was relaunched mid-ride).
      _ = try? await ActivityNotificationsAPI.endRide(rideId: rideId)
    }
  }
  
  @objc func isRideActive(_ rideId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    // Use ActivityKit's API to get running activities instead of in-memory TokenRegistry.
    // This works even after app restart since ActivityKit maintains the activity state.
    let runningActivities = Activity<BetterRailActivityAttributes>.activities

    let jsonArray = runningActivities.map { activity -> [String: String] in
      let tokenString: String
      if let token = activity.pushToken {
        tokenString = token.map { String(format: "%02x", $0) }.joined()
      } else {
        tokenString = ""
      }

      return ["rideId": activity.id, "token": tokenString]
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

  @objc func getInstalledWidgets(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) -> Void {
    WidgetCenter.shared.getCurrentConfigurations { result in
      switch result {
      case .success(let widgets):
        var families: [String] = []
        for widget in widgets {
          switch widget.family {
          case .systemSmall:
            families.append("small")
          case .systemMedium:
            families.append("medium")
          case .systemLarge:
            families.append("large")
          case .accessoryCircular:
            families.append("accessoryCircular")
          case .accessoryInline:
            families.append("accessoryInline")
          case .accessoryRectangular:
            families.append("accessoryRectangular")
          default:
            if #available(iOS 27.0, *), widget.family == .systemExtraLargePortrait {
              families.append("extraLargePortrait")
            } else {
              families.append("unknown")
            }
          }
        }
        resolve(families)
      case .failure(let error):
        reject("error", "Failed to get widget configurations", error)
      }
    }
  }
}
