import Foundation
import SwiftUI
import WidgetKit
import ActivityKit


struct LockScreenWaitingForTrainView: View {
  var vm: ActivityViewModel
  
  var activityStartDate: Date {
    if (vm.status == .waitForTrain) {
      return vm.activityStartDate
    } else {
      let previousTrain = getPreviousTrainFromStationId(route: vm.route, stationId: vm.nextStationId )
      
      if (previousTrain != nil) {
        return isoDateStringToDate(previousTrain!.arrivalTime).addDelay(vm.delay)
      }
      
      print("Previous train wasn't found")
      return Date()
    }
  }
  
  var body: some View {
    VStack(alignment: .leading) {
        HStack {
          Image(systemName: "train.side.front.car")
          Text("BETTER RAIL")
        }
        .font(.caption2)
        .foregroundColor(Color(uiColor: .systemGray))
        .padding(.bottom, 0.1)

      HStack(alignment: .lastTextBaseline) {
        VStack(alignment: .leading, spacing: 2.0) {
          Text(vm.status == .inExchange ? "wait in" : "headed to")
            .font(vm.isEnglish ? .caption2 : .caption)
          Text("\(vm.destination.name)")
            .font(vm.isEnglish ? .callout : .body).heavyWide()
        }
        
        Spacer()
        
        TimeInformation(vm: vm)
      }
      
      RideInformationBar(vm: vm)
    }
  }
}

