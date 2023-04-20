import Foundation
import SwiftUI
import ActivityKit

enum ActivityStatus: String, Codable {
    case waitForTrain
    case getOn
    case inTransit
    case inExchange
    case getOff
    case arrived

    var color: Color {
      if (self == .inTransit || self == .getOff || self == .arrived) {
        return Color(uiColor: .systemGreen)
      } else {
        return Color(uiColor: .systemOrange)
      }
  }
}

struct BetterRailActivityAttributes: ActivityAttributes {
  // Dynamic stateful properties
  public struct ContentState: Codable, Hashable {
    var delay: Int
    var nextStationId: Int
    var status: ActivityStatus
    var nextStation: Station { getStationById(nextStationId) ?? ERR_STATION }
  }

  // Non-changing properties
  let activityStartDate: Date
  var route: Route
  var originStationId: Int { route.trains[0].orignStation }
  var destinationStationId: Int { route.trains[route.trains.count - 1].destinationStation }
  
  var originStation: Station { getStationById(originStationId) ?? ERR_STATION }
  var destinationStation: Station { getStationById(destinationStationId) ?? ERR_STATION }
  
  var departureTime: String { route.departureTime }
  var arrivalTime: String { route.arrivalTime }
  
  var departureDate: Date { isoDateStringToDate(route.departureTime) }
  var arrivalDate: Date { isoDateStringToDate(route.arrivalTime) }
  var trainNumbers: [Int] { route.trains.map { $0.trainNumber } }
  
  var frequentPushesEnabled: Bool = true
}

class LiveActivitiesController {
  typealias LiveActivityRoute = Activity<BetterRailActivityAttributes>
  static let shared = LiveActivitiesController()
  static var env: String = "test"
  static var rideId: String = ""
  
  func startLiveActivity(route: Route) async {
    if ActivityAuthorizationInfo().areActivitiesEnabled {
      // preapre activity initial content
        
      // request the activity from the system
      do {
        let initialContentState = try getActivityInitialState(route: route)
        
        let activityAttributes = BetterRailActivityAttributes(activityStartDate: Date(), route: route)
        
        let activityContent = ActivityContent(state: initialContentState, staleDate: Calendar.current.date(byAdding: .minute, value: 30, to: Date())!)

        let activity = try Activity.request(attributes: activityAttributes, content: activityContent, pushType: .token)
        print("Requested live activity, details: \(activity.attributes)")
      } catch (let error) {
          print("Error occured during live activity initial request \(error.localizedDescription).")
      }
    }
  }
  
  
  func monitorLiveActivities() {
      // Listen to on-going and new Live Activities.
      Task {
          for await activity in Activity<BetterRailActivityAttributes>.activityUpdates {
            print("Activity received an update: \(activity.content.state)")
            monitorLiveActivity(activity)
          }
      }
  }
//
  private func monitorLiveActivity(_ activity: LiveActivityRoute) {
      Task {
          // Listen to state changes of each activity.
          for await state in activity.activityStateUpdates {
            switch activity.activityState {
              case .active:
                  print("activity is active")
                  monitorLiveActivityTokenChanges(activity)

              case .dismissed, .ended:
                  print("activity has ended")
                  await endLiveActivity(activity)

            case .stale:
              print("Activity became staled")

            @unknown default:
                  print("Live activity '\(activity.id)' unknown state '\(String(describing: state))'.")
              }
          }
      }
  }

  private func monitorLiveActivityTokenChanges(_ activity: LiveActivityRoute) {
    let tokenRegistry = TokenRegistry()

    Task {
        // Listen to push token updates of each active activity.
        for await token in activity.pushTokenUpdates {
          let decodedToken = token.map { String(format: "%02x", $0) }.joined()
          let rideId = LiveActivitiesController.rideId
          
          let registerResponse = await tokenRegistry.registerTokenIfNew(rideId: rideId, token: decodedToken)
          
          if (registerResponse == .registeredNew) {
            await registerLiveActivity(activity, token: decodedToken)
          } else if (registerResponse == .registeredUpdate) {
            await updateLiveActivityToken(rideId: rideId, token: decodedToken)
          }
        }
    }
}


  private func registerLiveActivity(_ activity: LiveActivityRoute, token: String) async {
    let details = activity.attributes
          
    let ride = Ride(token: token, departureDate: details.departureTime, originId: details.originStationId, destinationId: details.destinationStationId, trains: details.trainNumbers, locale: "en")

    Task.init {
      let rideId = await ActivityNotificationsAPI.startRide(ride: ride)
      if rideId != nil {
        LiveActivitiesController.rideId = rideId!
      }
    }
    print("Live activity (\(activity.id)) registered.")
  }
  
  private func updateLiveActivityToken(rideId: String, token: String) async {
    await ActivityNotificationsAPI.updateRideToken(rideId: rideId, token: token)
  }


  private func endLiveActivity(_ activity: LiveActivityRoute) async {
    let rideId = LiveActivitiesController.rideId
    await ActivityNotificationsAPI.endRide(rideId: rideId)
    print("Live activity (\(activity.id)) ended.")
  }
}
