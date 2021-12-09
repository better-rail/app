import Foundation
import Intents

class IntentHandler: INExtension, RouteIntentHandling {
    // - TODO: Move to static property
    /// Returns the station items formatted in the intent Station type
    func getStationItems() -> [INStation] {
      return stations.sorted(by: { $0.name < $1.name }).map({ INStation(identifier: $0.id, display: $0.name )})
    }
    
    func provideOriginOptionsCollection(for intent: RouteIntent, with completion: @escaping (INObjectCollection<INStation>?, Error?) -> Void) {
        let stations = getStationItems()
      print("stations", stations)
        completion(INObjectCollection(items: stations), nil)
    }
    
    func provideDestinationOptionsCollection(for intent: RouteIntent, with completion: @escaping (INObjectCollection<INStation>?, Error?) -> Void) {
        completion(INObjectCollection(items: getStationItems()), nil)
    }
    
    func defaultOrigin(for intent: RouteIntent) -> INStation? {
      let defaultRoute = UserDefaults(suiteName: "group.guytepper.WidgetApp")!.array(forKey: "defaultRoute") as? [String]

     if let route = defaultRoute {
        let stationId = route[0]
        let stationName = getStationNameById(stationId)
        return INStation(identifier: stationId, display: stationName)
      }
      
        return INStation(identifier: "4600", display: "Tel Aviv - HaShalom")
    }
    
    // - TODO: Set currently selected user route from the app
    func defaultDestination(for intent: RouteIntent) -> INStation? {
        return INStation(identifier: "680", display: "Jerusalem - Yitzhak Navon")
    }
    
    func resolveRouteIntent(parameter: INStation?) -> INStationResolutionResult {
        var result: INStationResolutionResult

        if let station = parameter {
            result = INStationResolutionResult.success(with: station)
        } else  {
            result = INStationResolutionResult.needsValue()
        }
        
        return result
    }
    
    func resolveOrigin(for intent: RouteIntent, with completion: @escaping (INStationResolutionResult) -> Void) {
        let result = resolveRouteIntent(parameter: intent.origin)
        completion(result)
    }
    
    func resolveDestination(for intent: RouteIntent, with completion: @escaping (INStationResolutionResult) -> Void) {
        let result = resolveRouteIntent(parameter: intent.destination)
        completion(result)
    }
  }
