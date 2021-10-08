import Foundation

class RouteViewModel: ObservableObject {
  let routeModel = RouteModel()
  let origin: Station
  let destination: Station
  private var lastRequest: Date?
  
  @Published var trains: Array<Route> = []
  @Published var loading = false
  
  init(origin: Station, destination: Station) {
    self.origin = origin
    self.destination = destination
    
    fetchRoute()
  }
  
  private func fetchRoute() {
    self.loading = true
    
    routeModel.fetchRoute(originId: origin.id, destinationId: destination.id, completion: { result in
      DispatchQueue.main.async {
        self.trains = result.data.routes
        self.loading = false
      }
      
      self.lastRequest = Date()
    })
  }
  
  /// Check how if enough time has passed since the last API call, and issue a new request if it did.
  ///
  /// Since the app can stay in memory for long periods, we need check if it's needed to update the schedaule data from time to time.
  func shouldRefetchRoutes(timeSinceLastRequest: Double = 5400) {
    if let lastRequestDate = lastRequest {
      let now = Date()
      if now.timeIntervalSince(lastRequestDate) > timeSinceLastRequest {
        fetchRoute()
      }
    } else {
      fetchRoute()
    }
  }

}
