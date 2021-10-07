import SwiftUI

// TODO: Change background color
// TODO: Add platform change & waiting time notices
struct TrainExchangeListItem: View {
  let stationName: String
  let time: String
  let platform: String
  
  var body: some View {
    VStack(alignment: .leading) {
      Text("\(Image(systemName: "arrow.left.arrow.right.circle.fill")) החלפה")
        .fontWeight(.semibold)
        .foregroundColor(Color.blue)
      
      Text(time).font(Font.custom("Heebo", size: 16)).fontWeight(.bold)
      Text(stationName).font(Font.custom("Heebo", size: 18)).fontWeight(.medium)
      Text("רציף \(platform)")
    }.font(Font.custom("Heebo", size: 14))
  }
}
