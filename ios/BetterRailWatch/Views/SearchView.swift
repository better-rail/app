import SwiftUI

struct SearchView: View {
  @State var origin: Station?
  @State var destination: Station?
  
    var body: some View {
        ScrollView {
          header("from")
          NavigationLink(origin?.name ?? String(localized: "origin")) {
            StationSelector(selectedStation: $origin)
              .navigationTitle("origin")
              .navigationBarTitleDisplayMode(.inline)
          }
          
          header("to")
          NavigationLink(destination?.name ?? String(localized: "destination")) {
            StationSelector(selectedStation: $destination)
              .navigationTitle("destination")
              .navigationBarTitleDisplayMode(.inline)
          }
          
          NavigationLink {
            getRoutesView()
          } label: {
            Text("search")
              .foregroundColor((origin == nil) || (destination == nil) ? .gray : .blue)
          }
          .disabled((origin == nil) || (destination == nil))
        }
        .navigationTitle("search route")
        .navigationBarTitleDisplayMode(.inline)
    }
  
  @ViewBuilder
  func getRoutesView() -> some View {
    if let origin, let destination {
      RoutesView(route: RouteViewModel(origin: origin, destination: destination))
        .navigationTitle("Schedule")
    } else {
      EmptyView()
    }
  }
  
  @ViewBuilder
  func header(_ text: String.LocalizationValue) -> some View {
    HStack {
      Text(String(localized: text))
        .foregroundColor(.gray)
      Spacer()
    }
  }
}

struct SearchView_Previews: PreviewProvider {
    static var previews: some View {
      NavigationView {
        SearchView()
      }
    }
}
