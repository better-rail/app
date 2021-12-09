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
        completion(INObjectCollection(items: stations), nil)
    }
    
    func provideDestinationOptionsCollection(for intent: RouteIntent, with completion: @escaping (INObjectCollection<INStation>?, Error?) -> Void) {
        completion(INObjectCollection(items: getStationItems()), nil)
    }
    
    func defaultOrigin(for intent: RouteIntent) -> INStation? {
      let defaultRoute = UserDefaults(suiteName: "group.il.co.better-rail")!.array(forKey: "defaultRoute") as? [String]

     if let route = defaultRoute {
        let stationId = route[0]
        let stationName = getStationNameById(stationId)
        return INStation(identifier: stationId, display: stationName)
      }
       
      let defaultStationId = "4600"
      let defaultStationName = getStationNameById(defaultStationId)
      return INStation(identifier: defaultStationId, display: defaultStationName)
    }
    
    func defaultDestination(for intent: RouteIntent) -> INStation? {
      let defaultRoute = UserDefaults(suiteName: "group.il.co.better-rail")!.array(forKey: "defaultRoute") as? [String]

       if let route = defaultRoute {
          let stationId = route[1]
          let stationName = getStationNameById(stationId)
          return INStation(identifier: stationId, display: stationName)
      }

      let defaultStationId = "680"
      let defaultStationName = getStationNameById(defaultStationId)
      return INStation(identifier: defaultStationId, display: defaultStationName)
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
