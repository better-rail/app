import SwiftUI

struct CountdownView: View {
    let targetDate: Date
    let delay: Int
  
    var minutesLeft: Int {
      getMinutesLeft(targetDate: targetDate.addDelay(delay))
    }
    
    var body: some View {
      HStack (alignment: .firstTextBaseline, spacing: 4.0) {
        Text(String(minutesLeft)).font(.system(size: 28, weight: .heavy, design: .rounded))
        Text("min").font(.system(size: 20, weight: .bold, design: .rounded))
      }.foregroundColor(delay > 0 ? .red : .green)
    }
}
