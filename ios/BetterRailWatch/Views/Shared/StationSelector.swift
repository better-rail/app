import SwiftUI

let sortedStations = stations.sorted(by: {$0.name < $1.name})

struct StationSelector: View {
  @Binding var selectedStation: Station?
  @Environment(\.dismiss) private var dismiss
  
  @State var searchValue = ""
  
  var filteredStations: [Station] {
    if searchValue.isEmpty {
      return sortedStations
    }
    
    return sortedStations.filter { $0.name.lowercased().trimmingCharacters(in: .whitespaces).contains(searchValue.lowercased().trimmingCharacters(in: .whitespaces)) }
  }
  
    var body: some View {
      List {
        ForEach(filteredStations) { station in
          HStack {
            Text(station.name)
            Spacer()
          }
          .contentShape(Rectangle())
          .onTapGesture {
            selectedStation = station
            dismiss()
          }
        }
      }
      .searchable(text: $searchValue, prompt: "search")
    }
}

#Preview {
  StationSelector(selectedStation: .constant(nil))
}
