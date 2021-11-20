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
    let messageType: Int
    let message: String?
    let data: DataClass
}

// MARK: - DataClass
struct DataClass: Decodable {
  let error: String?
  let routes: [Route]
}

// MARK: - Station
//struct Station: Decodable {
//    let StationNumber: Int
//    let OmesPercent: Double
//    let Time: String
//    let Platform: Int
//}


// MARK: - Route
struct Route: Decodable {
    let train: [Train]
    let isExchange: Bool
    let estTime: String
}

// MARK: - Train
struct Train: Decodable, Identifiable {
  var id: String { trainno }


  var originStationName: String { getStationNameById(orignStation) }
  var destinationStationName: String { getStationNameById(destinationStation) }
  var formattedDepartureTime: String { formatRouteHour(departureTime) }
  var formattedArrivalTime: String { formatRouteHour(arrivalTime) }
  var stationImage: String? { getStationById(orignStation)?.image }
  var destinationStationImage: String? { getStationById(destinationStation)?.image }

  let trainno, orignStation, destinationStation, arrivalTime, departureTime: String
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
  let stationId, arrivalTime, departureTime, platform: String
}

struct RouteModel {
  /// Today's date, formatted properly for Israel Railways API endpoint
  static private var todayDate: String {
    let dateFormatter = DateFormatter()
    dateFormatter.locale = Locale(identifier: "en_us")
    dateFormatter.dateFormat = "YYYYMMdd"
    return dateFormatter.string(from: Date())
  }
    
  func fetchRoute(originId: String, destinationId: String, completion: @escaping (_ result: Result<RouteResult, Error>) -> Void) {
    let url = URL(string: "https://www.rail.co.il/apiinfo/api/Plan/GetRoutes?OId=\(originId)&TId=\(destinationId)&Date=\(RouteModel.todayDate)&Hour=0000")!

    let task = URLSession.shared.dataTask(with: url) { (data, response, error) in
      if (error != nil) {
        completion(.failure(error!))
      }
      
      guard let data = data else { return }
        
        do {
          let decoder = JSONDecoder()
          decoder.keyDecodingStrategy = .custom { keys in PascalCaseKey(stringValue: keys.last!.stringValue) }
          let route = try decoder.decode(RouteResult.self, from: data)
          completion(.success(route))
        } catch let error {
          print(error)
        }
    }

    task.resume()
  }
}
