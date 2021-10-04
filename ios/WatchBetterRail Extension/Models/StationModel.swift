import Foundation

struct Station: Codable, Hashable, Identifiable {
  let id: String
  let name: String
  let image: String? 
  
  enum CodingKeys : String, CodingKey {
    case id, image
    case name = "hebrew"
  }
 }

var stations: [Station] = load("stationsData.json")

func load<T: Decodable>(_ filename: String) -> T {
    let data: Data

    guard let file = Bundle.main.url(forResource: filename, withExtension: nil)
        else {
            fatalError("Couldn't find \(filename) in main bundle.")
    }

    do {
        data = try Data(contentsOf: file)
    } catch {
        fatalError("Couldn't load \(filename) from main bundle:\n\(error)")
    }

    do {
        let decoder = JSONDecoder()
        return try decoder.decode(T.self, from: data)
    } catch {
        fatalError("Couldn't parse \(filename) as \(T.self):\n\(error)")
    }
  

}

func getStationNameById(_ id: String) -> String {
  for station in stations {
    if (station.id == id) {
      return station.name
    }
  }
  
  return "ERR"
}

func getStationById(_ id: String) -> Station? {
  for station in stations {
    if (station.id == id) {
      return station
    }
  }
  
  return nil
}
