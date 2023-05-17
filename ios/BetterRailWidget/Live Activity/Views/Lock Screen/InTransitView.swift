import SwiftUI
import Foundation
import WidgetKit
import ActivityKit

struct LockScreenInTransitView: View {
  var vm: ActivityViewModel
  
  var body: some View {
    VStack(alignment: .leading) {
      HStack {
        Image(systemName: "train.side.front.car")
        Text("BETTER RAIL")
      }
      
      .font(.caption2).foregroundColor(Color(uiColor: .systemGray))
      .padding(.bottom, 2.0)
      
      HStack(alignment: .bottom) {
        VStack(alignment: .leading) {
          if (vm.status == .arrived) {
            Text("arrived at").font(.caption)
          } else {
            Text("next station").font(.caption)
          }
          
          Text(vm.nextStop.name).fontWeight(.heavy).fontWidth(Font.Width(0.1))
        }
        
        Spacer()
        
        TimeInformation(vm: vm)
      }.padding(.vertical, vm.status == .arrived ? 10.0 : 0)

      RideInformationBar(vm: vm)
    }
  }
}


