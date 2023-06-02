//
//  TimeInformation.swift
//  BetterRailWidgetExtension
//
//  Created by Guy Tepper on 15/04/2023.
//

import SwiftUI
import WidgetKit

enum ViewPlacement: String {
  case dynamicIsland
  case lockScreen
}

struct TimeInformation: View {
  var vm: ActivityViewModel
  var delay: Int { vm.delay }
  var departureDate: Date { vm.departureDate }
  var arrivalDate: Date { vm.arrivalDate }
  
  var placement: ViewPlacement = .lockScreen
  
    var body: some View {
      if (vm.status == .arrived) {
        VStack(alignment: .trailing) {
          Text("ARRIVAL TIME").font(.caption)
          Text(formatDateHour(arrivalDate.addMinutes(delay))).font(.system(size: 18, weight: .bold, design: .rounded))
        }
        
      }
      else {
        if (vm.status == .waitForTrain || vm.status == .inExchange) {
          VStack(alignment: .trailing) {
            if (vm.context.attributes.frequentPushesEnabled) {
              CountdownView(targetDate: departureDate, delay: delay)
                .accessibilityLabel("time left depart")
            }

            HStack (alignment: .lastTextBaseline, spacing: vm.isRTL ? 4 : 2) {
              Text("depart")
                .fontWeight(vm.isRTL ? .regular : .light)
                .font(vm.isRTL ? .subheadline2 : .caption2)
              
              // hide the original time during delay, if the screen space is limited
              if (delay == 0 || delay > 0 && (placement == .lockScreen || vm.isWideScreen)) {
                Text(formatDateHour(departureDate))
                  .bold()
                  .strikethrough(vm.delay > 0 ? true : false)
                  .font(vm.isRTL ? .caption : .caption2)
              }
              
              if (delay != 0) {
                Text(formatDateHour(departureDate.addMinutes(delay)))
                  .foregroundColor(Color(uiColor: .systemRed))
                  .fontWeight(.heavy)
                  .font(.caption)
              }
            }
          }
        }
        
        else {
          VStack(alignment: .trailing) {
            if (vm.context.attributes.frequentPushesEnabled) {
              CountdownView(targetDate: vm.arrivalDate, delay: delay)
                .accessibilityLabel("time left arrival")
            }
            
            HStack (spacing: 2) {
              Text("arrive").fontWeight(vm.isEnglish ? .light : .medium)
              // we don't have space for both original & updated times in the dynamic island
              if (delay == 0 || placement == .lockScreen && delay > 0) {
                Text(formatDateHour(arrivalDate)).bold().strikethrough(delay > 0 ? true : false)
              }
              
              if (vm.delay != 0) {
                Text(formatDateHour(vm.arrivalDate.addMinutes(delay))) .foregroundColor(Color(uiColor: .systemRed)).fontWeight(.heavy)
              }
            }.font(vm.isEnglish ? .caption2 : .caption)
          }
        }
      }
    }
}
