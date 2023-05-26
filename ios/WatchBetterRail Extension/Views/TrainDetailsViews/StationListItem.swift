import SwiftUI

struct StationListItem: View {
  let time: String
  let stationName: String
  let platform: Int
  let trainNumber: Int?
  let imageName: String?
  
  init(time: String, stationName: String, platform: Int, imageName: String?) {
    self.time = time
    self.stationName = stationName
    self.platform = platform
    self.trainNumber = nil
    self.imageName = imageName
  }
  
  
  init(time: String, stationName: String, platform: Int, trainNumber: Int, imageName: String?) {
    self.time = time
    self.stationName = stationName
    self.platform = platform
    self.trainNumber = trainNumber
    self.imageName = imageName
  }
  
  var body: some View {
    VStack(alignment: .leading) {
      Text(time)
        .font(Font.custom("Heebo", size: 16)).fontWeight(.bold)
      Text(stationName)
        .font(Font.custom("Heebo", size: 18)).fontWeight(.medium)
      
      if let trainNumber {
        Text("train \(String(trainNumber)) platform \(String(platform))")
          .font(Font.custom("Heebo", size: 14))
      } else {
        Text("platform \(String(platform))")
          .font(Font.custom("Heebo", size: 14))
      }
    }.listRowBackground(StationImageBackground(imageName))
  }
}
