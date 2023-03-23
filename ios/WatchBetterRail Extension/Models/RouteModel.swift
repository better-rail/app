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
    let isExchange: Bool
    let duration: String
    let departureTime: String
    let arrivalTime: String
    let trains: [Train]

}

// MARK: - Train
struct Train: Decodable, Identifiable {
  var id: Int { trainNumber }

  var originStationName: String { getStationNameById(orignStation) }
  var destinationStationName: String { getStationNameById(destinationStation) }
  var formattedDepartureTime: String { formatRouteHour(departureTime) }
  var formattedArrivalTime: String { formatRouteHour(arrivalTime) }
  var stationImage: String? { getStationById(orignStation)?.image }
  var destinationStationImage: String? { getStationById(destinationStation)?.image }

  let trainNumber, orignStation, destinationStation: Int
  let arrivalTime, departureTime: String
  let stopStations: [StopStation]
  let lineNumber, route: String
  let midnight, handicap, directTrain: Bool
  let reservedSeat: Bool
  let platform, destPlatform: Int
  let isFullTrain: Bool
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
//  , completion: @escaping (_ result: Result<RouteResult, Error>)
  func fetchRoute(originId: Int, destinationId: Int, date: Date? = nil) async -> [Route] {
    let (routeDate, routeTime) = formatRouteDate(date ?? Date())
    
    let url = URL(string: "https://israelrail.azurefd.net/rjpa-prod/api/v1/timetable/searchTrainLuzForDateTime?fromStation=\(originId)&toStation=\(destinationId)&date=\(routeDate)&hour=\(routeTime)&scheduleType=1&systemType=2&languageId=Hebrew")!

    
    var request = URLRequest(url: url)
    request.addValue("4b0d355121fe4e0bb3d86e902efe9f20", forHTTPHeaderField: "Ocp-Apim-Subscription-Key")
    
    guard let (data, _) = try? await URLSession.shared.data(for: request) else { return [] }
    
    let decoder = JSONDecoder()
//    decoder.keyDecodingStrategy = .custom { keys in PascalCaseKey(stringValue: keys.last!.stringValue) }
    guard let route = try? decoder.decode(RouteResult.self, from: data) else { return [] }
    
    return route.result.travels
  }
}
