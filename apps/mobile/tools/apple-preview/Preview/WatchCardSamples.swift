import SwiftUI

/// Preview-only sample states for `WatchActivityCard`.
/// Shared by the iOS widget-extension previews and the watchOS preview app.
enum WatchCardSamples {
  /// UIColor.systemOrange / .systemGreen, spelled out so the samples compile on watchOS too.
  static let systemOrange = Color(red: 1.0, green: 0.584, blue: 0.0)
  static let systemGreen = Color(red: 0.204, green: 0.780, blue: 0.349)

  static let waiting = WatchActivityCardData(
    statusLabel: "headed to",
    stationName: "Tel Aviv - Savidor Center",
    badge: .platform(3),
    trainNumber: 6039,
    targetDate: Date().addingTimeInterval(12 * 60),
    delay: 0,
    isStale: false,
    isArrived: false,
    accentColor: systemOrange,
    isRTL: false
  )

  static let waitingDelayed = WatchActivityCardData(
    statusLabel: "headed to",
    stationName: "Haifa - Hof HaCarmel",
    badge: .platform(1),
    trainNumber: 431,
    targetDate: Date().addingTimeInterval(18 * 60),
    delay: 7,
    isStale: false,
    isArrived: false,
    accentColor: .purple,
    isRTL: false
  )

  static let exchange = WatchActivityCardData(
    statusLabel: "wait in",
    stationName: "Tel Aviv - HaHagana",
    badge: .platform(2),
    trainNumber: 6239,
    targetDate: Date().addingTimeInterval(4 * 60),
    delay: 0,
    isStale: false,
    isArrived: false,
    accentColor: systemOrange,
    isRTL: false
  )

  static let inTransit = WatchActivityCardData(
    statusLabel: "next station",
    stationName: "Herzliya",
    badge: .stopsLeft(3),
    trainNumber: 6039,
    targetDate: Date().addingTimeInterval(22 * 60),
    delay: 0,
    isStale: false,
    isArrived: false,
    accentColor: systemGreen,
    isRTL: false
  )

  static let getOff = WatchActivityCardData(
    statusLabel: "arrive",
    stationName: "Tel Aviv - Savidor Center",
    badge: .getOff,
    trainNumber: 6039,
    targetDate: Date().addingTimeInterval(60),
    delay: 0,
    isStale: false,
    isArrived: false,
    accentColor: systemGreen,
    isRTL: false
  )

  static let arrived = WatchActivityCardData(
    statusLabel: "arrived at",
    stationName: "Beer Sheva - Center",
    badge: .none,
    trainNumber: 6039,
    targetDate: Date(),
    delay: 0,
    isStale: false,
    isArrived: true,
    accentColor: systemGreen,
    isRTL: false
  )

  static let stale = WatchActivityCardData(
    statusLabel: "headed to",
    stationName: "Jerusalem - Yitzhak Navon",
    badge: .stopsLeft(2),
    trainNumber: 6039,
    targetDate: Date().addingTimeInterval(31 * 60),
    delay: 0,
    isStale: true,
    isArrived: false,
    accentColor: systemGreen,
    isRTL: false
  )

  static let hebrew = WatchActivityCardData(
    statusLabel: "headed to",
    stationName: "תל אביב - סבידור מרכז",
    badge: .platform(3),
    trainNumber: 6039,
    targetDate: Date().addingTimeInterval(12 * 60),
    delay: 0,
    isStale: false,
    isArrived: false,
    accentColor: systemOrange,
    isRTL: true
  )

  static let hebrewTransit = WatchActivityCardData(
    statusLabel: "next station",
    stationName: "הרצליה",
    badge: .stopsLeft(3),
    trainNumber: 6039,
    targetDate: Date().addingTimeInterval(22 * 60),
    delay: 0,
    isStale: false,
    isArrived: false,
    accentColor: systemGreen,
    isRTL: true
  )

  static let all: [(String, WatchActivityCardData)] = [
    ("Waiting", waiting),
    ("Waiting · delayed", waitingDelayed),
    ("Exchange", exchange),
    ("In transit", inTransit),
    ("Get off", getOff),
    ("Arrived", arrived),
    ("Stale", stale),
    ("Hebrew", hebrew),
    ("Hebrew transit", hebrewTransit),
  ]
}
