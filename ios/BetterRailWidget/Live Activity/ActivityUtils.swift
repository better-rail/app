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
  let departureDate = isoDateStringToDate(train.departureTime).addMinutes(delay)
  
  if (status == .waitForTrain) {
    return context.attributes.activityStartDate
  } else if (status == .inExchange) {
    let previousTrain = getPreviousTrainFromStationId(route: route, stationId: nextStationId)
    // since we're in exchange, use the arrival time of the previous train as the progress start time
    return isoDateStringToDate(previousTrain?.arrivalTime ?? "").addMinutes(delay)
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
  
  let departureDate = isoDateStringToDate(train.departureTime).addMinutes(delay)
  let arrivalDate = isoDateStringToDate(train.arrivalTime).addMinutes(delay)

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
@available(iOS 15, *)
func findClosestStationInRoute(route: Route, updatedDelay: Int? = nil, now: Date = .now) -> Int {
  // find the first station where the departure time is after the current time
  for train in route.trains {
    let delay = updatedDelay ?? train.delay
    let departureTime = isoDateStringToDate(train.departureTime).addMinutes(delay)
    let arrivalTime = isoDateStringToDate(train.arrivalTime).addMinutes(delay)
    
    if departureTime.addMinutes(1) > now {
      return train.orignStation
    } else {
      for station in train.stopStations {
        if isoDateStringToDate(station.departureTime).addMinutes(delay + 1) > now {
          return station.id
        }
      }
    }
    if (arrivalTime > now) {
      return train.destinationStation
    }
  }
  
  return route.trains.last!.destinationStation
}

@available(iOS 16.1, *)
func getActivityStatus(route: Route, train: Train, nextStationId: Int, updatedDelay: Int? = nil, now: Date = .now) -> ActivityStatus {
  let delay = updatedDelay ?? train.delay
  
  if train.orignStation == nextStationId {
    if route.trains[0].orignStation == train.orignStation {
      return .waitForTrain
    }
    
    if let previousTrain = getPreviousTrainFromStationId(route: route, stationId: nextStationId) {
      let arrivalTimeToExchangeStation = isoDateStringToDate(previousTrain.arrivalTime).addMinutes(delay)
      let timeToExchange = arrivalTimeToExchangeStation.timeIntervalSince(now)
            
      if timeToExchange <= 0 {
        return getActivityStatus(route: route, train: previousTrain, nextStationId: nextStationId)
      } else if timeToExchange <= 60 {
        return .getOff
      }
    }
  }
  
  if train.destinationStation == nextStationId {
    let departureTime = isoDateStringToDate(train.departureTime).addMinutes(delay)
    let arrivalTime = isoDateStringToDate(train.arrivalTime).addMinutes(delay)
    let timeToArrival = arrivalTime.timeIntervalSince(now)
    
    if departureTime.addMinutes(delay) >= now {
      return .inExchange
    } else if timeToArrival >= 60 {
      return .inTransit
    } else if timeToArrival >= 0 {
      return .getOff
    } else {
      return .arrived
    }
  }
  
  return .inTransit
}

@available(iOS 16.1, *)
func getActivityCurrentState(route: Route, updatedDelay: Int? = nil, now: Date = .now) throws -> BetterRailActivityAttributes.ContentState {
  let nextStationId = findClosestStationInRoute(route: route, updatedDelay: updatedDelay, now: now)
  let train = getTrainFromStationId(route: route, stationId: nextStationId)!
  let status = getActivityStatus(route: route, train: train, nextStationId: nextStationId, updatedDelay: updatedDelay, now: now)
  
  return BetterRailActivityAttributes.ContentState(
    delay: updatedDelay ?? train.delay,
    nextStationId: nextStationId,
    status: status
  )
}

extension Date {
  func addMinutes(_ delay: Int) -> Date {
    let calendar = Calendar.current
    return calendar.date(byAdding: .minute, value: delay, to: self)!
  }
}
