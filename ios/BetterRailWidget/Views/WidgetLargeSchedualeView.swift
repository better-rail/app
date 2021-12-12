import SwiftUI

struct WidgetLargeSchedualeView: View {
    let upcomingTrains: [UpcomingTrain]
  
    var body: some View {
      VStack(spacing: 8) {
        if (upcomingTrains.count == 0) {
          Text("No more trains for today.")
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
              Text("platform \(train.platform)")
              Spacer()
              Text(LocalizedStringKey("train \(train.trainNumber)"))
              Spacer()
            }
            .font(.system(size: 16)).foregroundColor(.gray)
            .frame(idealHeight: 30)
          }

        }
    }
  }
}
