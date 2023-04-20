import Foundation

/// Used for decoding the station name according to the device locale.
let userLocale = getUserLocale()

struct Station: Decodable, Hashable, Encodable, Identifiable {
  let id: String
  let name: String
  let image: String?
  
  init(from decoder: Decoder) throws {
      let values = try decoder.container(keyedBy: CodingKeys.self)
      id = try values.decode(String.self, forKey: .id)
      name = try values.decode(String.self, forKey: CodingKeys(rawValue: userLocale.rawValue)!)
    
    if (values.contains(.image)) {
      image = try values.decode(String.self, forKey: .image)
    } else {
      image = nil
    }
  }
  
  init(id: String, name: String) {
    self.id = id
    self.name = name
    self.image = nil
  }
  
  func encode(to encoder: Encoder) throws {
    var container = encoder.container(keyedBy: CodingKeys.self)
    try container.encode(id, forKey: .id)
    try container.encode(name, forKey: CodingKeys(rawValue: userLocale.rawValue)!)
    // Don't encode the image property
  }
  
  enum CodingKeys : String, CodingKey {
    case id, image
    case hebrew, arabic, english, russian
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

func getStationById(_ id: Int) -> Station? {
  for station in stations {
    if (station.id == String(id)) {
      return station
    }
  }
  
  return nil
}
  
func getStationNameById(_ id: Int) -> String {
  if let station = getStationById(id) {
    return station.name
  }
      
  return "ERR"
}

let ERR_STATION = Station(id: "ERR", name: "ERR")
