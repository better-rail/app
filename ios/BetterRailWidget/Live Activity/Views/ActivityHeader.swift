import SwiftUI

struct ActivityHeader: View {
  var vm: ActivityViewModel
  
  var body: some View {
    HStack {
      HStack(spacing: vm.isRTL ? 4 : 6) {
        Image(systemName: "train.side.front.car")
          .scaleEffect(x: vm.isRTL ? -1 : 1, y: 1, anchor: .center)
        
        Text("BETTER RAIL")
      }
      .font(.caption2)
      .foregroundColor(Color(uiColor: .systemGray))
      .padding(.bottom, -4)
      
      Spacer()

      if (vm.isStale) {
        HStack(spacing: 4.0) {
          Image(systemName: "exclamationmark.circle.fill")
            .font(.caption2)

          Text("connection issues")
            .font(.caption2)
        }.foregroundColor(.orange).fontWeight(.bold)
      }
    }
  }
}
