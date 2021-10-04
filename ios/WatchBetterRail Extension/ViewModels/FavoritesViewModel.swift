import Foundation

struct FavoriteRoute: Identifiable {
  let id: Int
  let origin: Station
  let destination: Station
}

let fav = FavoriteRoute(id: 123, origin: stations[0], destination: stations[1])
let fav2 = FavoriteRoute(id: 321, origin: stations[1], destination: stations[2])

class FavoritesViewModel: NSObject, ObservableObject {
  var routes: [FavoriteRoute] = [fav, fav2]
  
  override init() {
    print(stations[0])
  }
}
