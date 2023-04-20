//
//  RideInformationBar.swift
//  BetterRailWidgetExtension
//
//  Created by Guy Tepper on 15/04/2023.
//

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
  


  var body: some View {
    ZStack {
      Rectangle().frame(width: .infinity, height: 40).foregroundColor(Color(uiColor: .secondarySystemBackground)).padding(.horizontal, -16).padding(.bottom, -16)
      if (vm.status == .inExchange) {
        HStack(spacing: 2.0) {
          Text("platform \(String(vm.train.originPlatform))").foregroundColor(.orange)
          Text("train \(String(vm.train.trainNumber)) dest \(vm.lastTrainStop.name.uppercased())")
        }
        .padding(.top, paddingAmount)
      }
      else if (vm.status == .waitForTrain || vm.status == .inExchange) {
        Text("platform \(String(vm.train.originPlatform)) train \(String(vm.train.trainNumber)) dest \(vm.lastTrainStop.name.uppercased())")
          .padding(.top, paddingAmount)
      }
      else if (vm.status == .arrived) {
        Text("THANKS FOR RIDING WITH BETTER RAIL 🚂").padding(.top, paddingAmount)
      }
      else if (vm.status == .getOff) {
        Text("GET OFF THE TRAIN ")
            .padding(.top, paddingAmount)
            .fontWeight(.heavy)
      }
      else if (vm.stopsLeft == 1) {
        Text("get off in the next stop").padding(.top, paddingAmount)
      } else {
        Text("get off in \(String(vm.stopsLeft)) stops").padding(.top, paddingAmount)
      }
    }.font(.caption2).bold()
  }
}
