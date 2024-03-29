import Foundation
import WidgetKit

let userDefaults = UserDefaults(suiteName: "group.il.co.better-rail")

struct FavoriteRoute: Identifiable, Hashable, Codable {
  let label: String?
  let origin: Station
  let destination: Station
  
  var id: String {
    origin.id + destination.id
  }
}

#if DEBUG
let fav = FavoriteRoute(label: nil, origin: getStationById(3100)!, destination: getStationById(3600)!)
let fav2 = FavoriteRoute(label: nil, origin: getStationById(3600)!, destination: getStationById(3100)!)
let fav3 = FavoriteRoute(label: nil, origin: stations[33], destination: stations[8])
#endif

struct FavoritesModel {
  private var _routes: [FavoriteRoute]
  var routes: [FavoriteRoute] {
    get {
      return _routes.sorted { $0.id < $1.id }
    }
    set {
      _routes = newValue
      
      if let encodedRoutes = try? JSONEncoder().encode(newValue) {
        userDefaults?.set(encodedRoutes, forKey: "favorites")
        
        if #available(watchOS 10.0, *) {
          WidgetCenter.shared.invalidateConfigurationRecommendations()
        }
      }
    }
  }
  
  init(routes: [FavoriteRoute]) {
    self._routes = routes
  }
  
  mutating func updateRoutes(_ routes: [String: Any]) {
    var favoriteRoutes: [FavoriteRoute] = []
    
    // Data comes formatted as:
    // "1" (index) : "originId:3600,destinationId:3500,label:Home"
    
    for (key, value) in routes {
      // TODO: Extract information using Decodable?
      let route = String(describing: value).split(separator: ",")
      let originId = String(route[0].split(separator: ":")[1])
      let destinationId = String(route[1].split(separator: ":")[1])
      let label = route.count > 2 ? String(route[2].split(separator: ":")[1]) : nil
      
      if let originStation = getStationById(Int(originId)!),
         let destinationStation = getStationById(Int(destinationId)!) {
          favoriteRoutes.append(
            FavoriteRoute(label: label, origin: originStation, destination: destinationStation)
          )
      } else {
          print("🚨 Couldn't extract application context")
      }
    }
    
    #if DEBUG
    self.routes = [fav, fav2, fav3]
    #else
    self.routes = favoriteRoutes
    #endif
  }
  
  static func getRoutesFromUserDefaults() -> [FavoriteRoute] {
    guard let encodedRoutes = userDefaults?.object(forKey: "favorites") as? Data,
          let userDefaultsRoutes = try? JSONDecoder().decode([FavoriteRoute].self, from: encodedRoutes)
    else {
      return []
    }
    
    return userDefaultsRoutes
  }
}
