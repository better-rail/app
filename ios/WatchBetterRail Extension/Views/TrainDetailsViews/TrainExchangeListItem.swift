import SwiftUI

struct TrainExchangeListItem: View {
  let stationName: String
  let time: String
  let arrivalPlatform: String
  let departurePlatform: String
  
  var body: some View {
    VStack(alignment: .leading) {
      HStack(alignment: .center) {
        Image(systemName: "arrow.forward.circle.fill")
        Text("exchange").fontWeight(.semibold)
      }.foregroundColor(.accentColor)

      
      VStack(alignment: .leading) {
        Text(time).font(Font.custom("Heebo", size: 16)).fontWeight(.bold)
        Text(stationName).font(Font.custom("Heebo", size: 18)).fontWeight(.medium)
        
        HStack {
          Image(systemName: "exclamationmark.circle.fill").foregroundColor(.orange)
          if (arrivalPlatform == departurePlatform) {
            Text("stay-at \(departurePlatform)")
          } else {
            Text("move-to \(departurePlatform)")
          }
        }
        
      }
      
    }.font(Font.custom("Heebo", size: 14))
     .foregroundColor(.black)
     .listRowBackground(Color.white.cornerRadius(5))
  }
}

struct TrainExchangeListItem_Previews: PreviewProvider {
  static var previews: some View {
    List {
      // Change platform notice
      TrainExchangeListItem(stationName: "ת׳׳א - סבידור מרכז", time: "09:41", arrivalPlatform: "1", departurePlatform: "2")
      
      // Stay in platform notice
      TrainExchangeListItem(stationName: "ת׳׳א - סבידור מרכז", time: "09:41", arrivalPlatform: "1", departurePlatform: "1")
    }
  }
}
