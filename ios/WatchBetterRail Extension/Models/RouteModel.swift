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
    let departureTime: Int
    let arrivalTime: Int
    let trains: [Train]

}

// MARK: - Train
struct Train: Decodable, Identifiable {
  var id: String { trainNumber }

  var originStationName: String { getStationNameById(orignStation) }
  var destinationStationName: String { getStationNameById(destinationStation) }
  var formattedDepartureTime: String { formatRouteHour(departureTime) }
  var formattedArrivalTime: String { formatRouteHour(arrivalTime) }
  var stationImage: String? { getStationById(orignStation)?.image }
  var destinationStationImage: String? { getStationById(destinationStation)?.image }

  let trainNumber, orignStation, destinationStation, arrivalTime, departureTime: Int
  let stopStations: [StopStation]
  let lineNumber, route: String
  let midnight, handicap, directTrain: Bool
  let reservedSeat: Bool
  let platform, destPlatform: String
  let isFullTrain: Bool
}

// MARK: - StopStation
struct StopStation: Decodable, Identifiable {
  var id: String { stationId }
  var stationName: String { getStationNameById(stationId)}
  var formattedTime: String { formatRouteHour(arrivalTime) }
  let stationId, arrivalTime, departureTime, platform: Int
}

struct RouteModel {
//  , completion: @escaping (_ result: Result<RouteResult, Error>)
  func fetchRoute(originId: String, destinationId: String, date: String? = nil) async -> [Route] {
    let routeDate = date ?? formatRouteDate(Date())
        
    let url = URL(string: "https://www.rail.co.il/apiinfo/api/Plan/GetRoutes?OId=\(originId)&TId=\(destinationId)&Date=\(routeDate)&Hour=0000")!
    guard let (data, _) = try? await URLSession.shared.data(from: url) else { return [] }
    
    let decoder = JSONDecoder()
//    decoder.keyDecodingStrategy = .custom { keys in PascalCaseKey(stringValue: keys.last!.stringValue) }
    guard let route = try? decoder.decode(RouteResult.self, from: data) else { return [] }
    
    return route.data.routes
  }
}
