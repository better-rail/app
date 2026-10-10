import SwiftUI

struct WidgetRouteView: View {
  @Environment(\.widgetFamily) var widgetFamily
  let originName: String
  let destinationName: String
  /// Scales the type; the extra large widget uses 1.2.
  var scale: CGFloat = 1

  var body: some View {
    VStack(alignment: .leading) {
      Text(formatStationName(originName, widgetFamily == .systemSmall)).preferredFont(size: 14 * scale).fontWeight(.bold).padding(.bottom, -4)
      
      HStack(alignment: .center) {
        Image(systemName: "arrow.forward.circle.fill").padding(.trailing, -2).font(.system(size: 11 * scale))
          
        Text(formatStationName(destinationName, widgetFamily == .systemSmall))
          .preferredFont(size: 11 * scale)
          .fontWeight(.medium)
      }
    }.foregroundColor(.white)
    .shadow(radius: 8)
  }
}
