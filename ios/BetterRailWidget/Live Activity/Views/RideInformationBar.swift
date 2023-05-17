import SwiftUI
import WidgetKit

struct RideInformationBar: View {
  var vm: ActivityViewModel
  var placement: ViewPlacement = .lockScreen
  var paddingAmount: Double {
    if (placement == .lockScreen) {
      return 14
    } else {
      return 7
    }
  }
    
  var symbolName: String {
    if (vm.status == .inTransit) {
      return "tram.circle.fill"
    } else if (vm.status == .inExchange) {
      return "arrow.left.arrow.right.circle.fill"
    } else if (vm.status == .arrived) {
      return "figure.wave.circle.fill"
    }
    
    return "arrow.up.forward.circle.fill"
  }
  
  var informationText: LocalizedStringKey {
    if (vm.status == .waitForTrain || vm.status == .inExchange) {
      return LocalizedStringKey("depart from platform \(String(vm.train.originPlatform))")
    }
    else if (vm.status == .arrived) {
      return LocalizedStringKey("thanks for riding with better rail")
    }
    else if (vm.status == .getOff) {
     return LocalizedStringKey("get off")
    }
    else if (vm.stopsLeft == 1) {
      return LocalizedStringKey("get off in the next stop")
    } else {
      return LocalizedStringKey("get off in \(String(vm.stopsLeft)) stops")
    }
  }
  
  var body: some View {
    ZStack {
      Rectangle().frame(width: .infinity, height: 60).foregroundColor(.yellow).padding(.horizontal, -16).padding(.bottom, -14)
      
      HStack(alignment: .center) {
        Image(systemName: symbolName).font(.title)
        
        if (vm.status == .arrived) {
          Text("thanks for riding with better rail").font(.footnote).bold()
        } else {
          VStack(alignment: .leading, spacing: 1.32) {
            Text("train \(String(vm.train.trainNumber)) to \(vm.lastTrainStop.name)").font(.footnote).bold()
            Text(informationText).font(.caption2)
          }
        }
        
        Spacer()
      }.padding(.top, 10).foregroundColor(Color(uiColor: .darkText))
    }
  }
}
