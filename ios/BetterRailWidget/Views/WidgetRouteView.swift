import SwiftUI

struct WidgetRouteView: View {
  @Environment(\.widgetFamily) var widgetFamily
  let originName: String
  let destinationName: String
  
  var body: some View {
    VStack(alignment: .leading) {
      Text(formatStationName(originName)).preferredFont(size: 14).fontWeight(.bold).padding(.bottom, -4)
      
      HStack(alignment: .center) {
        Image(systemName: "arrow.forward.circle.fill").padding(.trailing, -2).font(.system(size: 11))
          
        Text(formatStationName(destinationName))
          .preferredFont(size: 11)
          .fontWeight(.medium)
      }
    }.foregroundColor(.white)
    .shadow(radius: 8)
  }
  
  func formatStationName(_ stationName: String) -> String {
    widgetFamily == .systemSmall ?
      stationName.turnucateTextAfterHyphen() :
      stationName
  }
}
