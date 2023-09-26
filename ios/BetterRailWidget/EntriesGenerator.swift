import Foundation

struct EntriesGenerator {
  typealias Entry = TrainDetail
    
  func getTrains(originId: Int, destinationId: Int, label: String?, todayRoutes: [Route], tomorrowRoutes: [Route]) -> [Entry] {
    var entries: [Entry] = []
    var lastTrainEntryDate = Date()
    
    let todayRoutes = cleanPastTrains(todayRoutes)
    
    if todayRoutes.count == 0 && tomorrowRoutes.count == 0 {
      entries.append(getEmptyEntry(originId: originId, destinationId: destinationId, label: label))
    } else {
      if todayRoutes.count > 0 {
        entries = generateEntriesForRoutes(todayRoutes, originId: originId, destinationId: destinationId, label: label)
        lastTrainEntryDate = Calendar.current.date(byAdding: .minute, value: 2, to: entries[entries.count - 1].date)!
      }
      
      if tomorrowRoutes.count > 0 {
        let currentDateAtMidnight = Calendar.current.date(bySettingHour: 0, minute: 0, second: 0, of: Date())!
        let firstRouteDate = isoDateStringToDate(tomorrowRoutes[0].departureTime)
        let daysDiff = Calendar.current.dateComponents([.day], from: currentDateAtMidnight, to: firstRouteDate).day ?? 0
        
        if daysDiff < 2 {
          var tomorrowEntries = generateEntriesForRoutes(tomorrowRoutes, originId: originId, destinationId: destinationId, label: label)
          tomorrowEntries[0].date = lastTrainEntryDate
          
          // Add tomorrow's first entry as the last entry for today
          entries.append(tomorrowEntries[0])
        } else {
          // If the first entry is two days in the future, display no trains are available
          entries = [getEmptyEntry(originId: originId, destinationId: destinationId, label: label, date: lastTrainEntryDate)]
        }
      } else {
        // If there are no trains coming up tomorrow, display an empty entry at the end of today's entries
        entries.append(getEmptyEntry(originId: originId, destinationId: destinationId, label: label, date: lastTrainEntryDate))
      }
    }
    
    return entries
  }
  
  func generateEntriesForRoutes(_ routes: [Route], originId: Int, destinationId: Int, label: String?) -> [Entry] {
    var entries: [Entry] = []
    
    // Get stations for entries
    let originStation = getStationById(originId)!
    let destinationStation = getStationById(destinationId)!
      
        
    if (routes.count > 0) {
      for index in 0 ..< routes.count {
        let trains = routes[index].trains
        let firstRouteTrain = trains[0]
        let lastRouteTrain = trains[trains.count - 1]

        var date: Date

        if (index == 0) {
          // First entry shows up right away
          date = Date()
        } else {
          // Later entries will show up 1 minute after the last entry
          let previousTrain = routes[index - 1].trains[0]
          let lastDepartureDate = isoDateStringToDate(previousTrain.departureTime)

          date = Calendar.current.date(byAdding: .minute, value: 1, to: lastDepartureDate)!
        }
        
        var entry = Entry(
          date: date,
          departureDate: firstRouteTrain.departureTime,
          departureTime: firstRouteTrain.formattedDepartureTime,
          arrivalTime: lastRouteTrain.formattedArrivalTime,
          platform: firstRouteTrain.platform,
          trainNumber: firstRouteTrain.trainNumber,
          origin: originStation,
          destination: destinationStation,
          label: label,
          upcomingTrains: nil
        )
        
        if routes.count > 1 {
          let allUpcomingRoutes = Array(routes[index + 1 ..< routes.count ])
          
          // Include a maximum of 4 routes in the upcoming routes
          let routesCount = allUpcomingRoutes.count > 5 ? 5 : allUpcomingRoutes.count
          let upcomingRoutes = Array(allUpcomingRoutes[0 ..< routesCount])
          
          entry.upcomingTrains = getUpcomingTrains(routes: upcomingRoutes)
        }

        entries.append(entry)
      }
    }
    
    return entries
  }
  
  func getEmptyEntry(originId: Int, destinationId: Int, label: String?, errorCode: Int = 300, date: Date = Date()) -> TrainDetail {
    let origin = getStationById(originId)!
    let destination = getStationById(destinationId)!

    return TrainDetail(
      date: date,
      departureDate: "\(errorCode)",
      departureTime: "\(errorCode)",
      arrivalTime: "\(errorCode)",
      platform: errorCode,
      trainNumber: errorCode,
      origin: origin,
      destination: destination,
      label: label,
      upcomingTrains: []
    )
  }
  
  /// Generate an upcoming schedule for an entry
  func getUpcomingTrains(routes: [Route]) -> [UpcomingTrain] {
    var upcomingTrains: [UpcomingTrain] = []
    
    for route in routes {
      let trains = route.trains
      let firstRouteTrain = trains[0]
      let lastRouteTrain = trains[trains.count - 1]
      
      let upcomingTrain = UpcomingTrain(
        departureTime: formatRouteHour(firstRouteTrain.departureTime),
        arrivalTime: formatRouteHour(lastRouteTrain.arrivalTime),
        platform: firstRouteTrain.platform,
        trainNumber: firstRouteTrain.trainNumber
      )
      
      upcomingTrains.append(upcomingTrain)
    }
    
    return upcomingTrains
  }

  func cleanPastTrains(_ routes: [Route]) -> [Route] {
    let now = Date()
    return routes.filter { now < isoDateStringToDate($0.trains[0].departureTime) }
  }
}
