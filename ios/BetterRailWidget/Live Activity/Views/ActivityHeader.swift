import SwiftUI

struct ActivityHeader: View {
  var body: some View {
    HStack {
      Image(systemName: "train.side.front.car")
      Text("BETTER RAIL")
    }
    .font(.caption2)
    .foregroundColor(Color(uiColor: .systemGray))
    .padding(.bottom, 0.1)
  }
}
