import Foundation

class RouteViewModel: ObservableObject {
  let routeModel = RouteModel()
  let origin: Station
  let destination: Station
  @Published var trains: Array<Route> = []
  @Published var loading = false
  
  init(origin: Station, destination: Station) {
    self.origin = origin
    self.destination = destination
    self.loading = true

    routeModel.fetchRoute(originId: origin.id, destinationId: destination.id, completion: {
      result in self.trains = result.data.routes
      self.loading = false
    })
  }

}
