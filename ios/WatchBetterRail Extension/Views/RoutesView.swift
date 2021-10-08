import SwiftUI


struct RoutesView: View {
  @ObservedObject var route: RouteViewModel
  
    var body: some View {
      VStack {
        HStack {
          Text("יציאה").foregroundColor(Color.gray)
          Spacer()
          Text("הגעה").foregroundColor(Color.gray)
        }.font(Font.custom("Heebo", size: 16))
        
        if (route.loading) { ProgressView().progressViewStyle(CircularProgressViewStyle())
        } else if (route.trains.count == 0) {
          Image(systemName: "tram").padding(.vertical, 2.0).font(.system(size: 24))
          Text("לא נמצאו רכבות להיום").font(Font.custom("Heebo", size: 14))
          Spacer()
        } else {
          List (0 ..< route.trains.count) { index in
            // TODO: Refactor train property names - too confusing!
            let trainRoute = route.trains[index]
            let trainDetails = route.trains[index].train
            let trainDetailsView = TrainDetailsView(trainRoute: trainRoute)
            
            NavigationLink(destination: trainDetailsView) {
              HStack {
                Text(formatRouteHour(trainDetails[0].departureTime))
                Spacer()
                Image(systemName: "arrow.left")
                Spacer()
                Text(formatRouteHour(trainDetails[route.trains[index].train.count - 1].arrivalTime))
              }
            }
          }.listStyle(CarouselListStyle()).environment(\.defaultMinListRowHeight, 50)
        }
      }.onAppear {
        route.shouldRefetchRoutes()
      }
    }
  }

struct RoutesView_Previews: PreviewProvider {
    static var previews: some View {
      RoutesView(route: RouteViewModel(origin: stations[0], destination: stations[1]))
    }
}
