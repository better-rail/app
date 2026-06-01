import Foundation

class RouteViewModel: ObservableObject {
  var routeModel = RouteModel()
  let origin: Station
  let destination: Station
  private var lastRequest: Date?
  private var date: Date?
  
  @Published var trains: Array<Route> = [] {
    didSet {
      self.nextTrain = getNextTrain()
    }
  }
  @Published var loading = false
  @Published var error: Error? = nil
  @Published var nextTrain: Route? = nil
  
  init(origin: Station, destination: Station, date: Date? = nil) {
    self.origin = origin
    self.destination = destination
    
    fetchRoute()
  }
  
  private func fetchRoute(overrideIfError: Bool = true) {
    self.loading = true

    Task {
      async let todayRoutes = routeModel.fetchRoute(originId: origin.id, destinationId: destination.id, date: date ?? .now)
      
      let tomorrow = Calendar.current.date(byAdding: .day, value: 1, to: date ?? .now)!
      
      async let tomorrowRoutes = routeModel.fetchRoute(originId: origin.id, destinationId: destination.id, date: tomorrow)
      
      let results = (today: await todayRoutes, tomorrow: await tomorrowRoutes)
      
      DispatchQueue.main.async {
        self.loading = false
        if (results.today.status == .failed || results.tomorrow.status == .failed) && overrideIfError {
          self.error = results.today.error
        }
        
        if results.today.status == .success, results.tomorrow.status == .success {
          self.error = nil
          self.lastRequest = Date()
          
          self.trains = (
            (results.today.routes ?? []) +
            (results.tomorrow.routes ?? [])
          ).uniq(by: \.id)
        }
      }
    }
  }
  
  /// Check how if enough time has passed since the last API call, and issue a new request if it did.
  ///
  /// Since the app can stay in memory for long periods, we need check if it's needed to update the schedule data from time to time.
  func shouldRefetchRoutes(timeSinceLastRequest: Double = 30) {
    if let lastRequestDate = lastRequest {
      let now = Date()
      if error != nil || now.timeIntervalSince(lastRequestDate) > timeSinceLastRequest {
        fetchRoute(overrideIfError: false)
      }
    } else {
      fetchRoute(overrideIfError: false)
    }
  }
  
  func refreshNextTrainState() {
    self.nextTrain = getNextTrain()
    
    if self.loading {
      return
    }
    
    self.trains = self.trains
    self.shouldRefetchRoutes()
  }
  
  // Filter routes to show today's routes only — except those who are on the next day within 12am - 2am.
  private func filterRoute(route: Route) -> Bool {
    let departureDate = isoDateStringToDate(route.departureTime)
    let isToday = departureDate.hasSame(.day, as: date ?? .now)
    let isTomorrow = departureDate.addingTimeInterval(24 * 60 * 60).hasSame(.day, as: date ?? .now)
    
    if isToday {
      return true
    }
    
    if isTomorrow {
      let hour = Calendar.current.component(.hour, from: departureDate)
      return hour >= 0 && hour < 2
    }
    
    return false
  }
  
  private func getNextTrain() -> Route? {
    return self.trains.first {
      isoDateStringToDate($0.departureTime).addMinutes($0.delay + 1) >= Date.now
    }
  }
}

extension Date {
  func distance(from date: Date, only component: Calendar.Component, calendar: Calendar = .current) -> Int {
    let days1 = calendar.component(component, from: self)
    let days2 = calendar.component(component, from: date)
    return days1 - days2
  }
  
  func hasSame(_ component: Calendar.Component, as date: Date) -> Bool {
    distance(from: date, only: component) == 0
  }
}
