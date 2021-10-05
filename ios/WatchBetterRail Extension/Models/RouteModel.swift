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
struct Train: Decodable {
  let trainno, orignStation, destinationStation, arrivalTime: String
  let departureTime: String
  let stopStations: [StopStation]
  let lineNumber, route: String
  let midnight, Handicap, DirectTrain: Bool
  let reservedSeat: Bool
  //  let Platform, DestPlatform: String // causes a decode problem
  let isFullTrain: Bool
}

// MARK: - StopStation
struct StopStation: Decodable {
    let stationId, arrivalTime, departureTime, platform: String
}

struct RouteModel {
  /// Today's date, formatted properly for Israel Railways API endpoint
  static private var todayDate: String {
    let dateFormatter = DateFormatter()
    dateFormatter.dateFormat = "YYYYMMdd"
    return dateFormatter.string(from: Date())
  }
  
  func fetchRoute(originId: String, destinationId: String, completion: @escaping (_ result: RouteResult) -> Void) {
    let url = URL(string: "https://www.rail.co.il/apiinfo/api/Plan/GetRoutes?OId=\(originId)&TId=\(destinationId)&Date=\(RouteModel.todayDate)&Hour=0000")!

    let task = URLSession.shared.dataTask(with: url) { (data, response, error) in
        guard let data = data else { return }
        
        do {
          let decoder = JSONDecoder()
          decoder.keyDecodingStrategy = .custom { keys in PascalCaseKey(stringValue: keys.last!.stringValue) }
          let route = try decoder.decode(RouteResult.self, from: data)
          
          completion(route)
        } catch let error {
          print(error)
        }
    }

    task.resume()
  }
}
