import Foundation


/// A set of common functions to be called from the RN app
@objc(RNBetterRail)
class RNBetterRail: NSObject {
  
  
  @objc static func requiresMainQueueSetup() -> Bool {
      return true
  }
  
  @objc func printMessage(_ message: String) {
      print("Message from RN: ", message)
  }
  
}
