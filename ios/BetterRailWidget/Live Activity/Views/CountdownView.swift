import SwiftUI

struct CountdownView: View {
    let targetDate: Date
    var minutesLeft: Int {
      getMinutesLeft(targetDate: targetDate)
    }
    
    var body: some View {
      HStack (alignment: .firstTextBaseline, spacing: 4.0) {
        Text(String(minutesLeft)).font(.system(size: 28, weight: .heavy, design: .rounded))
        Text("min").font(.system(size: 20, weight: .bold, design: .rounded))
      }
    }
}
