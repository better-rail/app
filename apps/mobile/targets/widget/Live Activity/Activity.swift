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
    /// The platform of the train the rider waits for. The route above is fixed when the ride starts,
    /// so the server sends a platform changed since. Missing from older servers and from the app's own updates.
    var platform: Int? = nil
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
  /// The recurring ride the server started this activity for, with push-to-start. Nil for a ride started in the app.
  var scheduleId: String? = nil
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

    // Only one ride runs at a time, so an activity still on screen lost its ride and no longer gets updates.
    await end(Activity<BetterRailActivityAttributes>.activities)

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
  
  
  /// Where the latest push-to-start token is kept for JS, which syncs it to the server.
  static let pushToStartTokenKey = "liveActivityPushToStartToken"
  private static var isMonitoring = false

  /// Called from the AppDelegate, so a launch by push-to-start (which may not load JS) registers the ride, and from JS.
  func monitorLiveActivities() {
      if LiveActivitiesController.isMonitoring { return }
      LiveActivitiesController.isMonitoring = true

      // A push-started activity exists before the app launches, so activityUpdates never reports it. Only those are
      // picked up here: an activity the app started in an earlier launch already has a server ride.
      for activity in Activity<BetterRailActivityAttributes>.activities
      where activity.attributes.scheduleId != nil && activity.activityState == .active {
        monitorLiveActivity(activity)
        monitorLiveActivityTokenChanges(activity)
      }

      // Listen to on-going and new Live Activities.
      Task {
          let activityIds = Set(Activity<BetterRailActivityAttributes>.activities.map(\.id))
          await LiveActivitiesController.tokenRegistry.prune(keeping: activityIds)

          for await activity in Activity<BetterRailActivityAttributes>.activityUpdates {
            print("Activity received an update: \(activity.content.state)")
            LiveActivitiesController.lastUpdateTime = Date()
            monitorLiveActivity(activity)
          }
      }

      if #available(iOS 17.2, *) {
        Task {
          // Subscribing makes ActivityKit flush every pending token, the activities' update tokens included. Let the
          // observers above attach first, or a push-started activity's update token reaches nobody and isn't replayed.
          try? await Task.sleep(for: .seconds(1))
          for await tokenData in Activity<BetterRailActivityAttributes>.pushToStartTokenUpdates {
            let token = tokenData.map { String(format: "%02x", $0) }.joined()
            UserDefaults.standard.set(token, forKey: LiveActivitiesController.pushToStartTokenKey)
          }
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
        // A token issued before this observer attached (a push-started activity's) isn't replayed, so read it first.
        // The registry ignores a token it already has, so it and its replay register once.
        if let current = activity.pushToken {
          await handleToken(current, for: activity)
        }
        // Listen to push token updates of each active activity.
        for await token in activity.pushTokenUpdates {
          await handleToken(token, for: activity)
        }
    }
  }

  private func handleToken(_ token: Data, for activity: LiveActivityRoute) async {
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


  private func registerLiveActivity(_ activity: LiveActivityRoute, token: String) {
    let details = activity.attributes
          
    let ride = Ride(token: token, departureDate: details.departureTime, originId: details.originStationId, destinationId: details.destinationStationId, trains: details.trainNumbers, locale: "en", viaStationId: details.viaStationId)

    Task.init {
      let rideId: String
      switch await ActivityNotificationsAPI.startRide(ride: ride) {
      case .success(let id):
        rideId = id
      case .failure(let failure):
        // Flag it so the waiting start rejects, saying why.
        await LiveActivitiesController.tokenRegistry.markFailed(activityId: activity.id, failure: failure)
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
    let registry = LiveActivitiesController.tokenRegistry
    let rideActivityId = await registry.activityId(rideId: rideId)

    // Also end activities the registry doesn't know (e.g. their ride never started before a relaunch).
    // Otherwise the ride's activity stays on screen after the server stops updating it.
    var activities: [LiveActivityRoute] = []
    for activity in Activity<BetterRailActivityAttributes>.activities {
      let isKnown = await registry.isKnown(activityId: activity.id)
      if activity.id == rideActivityId || !isKnown {
        activities.append(activity)
      }
    }

    await end(activities)
    print("Ride (\(rideId)) ended.")
  }

  private func end(_ activities: [LiveActivityRoute]) async {
    for activity in activities {
      // Clear before awaiting `end`, so the `.ended` event it triggers finds nothing left to clean up.
      if activity.id == LiveActivitiesController.currentActivity?.id {
        clearCurrentActivity()
      }

      await LiveActivitiesController.tokenRegistry.delete(activityId: activity.id)
      await activity.end(dismissalPolicy: .immediate)
    }
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
