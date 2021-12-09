import Foundation
import SwiftUI

struct WidgetBackground: View {
  var image: String?
  
  var body: some View {
    ZStack {
      if let stationImage = image {
        Image(stationImage)
          .resizable()
          .aspectRatio(contentMode: .fill)
      }
      
      Rectangle()
        .foregroundColor(Color(.sRGB, red: 0, green: 0, blue: 0, opacity: 0.82))
    }
  }
}
