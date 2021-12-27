import Foundation
import SwiftUI

struct WidgetBackground: View {
  var image: String?
  @Environment(\.colorScheme) var colorScheme

  var body: some View {
    ZStack {
      if let stationImage = image {
        Image(stationImage)
          .resizable()
          .aspectRatio(contentMode: .fill)
          .frame(maxHeight: 170)
          .clipped()
      }
      
      Rectangle()
        .foregroundColor(Color(.sRGB, red: 0, green: 0, blue: 0, opacity: 0.81))
    }
  }
}
