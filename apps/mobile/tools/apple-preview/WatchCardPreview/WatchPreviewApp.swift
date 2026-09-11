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

private struct CardChrome: View {
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

private struct SingleCard: View {
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

private struct WatchCardGallery: View {
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
