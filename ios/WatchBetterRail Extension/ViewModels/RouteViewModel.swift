import Foundation

class RouteViewModel: ObservableObject {
  var routeModel = RouteModel()
  let origin: Station
  let destination: Station
  private var lastRequest: Date?
  
  @Published var trains: Array<Route> = []
  @Published var loading = false
  @Published var error: Error? = nil
  
  init(origin: Station, destination: Station) {
    self.origin = origin
    self.destination = destination
    
    fetchRoute()
  }
  
  private func fetchRoute() {
    self.loading = true
    self.error = nil

    routeModel.fetchRoute(originId: origin.id, destinationId: destination.id, completion: { result in
      DispatchQueue.main.async {
        switch result {
        case .success(let response):
          self.trains = response.data.routes
            self.loading = false
            self.lastRequest = Date()
         
          case .failure(let error):
            print(error)
            self.error = error
            self.loading = false
        }
      }
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
