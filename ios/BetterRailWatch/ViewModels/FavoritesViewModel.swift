import Foundation
import WatchConnectivity

class FavoritesViewModel: NSObject, ObservableObject, WCSessionDelegate {
  @Published private var model: FavoritesModel
  var session: WCSession
  
  var routes: [FavoriteRoute] {
    return model.routes
  }
  
  init(session: WCSession = .default) {
    self.session = session
    self.model = FavoritesModel(routes: FavoritesModel.getRoutesFromUserDefaults())
    super.init()
    session.delegate = self
    session.activate()
  }
  
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    updateFavoriteRoutes(routes: session.receivedApplicationContext)
  }

  
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    updateFavoriteRoutes(routes: session.receivedApplicationContext)
  }
  
  func updateFavoriteRoutes(routes: [String: Any]) {
    DispatchQueue.main.async {
      self.model.updateRoutes(routes)
    }
  }
}

