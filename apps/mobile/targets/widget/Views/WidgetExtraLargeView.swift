import WidgetKit
import SwiftUI

/// The tall `systemExtraLargePortrait` widget (iOS 27): a hero card with the next train
/// on top of the origin station photo, and a full schedule table underneath.
struct WidgetExtraLargeView: View {
  var entry: TrainDetail

  private let heroHeight: CGFloat = 170

  private var errorMessage: String? {
    getNoTrainsMessage(statusCode: entry.departureTime, date: entry.date)
  }

  private var upcomingTrains: [UpcomingTrain] {
    entry.upcomingTrains ?? []
  }

  private var accent: Color {
    Color(entry.isTomorrow ? "purply" : "pinky")
  }

  var body: some View {
    VStack(spacing: 0) {
      hero
        .frame(height: heroHeight)
        .background(WidgetBackground(image: entry.origin.image, height: heroHeight))
        .clipped()

      schedule
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .padding(.horizontal, 20)
        .padding(.top, 11)
        .padding(.bottom, 18)
    }
    .widgetBackground(Color(UIColor.secondarySystemBackground))
  }

  // MARK: - Hero

  private var hero: some View {
    VStack(alignment: .leading, spacing: 0) {
      HStack(alignment: .top) {
        WidgetRouteView(originName: entry.origin.name, destinationName: entry.destination.name, scale: 1.2)

        Spacer(minLength: 12)

        if let label = entry.label, !label.isEmpty {
          Text(label)
            .font(.system(size: 12, weight: .semibold))
            .foregroundColor(.white)
            .padding(.horizontal, 10)
            .padding(.vertical, 5)
            .background(.white.opacity(0.18), in: Capsule())
        }
      }

      Spacer()

      if let errorMessage {
        Text(errorMessage)
          .font(.system(size: 17, weight: .semibold))
          .foregroundColor(accent)
      } else {
        // One baseline row, like the large widget: big time, then the smaller stats.
        HStack(alignment: .lastTextBaseline, spacing: 12) {
          VStack(alignment: .leading, spacing: 2) {
            Text(entry.isTomorrow ? "TOMORROW" : "NEXT TRAIN")
              .preferredFont(size: 11.5)
              .fontWeight(.semibold)
              .foregroundColor(accent)
              .widgetAccentable()

            Text(entry.departureTime)
              .font(.system(size: 38, weight: .bold))
              .monospacedDigit()
              .foregroundColor(.white)
              .fixedSize()
          }
          .layoutPriority(1)

          heroStat("ARRIVAL", entry.arrivalTime)
          if entry.platform != 0 {
            heroStat("PLATFORM", String(entry.platform))
          }
          heroStat("TRAIN NO.", String(entry.trainNumber))
        }
      }
    }
    .padding(.horizontal, 20)
    .padding(.top, 18)
    .padding(.bottom, 12)
    .frame(maxWidth: .infinity, alignment: .leading)
    .clipped()
  }

  private func heroStat(_ title: LocalizedStringKey, _ value: String) -> some View {
    VStack(alignment: .leading, spacing: 1) {
      Text(title)
        .preferredFont(size: 11)
        .fontWeight(.medium)
        .foregroundColor(.white.opacity(0.6))
      Text(value)
        .font(.system(size: 22, weight: .bold))
        .monospacedDigit()
        .foregroundColor(.white.opacity(0.92))
    }
    .lineLimit(1)
    .minimumScaleFactor(0.8)
  }

  // MARK: - Schedule

  @ViewBuilder
  private var schedule: some View {
    if upcomingTrains.isEmpty {
      // The hero already says why; keep this half calm.
      Image(systemName: "tram")
        .font(.system(size: 44, weight: .light))
        .foregroundColor(Color(.quaternaryLabel))
    } else {
      WidgetScheduleTable(upcomingTrains: upcomingTrains)
    }
  }
}
