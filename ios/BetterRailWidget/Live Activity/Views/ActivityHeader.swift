import SwiftUI

struct ActivityHeader: View {
  var vm: ActivityViewModel
  
  var body: some View {
    HStack(spacing: vm.isRTL ? 4 : 6) {
      Image(systemName: "train.side.front.car")
        .scaleEffect(x: vm.isRTL ? -1 : 1, y: 1, anchor: .center)
      
      Text("BETTER RAIL")
    }
    .font(.caption2)
    .foregroundColor(Color(uiColor: .systemGray))
    .padding(.bottom, -4)
  }
}
