import SwiftUI

private struct CustomEnvironmentKeys: EnvironmentKey {
  static var defaultValue: CriticalAlertsViewModel?
}

extension EnvironmentValues {
    var criticalAlertsModel: CriticalAlertsViewModel? {
        get { self[CustomEnvironmentKeys.self] }
        set { self[CustomEnvironmentKeys.self] = newValue }
    }
}
