import SwiftUI

let sortedStations = stations.sorted(by: {$0.name < $1.name})

struct SearchView: View {
  @State var origin: Station?
  @State var destination: Station?
  
  @State var isOriginOpen = false
  @State var isDestinationOpen = false
  @State var isRoutesOpen = false
  
    var body: some View {
        ScrollView {
          header("from")
          NavigationLink(origin?.name ?? String(localized: "origin"), isActive: $isOriginOpen) {
            List {
              ForEach(sortedStations) { station in
                Text(station.name)
                  .onTapGesture {
                    origin = station
                    isOriginOpen = false
                  }
              }
            }
            .navigationTitle("origin")
            .navigationBarTitleDisplayMode(.inline)
          }
          
          header("to")
          NavigationLink(destination?.name ?? String(localized: "destination"), isActive: $isDestinationOpen) {
            List {
              ForEach(sortedStations) { station in
                Text(station.name)
                  .onTapGesture {
                    destination = station
                    isDestinationOpen = false
                  }
              }
            }
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
