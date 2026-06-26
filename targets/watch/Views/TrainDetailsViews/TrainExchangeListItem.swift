import SwiftUI

struct TrainExchangeListItem: View {
  let stationName: String
  let time: String
  let delay: Int
  let arrivalPlatform: Int
  let departurePlatform: Int
  
  var body: some View {
    VStack(alignment: .leading) {
      HStack(alignment: .center) {
        Image(systemName: "arrow.forward.circle.fill")
        Text("change").fontWeight(.semibold)
      }.foregroundColor(.accentColor)

      
      VStack(alignment: .leading) {
        HStack {
          Text(formatRouteHour(time, delay: delay))
            .font(Font.custom("Heebo", size: 16))
            .fontWeight(.bold)
          
          if delay > 0 {
            Text(formatRouteHour(time))
              .strikethrough()
              .fontWeight(.bold)
              .foregroundColor(.gray)
              .font(Font.custom("Heebo", size: 12))
          }
        }
        
        Text(stationName).font(Font.custom("Heebo", size: 18)).fontWeight(.medium)
        
        HStack {
          Image(systemName: "exclamationmark.circle.fill").foregroundColor(.orange)
          if (arrivalPlatform == departurePlatform) {
            Text("stay-at \(String(departurePlatform))")
          } else {
            Text("move-to \(String(departurePlatform))")
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
      TrainExchangeListItem(stationName: "ת׳׳א - סבידור מרכז", time: "2023-06-09T14:41:00", delay: 3, arrivalPlatform: 1, departurePlatform: 2)
      
      // Stay in platform notice
      TrainExchangeListItem(stationName: "ת׳׳א - סבידור מרכז", time: "2023-06-09T14:41:00", delay: 0, arrivalPlatform: 1, departurePlatform: 1)
    }
  }
}
