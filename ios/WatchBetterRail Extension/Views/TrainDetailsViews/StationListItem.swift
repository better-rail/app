import SwiftUI

struct StationListItem: View {
  let time: String
  let stationName: String
  let platform: String
  let trainNumber: String?
  let imageName: String?
  
  init(time: String, stationName: String, platform: String, imageName: String?) {
    self.time = time
    self.stationName = stationName
    self.platform = platform
    self.trainNumber = nil
    self.imageName = imageName
  }
  
  
  init(time: String, stationName: String, platform: String, trainNumber: String, imageName: String?) {
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
      
      if trainNumber != nil {
        Text("train \(trainNumber!) platform \(platform)")
          .font(Font.custom("Heebo", size: 14))
      } else {
        Text("platform \(platform)")
          .font(Font.custom("Heebo", size: 14))
      }
    }.listRowBackground(StationImageBackground(imageName))
  }
}
