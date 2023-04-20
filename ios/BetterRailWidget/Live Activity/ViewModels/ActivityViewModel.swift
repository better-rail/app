//
//  ActivityViewModel.swift
//  BetterRailWidgetExtension
//
//  Created by Guy Tepper on 18/04/2023.
//

import SwiftUI
import ActivityKit
import WidgetKit

class ActivityViewModel {
  let context: ActivityViewContext<BetterRailActivityAttributes>

  // context properties
  var route: Route { context.attributes.route }
  var status: ActivityStatus { context.state.status }
  var delay: Int { context.state.delay }
  var nextStationId: Int { context.state.nextStationId }
  var activityStartDate: Date { context.attributes.activityStartDate }
  
  // route properties
  var train: Train { getTrainFromStationId(route: route, stationId: context.state.nextStationId)! }
  var nextStop: Station { getStationById(nextStationId)! }
  var lastTrainStop: RouteStation { train.routeStations[train.routeStations.count - 1] }
  var destination: Station {
    if (status == .inExchange) {
      return getStationById(train.orignStation)!
    }
      
    return getStationById(train.destinationStation)!
  }
  var progress: (Int, Int) {
    let progress = rideProgress(route: route, nextStationId: nextStationId)

    if (status == .getOff || status == .arrived) {
      /// display 100% progress
      return (progress.1, progress.1)
    }

    /// return the actual progress
    return progress
  }
  var stopsLeft: Int { progress.1 - progress.0 }
  
  /// the train departure date - without added delays
  var departureDate: Date { isoDateStringToDate(train.departureTime) }
  /// the train arrival date - without added delays
  var arrivalDate: Date { isoDateStringToDate(train.arrivalTime) }


  
  // UI properties
  @Environment(\.locale) var locale
  var isEnglish: Bool { locale.language.languageCode?.identifier == "en" }
  var isRTL: Bool { NSLocale.characterDirection(forLanguage: Locale.preferredLanguages.first ?? "") == .rightToLeft }
  var isWideScreen: Bool { UIScreen.main.bounds.size.width >= 414 }

  init(context: ActivityViewContext<BetterRailActivityAttributes>) {
    self.context = context
  }
}
