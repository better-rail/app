import SwiftUI


struct RoutesView: View {
  @ObservedObject var route: RouteViewModel
  
  let deviceWidth = WKInterfaceDevice.current().screenBounds.width
  
    var body: some View {
      ScrollViewReader { proxy in
        VStack {
          if route.loading {
            ProgressView().progressViewStyle(CircularProgressViewStyle())
          } else if let requestError = route.error {
            InfoMessage(imageName: "wifi.exclamationmark", message: requestError.localizedDescription) {
              route.shouldRefetchRoutes()
            }
          } else if route.trains.count == 0 {
            InfoMessage(imageName: "tram", message: String(localized: "no-trains-found"))
          } else {
            List (route.trains) { trainDetails in
              let trainDetailsView = TrainDetailsView(trainRoute: trainDetails)
              
              NavigationLink(destination: trainDetailsView) {
                ZStack {
                  if trainDetails.delay > 0 {
                    Text("+\(String(trainDetails.delay)) min")
                      .font(Font.custom("Heebo", size: deviceWidth * 0.07))
                      .fontWeight(.bold)
                      .padding(.horizontal, 6)
                      .background(.red)
                      .cornerRadius(16)
                  } else {
                    Image(systemName: "arrow.forward")
                  }
                  
                  HStack {
                    HStack(spacing: trainDetails.delay > 0 ? 2 : nil) {
                      Text(formatRouteHour(trainDetails.departureTime))
                    }
                    
                    Spacer()
                    
                    Text(formatRouteHour(trainDetails.arrivalTime))
                  }
                }
              }
              .id(trainDetails.id)
            }
            .listStyle(CarouselListStyle()).environment(\.defaultMinListRowHeight, 50)
            .onAppear {
              if let nextTrain = route.nextTrain {
                proxy.scrollTo(nextTrain.id, anchor: .top)
              }
            }
          }
        }
        .onAppear {
          route.shouldRefetchRoutes()
        }
      }
    }
}

struct InfoMessage: View {
  var imageName: String
  var message: String
  var onTryAgain: (() -> Void)?
  
  var body: some View {
    VStack(alignment: .center) {
      Spacer()
      Image(systemName: imageName).padding(.vertical, 2.0).font(.system(size: 24))
      Text(message).font(Font.custom("Heebo", size: 14)).multilineTextAlignment(.center)
      if let onTryAgain {
        Button(action: onTryAgain, label: {
          Text("try again")
        })
      }
      Spacer()
    }
  }
}

struct RoutesView_Previews: PreviewProvider {
    static var previews: some View {
      RoutesView(route: RouteViewModel(origin: stations[0], destination: stations[1]))
    }
}
