import SwiftUI

class MinuteTimer: ObservableObject {
  @Published var currentTime = Date()
  
  var timer: Timer?

  init() {
    let currentSeconds = Calendar.current.component(.second, from: Date())
    let secondsToNextMinute = 60 - currentSeconds

    DispatchQueue.main.asyncAfter(deadline: .now() + .seconds(secondsToNextMinute)) {
      self.currentTime = Date()
      self.timer = Timer.scheduledTimer(withTimeInterval: 60, repeats: true) { _ in
        self.currentTime = Date()
      }
    }
  }
  
  deinit {
    self.timer?.invalidate()
  }
}
