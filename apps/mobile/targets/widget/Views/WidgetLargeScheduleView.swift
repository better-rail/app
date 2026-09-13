import SwiftUI

struct WidgetLargeScheduleView: View {
    let upcomingTrains: [UpcomingTrain]
    let statusCode: String
  
    var body: some View {
      if (upcomingTrains.count == 0) {
        VStack {
          Spacer()
          Image(systemName: "tram").padding(.vertical, 1).font(.system(size: 24))
          Text(statusCode == "404" ? "Something went wrong." : "No more trains for today.")
          Spacer()
        }.padding(.bottom, 16)
      }
      else {
        WidgetScheduleTable(upcomingTrains: upcomingTrains, compact: true)
          .padding(.horizontal, 20)
          .padding(.top, 6)
          .padding(.bottom, 10)
      }
  }
}
