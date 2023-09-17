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
struct Route: Decodable, Encodable {
    let departureTime: String
    let arrivalTime: String
    let trains: [Train]
    var isExchange: Bool { trains.count > 1 }
    var delay: Int { trains.first?.delay ?? 0 }
}

// MARK: - Train
struct Train: Decodable, Identifiable, Encodable {
  var id: Int { trainNumber }
  var platform: Int { originPlatform }
  var originStationName: String { getStationNameById(orignStation) }
  var destinationStationName: String { getStationNameById(destinationStation) }
  var formattedDepartureTime: String { formatRouteHour(departureTime) }
  var formattedArrivalTime: String { formatRouteHour(arrivalTime) }
  var stationImage: String? { getStationById(orignStation)?.image }
  var destinationStationImage: String? { getStationById(destinationStation)?.image }

  var delay: Int { trainPosition?.calcDiffMinutes ?? 0 }
  let trainNumber, orignStation, destinationStation: Int
  let arrivalTime, departureTime: String
  let stopStations: [StopStation]
  let routeStations: [RouteStation]
  let originPlatform, destPlatform: Int
  let trainPosition: TrainPosition?
}

// MARK: - StopStation
struct StopStation: Decodable, Identifiable, Encodable {
  var id: Int { stationId }
  var stationName: String { getStationNameById(stationId)}
  
  let stationId, platform: Int
  let arrivalTime, departureTime: String
}

struct RouteStation: Decodable, Encodable, Identifiable {
  var id: Int { stationId }
  var name: String { getStationNameById(stationId) }

  let stationId: Int
  let arrivalTime: String // e.g. "20:51"
  let platform: Int
}

struct TrainPosition: Decodable, Encodable {
  let calcDiffMinutes: Int?
}

enum FetchRouteResultStatus {
  case success
  case failed
}

struct FetchRouteResult {
  let status: FetchRouteResultStatus
  let routes: [Route]?
}

struct RouteModel {
  func fetchRoute(originId: String, destinationId: String, date: Date? = nil, completion: @escaping (FetchRouteResult) -> Void) {
      let (routeDate, routeTime) = formatRouteDate(date ?? Date())
      
      let url = URL(string: "https://israelrail.azurefd.net/rjpa-prod/api/v1/timetable/searchTrainLuzForDateTime?fromStation=\(originId)&toStation=\(destinationId)&date=\(routeDate)&hour=\(routeTime)&scheduleType=1&systemType=1&languageId=Hebrew")!
      
      var request = URLRequest(url: url)
      request.addValue("4b0d355121fe4e0bb3d86e902efe9f20", forHTTPHeaderField: "Ocp-Apim-Subscription-Key")
      
      DispatchQueue.global(qos: .userInitiated).async {
          URLSession.shared.dataTask(with: request) { data, _, _ in
              guard let data else {
                completion(FetchRouteResult(status: .failed, routes: nil))
                  return
              }
              
              let decoder = JSONDecoder()
            do {
              let route = try decoder.decode(RouteResult.self, from: data)
              completion(FetchRouteResult(status: .success, routes: route.result.travels))
            } catch {
                print("Error decoding JSON: \(String(describing: error))")
                completion(FetchRouteResult(status: .failed, routes: nil))
                return
            }            
          }.resume()
      }
  }

  func fetchRoute(originId: String, destinationId: String, date: Date? = nil) async -> FetchRouteResult {
      return await withUnsafeContinuation { continuation in
          fetchRoute(originId: originId, destinationId: destinationId, date: date) { result in
            continuation.resume(returning: result)
          }
      }
  }

}
