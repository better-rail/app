import Foundation
import WatchConnectivity

class UserInfo: NSObject, ObservableObject, WCSessionDelegate {
  @Published var isPro: Bool
  @Published private var favoritesModel = FavoritesModel()
  var session: WCSession
  
  var routes: [FavoriteRoute] {
    return favoritesModel.routes
  }
  
  init(session: WCSession = .default) {
    self.isPro = false
    self.session = session
    super.init()
    session.delegate = self
    session.activate()
  }
  
  func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
    updateContext(context: session.receivedApplicationContext)
  }

  
  func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    updateContext(context: session.receivedApplicationContext)
  }
  
  func updateContext(context: [String: Any]) {
    DispatchQueue.main.async {
      if let favorites = context["favorites"] as? [String] {
        self.favoritesModel.updateRoutes(favorites)
      }
      
      if let isPro = context["isPro"] as? Bool {
        self.isPro = isPro
      }
    }
  }
}
