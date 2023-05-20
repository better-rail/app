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
      BarBackground
      
      HStack(alignment: .center) {
        Image(systemName: symbolName).font(.system(size: 31))
        
        if (vm.status == .arrived) {
          Text("thanks for riding with better rail").font(.footnote).bold()
        } else {
            VStack(alignment: .leading, spacing: 1.32) {
              // info on top, instructions on top
              if (vm.status == .waitForTrain || vm.status == .inExchange) {
                Text("train \(String(vm.train.trainNumber)) to \(vm.lastTrainStop.name)").font(.footnote).bold()
                Text(informationText).font(.caption)
              } else {
                // info on bottom, instructions on top
                Text(informationText).font(.footnote).bold()
                Text("train \(String(vm.train.trainNumber)) to \(vm.lastTrainStop.name)").font(.caption)
              }
            }
          }
        Spacer()
      }
      .padding(.top, placement == .lockScreen ? 10 : 2)
      .padding(.leading, placement == .lockScreen ? 0 : 2)
      .foregroundColor(Color(uiColor: .darkText))
    }
  }
  
  var BarBackground: some View {
    Rectangle()
      .frame(width: .infinity, height: 60).foregroundColor(.yellow).padding(.horizontal, -16).padding(.bottom, -14)
  }
}
