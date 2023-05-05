import SwiftUI

struct WidgetLargeScheduleView: View {
    let upcomingTrains: [UpcomingTrain]
  
    var body: some View {
      VStack(spacing: 8) {
        if (upcomingTrains.count == 0) {
          VStack {
            Spacer()
            Image(systemName: "tram").padding(.vertical, 1).font(.system(size: 24))
            Text("No more trains for today.")
            Spacer()
          }.padding(.bottom, 16)
          
        }
        else {
          ForEach(upcomingTrains) { train in
            HStack(alignment: .firstTextBaseline) {
              Spacer()
              Text(train.departureTime)
                .font(.system(size: 20))
                .foregroundColor(Color(UIColor.label))
              Spacer()
              Text(train.arrivalTime).frame(minWidth: 40)
              Spacer()
              Text("Platform \(String(train.platform))")
              Spacer()
              Text(LocalizedStringKey("train \(String(train.trainNumber))"))
              Spacer()
            }
            .font(.system(size: 16)).foregroundColor(.gray)
            .frame(idealHeight: 30)
          
          }
        }
      }
        
  }
}
