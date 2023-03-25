import Foundation

/// Used for decoding Israel Railways API properties from PascalCase to camelCase.
struct PascalCaseKey: CodingKey {
  let stringValue: String
  let intValue: Int?

  init(stringValue: String) {
    self.stringValue = stringValue.prefix(1).lowercased() + stringValue.dropFirst()
    intValue = nil
  }

  init(intValue: Int) {
    stringValue = String(intValue)
    self.intValue = intValue
  }
}

// MARK: - RouteResult
struct RouteResult: Decodable {
    let result: DataClass
}

// MARK: - DataClass
struct DataClass: Decodable {
  let travels: [Route]
}

// MARK: - Route
struct Route: Decodable {
    let departureTime: String
    let arrivalTime: String
    let trains: [Train]
    var isExchange: Bool { trains.count > 1 }
}

// MARK: - Train
struct Train: Decodable, Identifiable {
  var id: Int { trainNumber }
  var platform: Int { originPlatform }
  var originStationName: String { getStationNameById(orignStation) }
  var destinationStationName: String { getStationNameById(destinationStation) }
  var formattedDepartureTime: String { formatRouteHour(departureTime) }
  var formattedArrivalTime: String { formatRouteHour(arrivalTime) }
  var stationImage: String? { getStationById(orignStation)?.image }
  var destinationStationImage: String? { getStationById(destinationStation)?.image }

  let trainNumber, orignStation, destinationStation: Int
  let arrivalTime, departureTime: String
  let stopStations: [StopStation]
  let originPlatform, destPlatform: Int
}

// MARK: - StopStation
struct StopStation: Decodable, Identifiable {
  var id: Int { stationId }
  var stationName: String { getStationNameById(stationId)}
  var formattedTime: String { formatRouteHour(arrivalTime) }
  
  let stationId, platform: Int
  let arrivalTime, departureTime: String
}


struct RouteModel {
  func fetchRoute(originId: Int, destinationId: Int, date: Date? = nil, completion: @escaping ([Route]) -> Void) {
      let (routeDate, routeTime) = formatRouteDate(date ?? Date())
      
      let url = URL(string: "https://israelrail.azurefd.net/rjpa-prod/api/v1/timetable/searchTrainLuzForDateTime?fromStation=\(originId)&toStation=\(destinationId)&date=\(routeDate)&hour=\(routeTime)&scheduleType=1&systemType=2&languageId=Hebrew")!
      
      var request = URLRequest(url: url)
      request.addValue("API_KEY_HERE", forHTTPHeaderField: "Ocp-Apim-Subscription-Key")
      
      DispatchQueue.global(qos: .userInitiated).async {
          URLSession.shared.dataTask(with: request) { data, _, _ in
              guard let data = data else {
                  completion([])
                  return
              }
              
              let decoder = JSONDecoder()
              guard let route = try? decoder.decode(RouteResult.self, from: data) else {
                  completion([])
                  return
              }
              
              completion(route.result.travels)
          }.resume()
      }
  }

  func fetchRoute(originId: Int, destinationId: Int, date: Date? = nil) async -> [Route] {
      return await withUnsafeContinuation { continuation in
          fetchRoute(originId: originId, destinationId: destinationId, date: date) { routes in
              continuation.resume(returning: routes)
          }
      }
  }

}
