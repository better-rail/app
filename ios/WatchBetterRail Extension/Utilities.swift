//
//  Utilities.swift
//  BetterRail
//
//  Created by Guy Tepper on 31/07/2021.
//

import Foundation

func formatRouteHour(_ dateString: String) -> String {
  
  let formatter = DateFormatter()
  formatter.dateFormat = "dd/MM/yyyy HH:mm:ss"
  formatter.timeZone = TimeZone(abbreviation: "UTC")

  let hourFormatter = DateFormatter()
  hourFormatter.dateFormat = "HH:mm"
  hourFormatter.timeZone = TimeZone(abbreviation: "UTC")
  
  let formattedDate = formatter.date(from: dateString)
  if let date = formattedDate {
    return hourFormatter.string(from: date)
  } else {
    return "--:--"
  }
}

