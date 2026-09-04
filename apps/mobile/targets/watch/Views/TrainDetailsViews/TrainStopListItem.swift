import SwiftUI

struct TrainStopListItem: View {
  var stopStation: StopStation
  var delay: Int
  
  var body: some View {
    HStack(alignment: .center) {
      HStack {
        VStack(spacing: delay > 0 ? -2 : nil) {
          if delay > 0 {
            Text(formatRouteHour(stopStation.departureTime))
              .strikethrough()
              .font(Font.custom("Heebo", size: 10).bold())
          }
          
          Text(formatRouteHour(stopStation.departureTime, delay: delay))
        }
        Text("・")
        Text(stopStation.stationName)
      }
      .font(Font.custom("Heebo", size: 14).bold())
      .foregroundColor(.secondary)
    }
    .padding(.leading, 4)
  }
}
