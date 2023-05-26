import Foundation
import BackgroundTasks

@objc(UpdateLiveActivityTaskScheduler)
class UpdateLiveActivityTaskScheduler: NSObject {
  @objc static let shared = UpdateLiveActivityTaskScheduler()
  let UPDATE_LIVE_ACTIVITY_IDENTIFIER = "il.co.better-rail.updateLiveActivity"
  
  @objc func registerTasks() {
    BGTaskScheduler.shared.register(forTaskWithIdentifier: UPDATE_LIVE_ACTIVITY_IDENTIFIER, using: nil) { task in
      Task {
        await self.handleTask(task: task)
      }
    }
  }
  
  func scheduleTask(interval: TimeInterval) {
    let taskRequest = BGProcessingTaskRequest(identifier: UPDATE_LIVE_ACTIVITY_IDENTIFIER)
    taskRequest.requiresNetworkConnectivity = false
    taskRequest.requiresExternalPower = false
    taskRequest.earliestBeginDate = Date(timeIntervalSinceNow: interval)
    
    do {
      try BGTaskScheduler.shared.submit(taskRequest)
    } catch {
      print("Could not schedule background task: \(error)")
    }
  }
  
  private func handleTask(task: BGTask) async {
    guard #available(iOS 16.2, *),
          let activity = LiveActivitiesController.currentActivity,
          let route = LiveActivitiesController.route,
          let lastUpdateTime = LiveActivitiesController.lastUpdateTime
    else {
      print("No active ride is present")
      task.setTaskCompleted(success: true)
      return
    }
    
    task.expirationHandler = {
      self.scheduleTask(interval: 60)
    }
    
    let shouldUpdateActivity =
      activity.content.state.updatedByBGTask ||
      abs(lastUpdateTime.timeIntervalSinceNow) > 60
    
    var didEndActivity = false
    
    if shouldUpdateActivity {
      do {
        let newContent = try getActivityCurrentState(route: route, updatedDelay: activity.content.state.delay)
        
        if newContent.status != .arrived {
          await activity.update(using: newContent)
        } else {
          await activity.end(using: newContent, dismissalPolicy: .after(.now.addMinutes(3)))
          didEndActivity = true
        }
      } catch {
        print("Couldn't update activity content")
      }
    } else {
      print("Activity is already updated, no need to update content")
    }
    
    if !didEndActivity {
      self.scheduleTask(interval: 60)
    }
    
    task.setTaskCompleted(success: true)
  }
}
