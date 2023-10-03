import SwiftUI

let sortedStations = stations.sorted(by: {$0.name < $1.name})

func formatSearchString(_ string: String) -> String {
  string
    .lowercased()
    .replacingOccurrences(of: " ", with: "")
    .replacingOccurrences(of: "-", with: "")
    .replacingOccurrences(of: "\u{200f}", with: "", options: NSString.CompareOptions.literal)
}

struct StationSelector: View {
  @Binding var selectedStation: Station?
  @Environment(\.dismiss) private var dismiss
  
  @State var searchValue = ""
  
  var filteredStations: [Station] {
    if searchValue.isEmpty {
      return sortedStations
    }
    
    return sortedStations.filter { station in
      let keys = [station.name, station.hebrew, station.english, station.russian, station.arabic]
      
      return keys.contains { value in
        if let value {
          return formatSearchString(value).contains(formatSearchString(searchValue))
        }
        
        return false
      }
    }
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
