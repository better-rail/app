import SwiftUI

struct TrainStopListItem: View {
  var time: String
  var stationName: String
  
  var body: some View {
    HStack(alignment: .center) {
      HStack {
        Text(time)
        Text("・")
        Text(stationName)
      }.font(Font.custom("Heebo", size: 14).bold()).foregroundColor(.secondary)
    }.padding(.leading, 4)
  }
}
