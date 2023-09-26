import Foundation
import WidgetKit

let userDefaults = UserDefaults(suiteName: "group.il.co.better-rail")

struct FavoriteRoute: Identifiable, Hashable, Codable {
  let id: Int
  let label: String?
  let origin: Station
  let destination: Station
}

//#if DEBUG
//let fav = FavoriteRoute(id: 0, origin: stations[21], destination: stations[65])
//let fav2 = FavoriteRoute(id: 1, origin: stations[65], destination: stations[8])
//#endif

struct FavoritesModel {
  var routes: [FavoriteRoute]
  
  init(routes: [FavoriteRoute]) {
    self.routes = routes
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
            FavoriteRoute(id: Int(key)!, label: label, origin: originStation, destination: destinationStation)
          )
      } else {
          print("🚨 Couldn't extract application context")
      }
    }
    
    self.routes = favoriteRoutes.sorted { $0.id < $1.id }
//    #if DEBUG
//    self.routes = [fav, fav2].sorted { $0.id < $1.id }
//    #endif
    
    if let encodedRoutes = try? JSONEncoder().encode(self.routes) {
      userDefaults?.set(encodedRoutes, forKey: "favorites")
      userDefaults?.synchronize()
      
      if #available(watchOSApplicationExtension 10.0, *) {
        WidgetCenter.shared.invalidateConfigurationRecommendations()
      }
    }
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
