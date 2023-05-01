import Foundation

class RouteViewModel: ObservableObject {
  var routeModel = RouteModel()
  let origin: Station
  let destination: Station
  private var lastRequest: Date?
  
  @Published var trains: Array<Route> = []
  @Published var loading = false
  @Published var error: Error? = nil
  @Published var closestIndexToDate: Int?
  
  init(origin: Station, destination: Station) {
    self.origin = origin
    self.destination = destination
    
    fetchRoute()
  }
  
  private func fetchRoute() {
    self.loading = true
    self.error = nil

    Task {
      routeModel.fetchRoute(originId: Int(origin.id)!, destinationId: Int(destination.id)!, completion: { routes in
        DispatchQueue.main.async {
          self.trains = routes
          self.loading = false
          self.lastRequest = Date()
          self.closestIndexToDate = self.getClosestIndexToDate()
        }

      })
    }
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
  
  private func getClosestIndexToDate() -> Int {
    let targetDate = Date()
    let dates = self.trains.map { route in
      return isoDateStringToDate(route.departureTime)
    }
    
    var closestIndex = -1
    var minimumDateDelta = Double.infinity

    for (index, date) in dates.enumerated() {
        let currentDateDelta = abs(targetDate.timeIntervalSince(date))
        if currentDateDelta < minimumDateDelta {
            minimumDateDelta = currentDateDelta
            closestIndex = index
        }
    }
    
    return closestIndex
  }
}
