import SwiftUI

/// watchOS app whose only job is to render `WatchActivityCard` at true watch scale,
/// so the Smart Stack card can be judged on an actual (simulated) watch screen.
///
/// Launch with `SIMCTL_CHILD_SAMPLE=<name>` to show a single sample full-screen
/// (see `shoot.sh`); with no env var it shows a scrollable gallery of every state.
@main
struct WatchPreviewApp: App {
  private var localeIdentifier: String {
    ProcessInfo.processInfo.environment["LOCALE"] ?? "en"
  }

  var body: some Scene {
    WindowGroup {
      Group {
        if let sample = ProcessInfo.processInfo.environment["SAMPLE"],
           let match = WatchCardSamples.all.first(where: { $0.0 == sample }) {
          SingleCard(title: match.0, data: match.1)
        } else {
          WatchCardGallery()
        }
      }
      .environment(\.locale, Locale(identifier: localeIdentifier))
      .environment(\.layoutDirection, Locale.Language(identifier: localeIdentifier).characterDirection == .rightToLeft ? .rightToLeft : .leftToRight)
    }
  }
}

struct CardChrome: View {
  var data: WatchActivityCardData

  // Mirrors the `.containerBackground` the real Live Activity applies for `.small`.
  var body: some View {
    WatchActivityCard(data: data)
      .padding(.horizontal, 12)
      .padding(.vertical, 8)
      .background {
        RoundedRectangle(cornerRadius: 18, style: .continuous)
          .fill(Color(white: 0.12))
          .overlay {
            LinearGradient(
              colors: [data.accentColor.opacity(0.16), .clear],
              startPoint: .top,
              endPoint: .bottom
            )
          }
          .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
      }
  }
}

struct SingleCard: View {
  var title: String
  var data: WatchActivityCardData

  var body: some View {
    VStack(spacing: 8) {
      Text(title)
        .font(.system(size: 11, weight: .semibold))
        .foregroundStyle(.tertiary)
      CardChrome(data: data)
    }
    .padding(.horizontal, 4)
  }
}

struct WatchCardGallery: View {
  var body: some View {
    ScrollView {
      VStack(spacing: 10) {
        ForEach(WatchCardSamples.all, id: \.0) { name, data in
          VStack(alignment: .leading, spacing: 3) {
            Text(name)
              .font(.system(size: 10, weight: .semibold))
              .foregroundStyle(.tertiary)
            CardChrome(data: data)
          }
        }
      }
      .padding(.horizontal, 4)
    }
  }
}

// MARK: - Previews
//
// Xcode has no preview kind for `ActivityFamily.small`, so these render the card view
// itself — no system Smart Stack chrome. They live in this watchOS target so the canvas
// draws them on a watch, and because a widget extension can only host widget previews.

#Preview("Waiting") {
  CardChrome(data: WatchCardSamples.waiting)
}

#Preview("Waiting · delayed") {
  CardChrome(data: WatchCardSamples.waitingDelayed)
}

#Preview("In transit") {
  CardChrome(data: WatchCardSamples.inTransit)
}

#Preview("Get off") {
  CardChrome(data: WatchCardSamples.getOff)
}

#Preview("Arrived") {
  CardChrome(data: WatchCardSamples.arrived)
}

#Preview("Stale") {
  CardChrome(data: WatchCardSamples.stale)
}

#Preview("Hebrew") {
  CardChrome(data: WatchCardSamples.hebrew)
    .environment(\.locale, .init(identifier: "he"))
    .environment(\.layoutDirection, .rightToLeft)
}

#Preview("All states") {
  WatchCardGallery()
}
