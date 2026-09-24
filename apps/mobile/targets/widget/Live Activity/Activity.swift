import Foundation
import SwiftUI
import ActivityKit

enum ActivityStatus: String, Codable {
    case waitForTrain
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
  var viaStationId: Int? { route.viaStationId.flatMap(Int.init) }
  
  var frequentPushesEnabled: Bool = true
}

class LiveActivitiesController {
  typealias LiveActivityRoute = Activity<BetterRailActivityAttributes>
  static let shared = LiveActivitiesController()
  static var env: String = "production"
  static var route: Route? = nil
  static var tokenRegistry = TokenRegistry()
  static var currentActivity: Activity<BetterRailActivityAttributes>? = nil
  static var lastUpdateTime: Date? = nil
  /// How long a start waits for the push token and the server's ride ID.
  static let rideStartTimeout: TimeInterval = 30

  /// Returns the new activity's ID. Throws when the system refuses the activity, so the caller doesn't wait for a push token that never comes.
  func startLiveActivity(route: Route) async throws -> String {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
      throw NSError(domain: "live-activity", code: 1002, userInfo: [NSLocalizedDescriptionKey: "Live Activities are disabled."])
    }

    let route = trimmedForActivity(route)

    do {
      let initialContentState = try getActivityCurrentState(route: route)

      let activityAttributes = BetterRailActivityAttributes(activityStartDate: Date(), route: route)

      let activityContent = ActivityContent(state: initialContentState, staleDate: Date().addMinutes(2))

      let activity = try Activity.request(attributes: activityAttributes, content: activityContent, pushType: .token)
      await LiveActivitiesController.tokenRegistry.track(activityId: activity.id)
      LiveActivitiesController.route = route
      LiveActivitiesController.currentActivity = activity
      LiveActivitiesController.lastUpdateTime = Date()

      print("Requested live activity, details: \(activity.attributes)")
      return activity.id
    } catch (let error) {
      print("Error occurred during live activity initial request \(error.localizedDescription).")
      throw error
    }
  }

  /// ActivityKit rejects attributes over 4KB, which full `routeStations` push 3-train routes past.
  /// The activity only reads each train's last stop, so keep just that.
  private func trimmedForActivity(_ route: Route) -> Route {
    let trains = route.trains.map { train in
      Train(trainNumber: train.trainNumber, orignStation: train.orignStation, destinationStation: train.destinationStation,
            arrivalTime: train.arrivalTime, departureTime: train.departureTime, stopStations: train.stopStations,
            routeStations: train.routeStations.suffix(1).map { $0 }, originPlatform: train.originPlatform,
            destPlatform: train.destPlatform, trainPosition: train.trainPosition)
    }
    return Route(departureTime: route.departureTime, arrivalTime: route.arrivalTime, trains: trains, viaStationId: route.viaStationId)
  }
  
  
  func monitorLiveActivities() {
      // Listen to on-going and new Live Activities.
      Task {
          for await activity in Activity<BetterRailActivityAttributes>.activityUpdates {
            print("Activity received an update: \(activity.content.state)")
            LiveActivitiesController.lastUpdateTime = Date()
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
                  // Dropping the registration also releases a start still waiting on this activity.
                  await LiveActivitiesController.tokenRegistry.delete(activityId: activity.id)
                  if activity.id == LiveActivitiesController.currentActivity?.id {
                    clearCurrentActivity()
                  }

            case .stale:
              print("Activity became staled")

            @unknown default:
                  print("Live activity '\(activity.id)' unknown state '\(String(describing: state))'.")
              }
          }
      }
  }

  private func monitorLiveActivityTokenChanges(_ activity: LiveActivityRoute) {
    Task {
        // Listen to push token updates of each active activity.
        for await token in activity.pushTokenUpdates {
          let decodedToken = token.map { String(format: "%02x", $0) }.joined()

          switch await LiveActivitiesController.tokenRegistry.registerToken(activityId: activity.id, token: decodedToken) {
          case .startRide:
            registerLiveActivity(activity, token: decodedToken)
          case .updateToken(let rideId):
            await ActivityNotificationsAPI.updateRideToken(rideId: rideId, token: decodedToken)
          case .nothing:
            break
          }
        }
    }
  }


  private func registerLiveActivity(_ activity: LiveActivityRoute, token: String) {
    let details = activity.attributes
          
    let ride = Ride(token: token, departureDate: details.departureTime, originId: details.originStationId, destinationId: details.destinationStationId, trains: details.trainNumbers, locale: "en", viaStationId: details.viaStationId)

    Task.init {
      // startRide returns nil on any server failure; flag it so the waiting start rejects.
      guard let rideId = await ActivityNotificationsAPI.startRide(ride: ride) else {
        await LiveActivitiesController.tokenRegistry.markFailed(activityId: activity.id)
        return
      }

      guard let latestToken = await LiveActivitiesController.tokenRegistry.setRideId(activityId: activity.id, rideId: rideId) else {
        // The activity ended (or the start timed out) while the request was in flight.
        _ = try? await ActivityNotificationsAPI.endRide(rideId: rideId)
        return
      }

      if latestToken != token {
        await ActivityNotificationsAPI.updateRideToken(rideId: rideId, token: latestToken)
      }

      print("Live activity (\(activity.id)) registered.")
    }
  }

  func endLiveActivity(rideId: String) async {
    // Clear before awaiting `end`, so the `.ended` event it triggers finds nothing left to clean up.
    let activity = LiveActivitiesController.currentActivity
    clearCurrentActivity()

    await LiveActivitiesController.tokenRegistry.deleteRide(rideId: rideId)
    await activity?.end(dismissalPolicy: .immediate)
    print("Ride (\(rideId)) ended.")
  }

  /// Ends an activity whose ride never started.
  func endLiveActivity(activityId: String) async {
    let activity = Activity<BetterRailActivityAttributes>.activities.first(where: { $0.id == activityId })
    if activityId == LiveActivitiesController.currentActivity?.id {
      clearCurrentActivity()
    }

    await LiveActivitiesController.tokenRegistry.delete(activityId: activityId)
    await activity?.end(dismissalPolicy: .immediate)
  }

  private func clearCurrentActivity() {
    LiveActivitiesController.currentActivity = nil
    LiveActivitiesController.route = nil
    LiveActivitiesController.lastUpdateTime = nil
  }
}
