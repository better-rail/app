import SwiftUI

/// Free of ActivityKit so `tools/apple-preview` can compile it for watchOS.
struct WatchActivityCardData {
  enum Badge {
    case platform(Int)
    case stopsLeft(Int)
    case getOff
    case none
  }

  var statusLabel: LocalizedStringKey
  var stationName: String
  var badge: Badge
  var trainNumber: Int
  var targetDate: Date
  var delay: Int
  var isStale: Bool
  var isArrived: Bool
  var accentColor: Color
  var isRTL: Bool
}

/// Live Activity card for the Apple Watch Smart Stack (`ActivityFamily.small`).
struct WatchActivityCard: View {
  var data: WatchActivityCardData

  private var minutesLeft: Int {
    max(1, Int(round(data.targetDate.timeIntervalSinceNow / 60)))
  }

  var body: some View {
    // Per-row spacing: the countdown makes the status row taller than its text, and the
    // badge capsule adds its own padding, so an even VStack spacing reads as uneven.
    VStack(alignment: .leading, spacing: 0) {
      statusRow
      Text(data.stationName)
        .font(.system(size: 16, weight: .bold))
        .lineLimit(1)
        .minimumScaleFactor(0.65)
      detailsRow
        .padding(.top, 2)
    }
    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
  }

  private var statusRow: some View {
    HStack(alignment: .firstTextBaseline, spacing: 4) {
      Text(data.statusLabel)
        .font(.system(size: 11, weight: .semibold))
        .lineLimit(1)
        .minimumScaleFactor(0.7)

      Spacer(minLength: 4)

      if !data.isArrived {
        countdown
      }
    }
    .foregroundStyle(.secondary)
  }

  private var countdown: some View {
    Group {
      if data.isStale {
        HStack(spacing: 3) {
          Image(systemName: "exclamationmark.circle.fill")
            .font(.system(size: 11, weight: .bold))
          Text(formatDateHour(data.targetDate))
            .font(.system(size: 17, weight: .heavy, design: .rounded))
        }
      } else {
        HStack(alignment: .firstTextBaseline, spacing: 2) {
          Text(String(minutesLeft))
            .font(.system(size: 19, weight: .heavy, design: .rounded))
            .contentTransition(.numericText())
          Text("min")
            .font(.system(size: 11, weight: .bold, design: .rounded))
        }
      }
    }
    .foregroundStyle(data.isStale ? Color.orange : data.accentColor)
  }

  @ViewBuilder private var detailsRow: some View {
    if data.isArrived {
      Text("thanks for riding with better rail")
        .font(.system(size: 12, weight: .medium))
        .lineLimit(2)
        .minimumScaleFactor(0.75)
        .foregroundStyle(.secondary)
    } else {
      HStack(spacing: 5) {
        badge

        Text("train short \(String(data.trainNumber))")
          .font(.system(size: 12, weight: .medium))
          .foregroundStyle(.secondary)
          .lineLimit(1)
          .minimumScaleFactor(0.7)

        Spacer(minLength: 0)

        if data.delay > 0 {
          Text("+\(String(data.delay)) min")
            .font(.system(size: 12, weight: .heavy, design: .rounded))
            .lineLimit(1)
            .foregroundStyle(.red)
        }
      }
    }
  }

  @ViewBuilder private var badge: some View {
    switch data.badge {
    case .platform(let platform):
      BadgeLabel(text: "platform \(String(platform))")
    case .stopsLeft(let stops):
      BadgeLabel(text: stops <= 1 ? "next stop" : "\(String(stops)) stops")
    case .getOff:
      BadgeLabel(text: "get off now")
    case .none:
      EmptyView()
    }
  }
}

private struct BadgeLabel: View {
  var text: LocalizedStringKey

  var body: some View {
    Text(text)
      .font(.system(size: 12, weight: .heavy))
      .lineLimit(1)
      .minimumScaleFactor(0.7)
      .padding(.horizontal, 6)
      .padding(.vertical, 2)
      .background(Color.yellow, in: Capsule())
      .foregroundStyle(.black)
  }
}
