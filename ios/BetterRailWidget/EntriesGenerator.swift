import Foundation

struct EntriesGenerator {
  typealias Entry = TrainDetail
  
  func getTrains(originId: String, destinationId: String, completion: @escaping (_ entries: [Entry]) -> Void) {
    var entries: [Entry] = []

    RouteModel().fetchRoute(originId: originId, destinationId: destinationId, completion: { result in
      let originStation = getStationById(originId)!
      let destinationStation = getStationById(destinationId)!
      
      if let response = try? result.get() {
        // API possibly return past trains
        let routes = cleanPastTrain(response.data.routes)
        
        if (routes.count == 0) {
          entries.append(getEmptyEntry(origin: originStation, destination: destinationStation))
        }

        else {
          for index in 0 ..< routes.count {
            let trains = routes[index].train
            let firstRouteTrain = trains[0]
            let lastRouteTrain = trains[trains.count - 1]

            var date: Date
            if (index == 0) {
              // First entry shows up right away
              date = Date()
            } else {
              // Later entries will show up 1 minute after the last entry
              let previousTrain = routes[index - 1].train[0]
              let lastDepartureDate = stringToDate(previousTrain.departureTime)!

              date = Calendar.current.date(byAdding: .minute, value: 1, to: lastDepartureDate)!
            }
            
            
            var entry = Entry(
              date: date,
              departureTime: firstRouteTrain.formattedDepartureTime,
              arrivalTime: lastRouteTrain.formattedArrivalTime,
              platform: firstRouteTrain.platform,
              trainNumber: firstRouteTrain.trainno,
              origin: originStation,
              destination: destinationStation,
              upcomingTrains: nil
            )
            
            if routes.count > 1 {
              /// Maximum 4 routes in the upcoming trains array
              let lastUpcomingRouteIndex = routes.count > 5 ? 5 : routes.count - 1
              let upcomingRoutes = Array(routes[1 ... lastUpcomingRouteIndex])
              
              entry.upcomingTrains = getEntryUpcomingTrains(routes: upcomingRoutes)
            }

            entries.append(entry)
          }
        }
        
        // Something is wrong; append empty entry
//        if (entries.count == 0) {
//          entries.append(getEmptyEntry(origin: originStation, destination: destinationStation))
//        }
        
        completion(entries)
      }
    })
  }
  
  func getEmptyEntry(origin: Station, destination: Station) -> TrainDetail {
    TrainDetail(
      date: Date(),
      departureTime: "404",
      arrivalTime: "404",
      platform: "404",
      trainNumber: "404",
      origin: origin,
      destination: destination,
      upcomingTrains: []
    )
  }
  
  /// Generate an upcoming scheduale for an entry
  func getEntryUpcomingTrains(routes: [Route]) -> [UpcomingTrain] {
    var upcomingTrains: [UpcomingTrain] = []
    
    for route in routes {
      let trains = route.train
      let firstRouteTrain = trains[0]
      let lastRouteTrain = trains[trains.count - 1]
      
      let upcomingTrain = UpcomingTrain(
        departureTime: formatRouteHour(firstRouteTrain.departureTime),
        arrivalTime: formatRouteHour(lastRouteTrain.arrivalTime),
        platform: firstRouteTrain.platform,
        trainNumber: firstRouteTrain.trainno
      )
      
      upcomingTrains.append(upcomingTrain)
    }
    
    return upcomingTrains
  }
  
  func cleanPastTrain(_ routes: [Route]) -> [Route] {
    let now = Date()
    return routes.filter { now < stringToDate($0.train[0].departureTime)! }
  }

}
