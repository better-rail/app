import Foundation
import ActivityKit
import WidgetKit

/// TODO: Refactor this file into a struct

enum ActivityError: Error {
    case stationNotFound
}

/// Get the train which includes the provided stop station
func getTrainFromStationId(route: Route, stationId: Int) -> Train? {
  // lookup for the station in the stop stations list
  let train = route.trains.first(where: { $0.stopStations.contains(where: { $0.stationId == stationId })})
  if train != nil { return train }
      
  // not in the stop stations? it's probably the origin / destination station!
  return route.trains.first(where: { $0.orignStation == stationId }) ?? route.trains.first(where: { $0.destinationStation == stationId })
}

/// Get the PREVIOUS train which includes the provided stop station
func getPreviousTrainFromStationId(route: Route, stationId: Int) -> Train? {
  // the current station train
  let train = getTrainFromStationId(route: route, stationId: stationId)!
  if let trainIndex = route.trains.firstIndex(where: { $0.trainNumber == train.trainNumber })  {
    // return the previous train
    if (trainIndex > 0) {
      return route.trains[trainIndex - 1]
    } else {
      print("No previous train here!")
      return nil;
    }
  }
  
  print ("Couldn't find previous train")
  return nil;
  
  
}

/// Calculates how much stations left in the current train route
/// If there is an exchange, the number of stops references the stops until the exchange / last station after the exchange
func stopsLeftInRoute(route: Route, currentStationId: Int) -> Int {
  /// Find the train which the user is on right now (we need to do that to handle exchange scenerios)
  if let train = getTrainFromStationId(route: route, stationId: currentStationId) {
    let totalStations = train.stopStations.count
    
    guard let stationIndex = train.stopStations.firstIndex(where: { $0.stationId == currentStationId }) else {
      print("Failed to find station Id index in the stop stations array")
      return 0;
    }
    
    return totalStations - stationIndex
  } else {
    print("Failed to find the station Id")
    return 0
  }
}

/// Get the first stop for the current train in the user's route
func firstStopStationTime(route: Route, currentStationId: Int) -> Date? {
  if let train = getTrainFromStationId(route: route, stationId: currentStationId) {
    let departureTime = train.stopStations.first!.departureTime
    return isoDateStringToDate(departureTime)
  } else {
    print("Failed to find the first stop station in route")
    return nil;
  }
}


/// Get the last stop for the current train in the user's route
/// This method also handles exchanges - so in case of an exchange, the retrieved result would be the exchange station stop time
func lastStopStationTime(route: Route, currentStationId: Int) -> Date? {
  if let train = getTrainFromStationId(route: route, stationId: currentStationId) {
    let arrivalTime = train.stopStations.last!.arrivalTime
    return isoDateStringToDate(arrivalTime)
  } else {
    print("Failed to find the last stop station in route")
    return nil;
  }
}

/// Get information about the current ride progress
/// - Returns: A tuple made out of the (current stop station index, total stop station count)
func rideProgress(route: Route, nextStationId: Int) -> (Int, Int) {
  if let train = getTrainFromStationId(route: route, stationId: nextStationId) {
    let totalStations = train.stopStations.count + 1
    if let currentIndex = train.stopStations.firstIndex(where: { $0.stationId == nextStationId }) {
      return (currentIndex, totalStations)
    } else {
      /// Check if next station id is the last stop
      for index in 0 ..< route.trains.count {
        if (nextStationId == route.trains[index].destinationStation) {
          let stopStationsCount = route.trains[index].stopStations.count + 1
          return (stopStationsCount - 1, stopStationsCount)
        }
      }
      
      print("Failed to find the last stop station in route")
      return (0, 0);
    }
  } else {
    print("Failed to find the last stop station in route")
    return (0, 0);
  }
}

/// Get the start date for the current status
/// e.g. for `waitForTrain` we'll use the activity start date, and for `inTransit` we'd want to use the train departure time
@available(iOS 16.1, *)
func getStatusStartDate(context: ActivityViewContext<BetterRailActivityAttributes>) -> Date {
  let status = context.state.status;
  let route = context.attributes.route
  let nextStationId = context.state.nextStationId
  let train = getTrainFromStationId(route: route, stationId: nextStationId)!
  let delay = context.state.delay
  let departureDate = isoDateStringToDate(train.departureTime).addDelay(delay)
  
  if (status == .waitForTrain) {
    return context.attributes.activityStartDate
  } else if (status == .inExchange) {
    let previousTrain = getPreviousTrainFromStationId(route: route, stationId: nextStationId)
    // since we're in exchange, use the arrival time of the previous train as the progress start time
    return isoDateStringToDate(previousTrain?.arrivalTime ?? "").addDelay(delay)
  } else {
    return departureDate
  }
}

@available(iOS 16.1, *)
func getStatusEndDate(context: ActivityViewContext<BetterRailActivityAttributes>) -> Date {
  let status = context.state.status
  let route = context.attributes.route
  let nextStationId = context.state.nextStationId
  let delay = context.state.delay
  let train = getTrainFromStationId(route: route, stationId: nextStationId)!
  
  let departureDate = isoDateStringToDate(train.departureTime).addDelay(delay)
  let arrivalDate = isoDateStringToDate(train.arrivalTime).addDelay(delay)

  if (status == .waitForTrain || status == .inExchange) {
    return departureDate
  } else {
    return arrivalDate
  }
}

func getMinutesLeft(targetDate: Date) -> Int {
  let now = Date()
  let timeInterval = targetDate.timeIntervalSince(now)
  let minutes = Int(round(timeInterval / 60))

  if minutes <= 0 {
    return 1
  }

  return minutes
}

/// Find the closest departure/arrival time of the station.
/// Used to test what's the inital station Id for the activity, especially for cases where
/// the train has departured already.
/// - Returns: The station Id
func findClosestStationInRoute(route: Route) -> Int {
  let now = Date()
  
  // find the first station where the departure time is after the current time
  for train in route.trains {
    let departureTime = isoDateStringToDate(train.departureTime)
    let arrivalTime = isoDateStringToDate(train.arrivalTime)
    
    if departureTime > now {
      return train.orignStation
    } else {
      for station in train.stopStations {
        if isoDateStringToDate(station.arrivalTime) > now {
          return station.id
        }
      }
    }
    if (arrivalTime > now) {
      return train.destinationStation
    }
  }
  
  return route.trains[0].orignStation
}

@available(iOS 16.1, *)
func getActivityInitialState(route: Route) throws -> BetterRailActivityAttributes.ContentState {
   // get the current train by finding the departure time which is closest to the current time
   var status = ActivityStatus.waitForTrain
   
     let nextStationId = findClosestStationInRoute(route: route)
     let train = getTrainFromStationId(route: route, stationId: nextStationId)!
     
     if route.trains[0].orignStation != train.orignStation {
       // not the first train, possibly an exchange!
       if train.orignStation == nextStationId {
         status = .inExchange
       }
     }
      if train.orignStation != nextStationId {
       status = .inTransit
     }
     
     return BetterRailActivityAttributes.ContentState(
      delay: 0,
      nextStationId: nextStationId,
      status: status
     )
 }

extension Date {
  func addDelay(_ delay: Int) -> Date {
    let calendar = Calendar.current

    // Add 30 seconds to the date
    return calendar.date(byAdding: .minute, value: delay, to: self)!

  }
}


