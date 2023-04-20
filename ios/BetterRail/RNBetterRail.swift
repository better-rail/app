import Foundation
import Intents
import WidgetKit

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
  
  @available(iOSApplicationExtension 16.2, *)
  @objc func monitorActivities() {
    LiveActivitiesController.shared.monitorLiveActivities()
  }
  
  /// data - A JSON representation of a Route
  @available(iOSApplicationExtension 16.2, *)
  @objc func startActivity(_ routeJSON: String) {
    let decoder = JSONDecoder()
    
    Task {
      do {
        let route = try decoder.decode(Route.self, from: routeJSON.data(using: .utf8)!)
        await LiveActivitiesController.shared.startLiveActivity(route: route)
      } catch {
        print("Error decoding JSON: \(String(describing: error))")
        return
      }
    }
  }
}
