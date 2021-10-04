import Foundation
import WatchConnectivity

// TO DELETE: Dummy favorites
// let fav = FavoriteRoute(id: 123, origin: stations[0], destination: stations[1])
// let fav2 = FavoriteRoute(id: 321, origin: stations[1], destination: stations[2])

class FavoritesViewModel: NSObject, ObservableObject, WCSessionDelegate {
  @Published private var model = FavoritesModel()
  var session: WCSession
  
  var routes: [FavoriteRoute] {
    return model.routes
  }
  
  init(session: WCSession = .default) {
      self.session = session
      super.init()
      session.delegate = self
      session.activate()
  }
    
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    print("Received app context \(applicationContext)")
    updateFavoriteRoutes(routes: session.receivedApplicationContext)
  }

  
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    print("Current context: \(session.receivedApplicationContext)")
    updateFavoriteRoutes(routes: session.receivedApplicationContext)
  }
  
  func updateFavoriteRoutes(routes: [String: Any]) {
    model.updateRoutes(routes)

  }
}

