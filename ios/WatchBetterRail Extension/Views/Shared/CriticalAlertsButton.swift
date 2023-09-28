import SwiftUI

struct CriticalAlertsButton: View {
  @State var isAlertOpen = false
  @Environment(\.criticalAlertsModel) var criticalAlertsModel: CriticalAlertsViewModel!

    var body: some View {
      if criticalAlertsModel.messages.isEmpty {
        EmptyView()
      } else {
        Button {
          isAlertOpen = true
        } label: {
          HStack {
            Image(systemName: "megaphone")
            Text("Critical Alert")
              .bold()
          }
          .padding(.top, -4)
          .padding(.vertical, 2)
          .padding(.horizontal, 6)
        }
        .padding(.top, 4)
        .buttonStyle(PlainButtonStyle())
        .background {
          Rectangle()
            .fill(.red)
            .cornerRadius(12)
        }
        .alert(isPresented: $isAlertOpen) {
          Alert(title: Text(criticalAlertsModel!.title), message: Text(criticalAlertsModel!.body))
        }
      }
    }
}

#Preview {
    CriticalAlertsButton()
      .environment(\.criticalAlertsModel, CriticalAlertsViewModel())
}
