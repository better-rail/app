import Foundation
import WatchConnectivity

struct FavoriteRoute: Identifiable {
  let id: Int
  let origin: Station
  let destination: Station
}

// TO DELETE: Dummy favorites
// let fav = FavoriteRoute(id: 123, origin: stations[0], destination: stations[1])
// let fav2 = FavoriteRoute(id: 321, origin: stations[1], destination: stations[2])

class FavoritesViewModel: NSObject, ObservableObject, WCSessionDelegate {
  var session: WCSession
  @Published var routes: [FavoriteRoute] = []
  
  init(session: WCSession = .default) {
      self.session = session
      super.init()
      session.delegate = self
      session.activate()
      updateApplicationContext()
  }
  
  func updateApplicationContext() {
    print("Current app context: \(session.receivedApplicationContext)")
    let favoriteRoutes = session.receivedApplicationContext
          
    for (key, value) in favoriteRoutes {
      let originId = key
      if let destinationId = value as? String, let originStation = getStationById(originId), let destinationStation = getStationById(destinationId) {
        self.routes.append(
          FavoriteRoute(id: Int("\(originId)\(destinationId)")!, origin: originStation, destination: destinationStation)
        )
      } else {
          print("🚨 Couldn't extract application context")
      }
    }
  }
  
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    print("Received app context \(applicationContext)")
    updateApplicationContext()
  }

  
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {

    }
}

