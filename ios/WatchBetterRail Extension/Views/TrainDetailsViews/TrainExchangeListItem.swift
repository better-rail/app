import SwiftUI

// TODO: Add platform change & waiting time notices
struct TrainExchangeListItem: View {
  let stationName: String
  let time: String
  let platform: String
  
  var body: some View {
    VStack(alignment: .leading) {
      ZStack(alignment: .leading) {
//        Rectangle().fill(.blue)
        Text("\(Image(systemName: "arrow.left.arrow.right.circle.fill")) החלפה")
          .fontWeight(.semibold).foregroundColor(.accentColor)
//          .padding(.leading, 16)
      }
      
      VStack(alignment: .leading) {
        Text(time).font(Font.custom("Heebo", size: 16)).fontWeight(.bold)
        Text(stationName).font(Font.custom("Heebo", size: 18)).fontWeight(.medium)
//        Text("רציף \(platform)")
      }
//      .padding(.leading, 16)
      
    }.font(Font.custom("Heebo", size: 14))
     .foregroundColor(.black)
     .listRowBackground(Color.white.cornerRadius(5))
//     .listRowInsets(EdgeInsets(top: -4, leading: -8, bottom: 0, trailing: -8))
  }
}

struct TrainExchangeListItem_Previews: PreviewProvider {
  static var previews: some View {
    TrainStopListItem(time: "09:41", stationName: "ת׳׳א - סבידור מרכז")
  }
}
