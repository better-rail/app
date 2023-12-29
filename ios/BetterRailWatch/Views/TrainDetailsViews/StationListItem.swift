import SwiftUI

struct StationListItem: View {
  let time: String
  let delay: Int
  let stationName: String
  let platform: Int
  let trainNumber: Int?
  let imageName: String?
  
  init(time: String, delay: Int, stationName: String, platform: Int, imageName: String?) {
    self.time = time
    self.delay = delay
    self.stationName = stationName
    self.platform = platform
    self.trainNumber = nil
    self.imageName = imageName
  }
  
  
  init(time: String, delay: Int, stationName: String, platform: Int, trainNumber: Int, imageName: String?) {
    self.time = time
    self.delay = delay
    self.stationName = stationName
    self.platform = platform
    self.trainNumber = trainNumber
    self.imageName = imageName
  }
  
  var body: some View {
    VStack(alignment: .leading) {
      HStack {
        Text(formatRouteHour(time, delay: delay))
          .font(Font.custom("Heebo", size: 16)).fontWeight(.bold)
        
        if delay > 0 {
          Text(formatRouteHour(time))
            .strikethrough()
            .fontWeight(.bold)
            .foregroundColor(.gray)
            .font(Font.custom("Heebo", size: 12))
          
          Spacer()
          
          if trainNumber != nil {
            Text("+\(String(delay)) min")
              .font(Font.custom("Heebo", size: 14))
              .fontWeight(.bold)
              .padding(.horizontal, 6)
              .background(.red)
              .cornerRadius(16)
          }
        } else {
          Spacer()
        }
      }
        .frame(maxWidth: .infinity)
      Text(stationName)
        .font(Font.custom("Heebo", size: 18)).fontWeight(.medium)
      
      if let trainNumber {
        Text("train \(String(trainNumber)) platform \(String(platform))")
          .font(Font.custom("Heebo", size: 14))
      } else {
        Text("platform \(String(platform))")
          .font(Font.custom("Heebo", size: 14))
      }
    }
    .listRowBackground(StationImageBackground(imageName).cornerRadius(10))
  }
}
