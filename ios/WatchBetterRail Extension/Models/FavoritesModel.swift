
import Foundation

struct FavoriteRoute: Identifiable {
  let id: Int
  let origin: Station
  let destination: Station
}

struct FavoritesModel {
  var routes: [FavoriteRoute] = []
  
  mutating func updateRoutesFromApplicationContext(_ applicationContext: [String: Any]) {
    for (key, value) in applicationContext {
      let originId = key
      if let destinationId = value as? String,
         let originStation = getStationById(originId),
         let destinationStation = getStationById(destinationId) {
          self.routes.append(
            FavoriteRoute(id: Int("\(originId)\(destinationId)")!, origin: originStation, destination: destinationStation)
          )
      } else {
          print("🚨 Couldn't extract application context")
      }
    }

  }
}
