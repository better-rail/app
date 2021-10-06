
import Foundation

struct FavoriteRoute: Identifiable {
  let id: Int
  let origin: Station
  let destination: Station
}

let fav = FavoriteRoute(id: 0, origin: stations[0], destination: stations[1])

struct FavoritesModel {
  var routes: [FavoriteRoute] = [fav]
  
  mutating func updateRoutes(_ routes: [String: Any]) {
    
    var favoriteRoutes: [FavoriteRoute] = []
    
    // Data comes formatted as:
    // "1" (index) : "originId:3600,destinationId:3500"
    
    for (key, value) in routes {
      
      // TODO: Extract information using Decodable?
      let route = String(describing: value).split(separator: ",")
      let originId = String(route[0].split(separator: ":")[1])
      let destinationId = String(route[1].split(separator: ":")[1])
      
      if let originStation = getStationById(originId),
         let destinationStation = getStationById(destinationId) {
          favoriteRoutes.append(
            FavoriteRoute(id: Int(key)!, origin: originStation, destination: destinationStation)
          )
      } else {
          print("🚨 Couldn't extract application context")
      }
    }
    
//    self.routes = favoriteRoutes
    self.routes = [fav]
  }
}
