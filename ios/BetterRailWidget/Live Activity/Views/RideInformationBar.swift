import SwiftUI
import WidgetKit

struct RideInformationBar: View {
  var vm: ActivityViewModel
  var placement: ViewPlacement = .lockScreen
    
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
      return LocalizedStringKey("get off at the next stop")
    } else {
      return LocalizedStringKey("get off in \(String(vm.stopsLeft)) stops")
    }
  }
  
  var body: some View {
    ZStack {
      BarBackground
      
      HStack(alignment: .center) {
        Image(systemName: symbolName).font(.system(size: 36))
        if (vm.status == .arrived) {
          Text("thanks for riding with better rail").font(.subheadline).bold()
        } else {
          VStack(alignment: .leading, spacing: 2.0) {
              // info on top, instructions on top
              if (vm.status == .waitForTrain || vm.status == .inExchange) {
                Text("train \(String(vm.train.trainNumber)) to \(vm.lastTrainStop.name)").font(.subheadline).bold()
                Text(informationText).font(.subheadline2)
              } else {
                // info on bottom, instructions on top
                if (false) {
                  Text(informationText).font(.subheadline).bold()
                }
                
                Text("train \(String(vm.train.trainNumber)) to \(vm.lastTrainStop.name)")
                  .font(.subheadline2)
                  .fontWeight(true ? .bold : .regular)
              }
            }
          }
        Spacer()
      }
      .padding(.top, placement == .lockScreen ? 10 : -2.0)
      .padding(.leading, placement == .lockScreen ? 0 : 4)
      .foregroundColor(Color(uiColor: .darkText))
    }
  }
  
  var BarBackground: some View {
    Rectangle()
      .frame(width: .infinity, height: 70).foregroundColor(.yellow).padding(.horizontal, -16).padding(.bottom, -14)
  }
}
