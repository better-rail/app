import SwiftUI

/// Upcoming trains as a table with depart / arrive / duration / platform / train columns.
/// Shared by the large and extra large widgets; `compact` tightens it for the large one.
struct WidgetScheduleTable: View {
  let upcomingTrains: [UpcomingTrain]
  var compact = false

  private var minRowHeight: CGFloat { compact ? 29 : 42 }
  private var maxRowHeight: CGFloat { compact ? 36 : 48 }
  private var maxRows: Int { compact ? 5 : 9 }
  private var departSize: CGFloat { compact ? 17 : 19 }
  private var timeSize: CGFloat { compact ? 15 : 17 }
  private var detailSize: CGFloat { compact ? 13.5 : 15 }

  private var headerHeight: CGFloat { compact ? 17 : 20 }

  var body: some View {
    GeometryReader { geometry in
      // Show as many rows as fit at the minimum height; they then share the height evenly
      // up to a cap, and anything left stays empty at the bottom.
      let available = geometry.size.height - headerHeight
      let visibleCount = max(1, min(upcomingTrains.count, maxRows, Int(available / minRowHeight)))
      let rows = Array(upcomingTrains.prefix(visibleCount))
      let rowHeight = min(maxRowHeight, available / CGFloat(visibleCount))

      Grid(alignment: .leading, horizontalSpacing: 0, verticalSpacing: 0) {
        GridRow {
          columnHeader("departure")
          columnHeader("arrival")
          columnHeader("DURATION")
          columnHeader("PLATFORM")
          columnHeader("TRAIN")
            .gridColumnAlignment(.trailing)
        }
        .frame(height: headerHeight, alignment: .top)

        ForEach(rows) { train in
          Divider()
          GridRow {
            Text(train.departureTime)
              .font(.system(size: departSize, weight: .semibold))
              .foregroundColor(.primary)
            Text(train.arrivalTime)
              .font(.system(size: timeSize, weight: .medium))
              .foregroundColor(.secondary)
            Text(durationLabel(train))
              .font(.system(size: detailSize, weight: .medium))
              .foregroundColor(.secondary)
            Text(train.platform != 0 ? String(train.platform) : "–")
              .font(.system(size: timeSize, weight: .medium))
              .foregroundColor(.secondary)
            Text(String(train.trainNumber))
              .font(.system(size: detailSize, weight: .medium))
              .foregroundColor(Color(.tertiaryLabel))
              .gridColumnAlignment(.trailing)
          }
          .monospacedDigit()
          .frame(height: rowHeight)
        }
      }
    }
  }

  private func columnHeader(_ key: LocalizedStringKey) -> some View {
    Text(key)
      .preferredFont(size: compact ? 10 : 10.5)
      .fontWeight(.semibold)
      .foregroundColor(Color(.tertiaryLabel))
      .textCase(.uppercase)
  }

  private func durationLabel(_ train: UpcomingTrain) -> String {
    guard let minutes = minutesBetween(train.departureTime, train.arrivalTime) else { return "" }
    if minutes >= 60 {
      return String(format: String(localized: "%@h %@m"), String(minutes / 60), String(minutes % 60))
    }
    return String(format: String(localized: "%@ min"), String(minutes))
  }

  /// Minutes between two "HH:mm" strings, rolling over midnight.
  private func minutesBetween(_ from: String, _ to: String) -> Int? {
    func minutes(_ time: String) -> Int? {
      let parts = time.split(separator: ":").compactMap { Int($0) }
      guard parts.count == 2 else { return nil }
      return parts[0] * 60 + parts[1]
    }
    guard let start = minutes(from), let end = minutes(to) else { return nil }
    return end >= start ? end - start : end + 24 * 60 - start
  }
}
