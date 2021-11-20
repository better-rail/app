import SwiftUI

struct WidgetRouteView: View {
    var body: some View {
      VStack(alignment: .leading) {
        Text("HaShalom").font(.system(size: 14)).fontWeight(.bold).padding(.bottom, -4)
        
        HStack(alignment: .center) {
          Image(systemName: "arrow.right.circle.fill").padding(.trailing, -5)
            
          Text("Yitzhak Navon").fontWeight(.medium)
        }
      }.font(.system(size: 11)).foregroundColor(.white)
      .shadow(radius: 8)
    }
}
