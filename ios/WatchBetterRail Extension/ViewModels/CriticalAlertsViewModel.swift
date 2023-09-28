import Foundation

class CriticalAlertsViewModel: ObservableObject {
  let alertsModel = CriticalAlertsModel()
  private var lastRequest: Date?

  @Published var messages: Array<PopUpMessage> = []
  @Published var loading = false
  
  init() {
    fetchCriticalAlerts()
  }
  
  var title: String {
    return messages.first?.title ?? "Critical Alerts"
  }
  
  var body: String {
    return messages.map { $0.messageBody }
            .joined(separator: "\n\n")
  }
  
  private func fetchCriticalAlerts() {
    self.loading = true

    Task {
      let criticalAlerts = await alertsModel.fetchCriticalAlerts()
      
      DispatchQueue.main.async {
        self.loading = false
        self.lastRequest = Date()
        if let messages = criticalAlerts?.result {
          #if DEBUG
          self.messages = [
            PopUpMessage(id: 1, pageTypeId: 1, title: "שימו לב!", messageBody: "בעקבות תקלת קטר רכבת תקועה בין חדרה לנתניה. חלים עיכובים משמעותיים בקו החוף. אנו ממליצים להשתמש באמצעי תחבורה חלופיים.", startDate: "", endDate: "", systemTypeId: 1),
            PopUpMessage(id: 2, pageTypeId: 1, title: "הודעה חשובה", messageBody: "שינויים בתנועת הרכבות ביום ו׳ 29/9 עקב עבודות תחזוקה", startDate: "", endDate: "", systemTypeId: 1)
          ]
          #else
          self.messages = messages
          #endif
        }
      }
    }
  }
  
  /// Check how if enough time has passed since the last API call, and issue a new request if it did.
  ///
  /// Since the app can stay in memory for long periods, we need check if it's needed to update the alert data from time to time.
  func shouldRefetchCriticalAlerts(timeSinceLastRequest: Double = 120) {
    if let lastRequestDate = lastRequest {
      let now = Date()
      if now.timeIntervalSince(lastRequestDate) > timeSinceLastRequest {
        fetchCriticalAlerts()
      }
    } else {
      fetchCriticalAlerts()
    }
  }
}
