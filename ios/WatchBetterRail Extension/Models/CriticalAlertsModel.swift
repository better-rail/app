import Foundation

struct PopUpMessagesResult: Decodable, Encodable {
  let creationDate: String
  let version: String
  let statusCode: Int
  let result: [PopUpMessage]
}

struct PopUpMessage: Decodable, Encodable, Identifiable {
  let id: Int
  let pageTypeId: Int
  let title: String
  let messageBody: String
  let startDate: String
  let endDate: String
  let systemTypeId: Int
}

struct CriticalAlertsModel {
  func fetchCriticalAlerts(completion: @escaping (PopUpMessagesResult?) -> Void) {
      let language = getUserLocale().rawValue.capitalized
      let url = URL(string: "https://israelrail.azurefd.net/common/api/v1/PopUpMessages/?LanguageId=\(language)&PageTypeId=MainPage")!
      
      var request = URLRequest(url: url)
      request.addValue("4b0d355121fe4e0bb3d86e902efe9f20", forHTTPHeaderField: "Ocp-Apim-Subscription-Key")
      
      DispatchQueue.global(qos: .userInitiated).async {
          URLSession.shared.dataTask(with: request) { data, _, _ in
            let decoder = JSONDecoder()
            
            do {
              let route = try decoder.decode(PopUpMessagesResult.self, from: data ?? Data())
              completion(route)
            } catch {
                print("Error decoding JSON: \(String(describing: error))")
                completion(nil)
                return
            }
          }
          .resume()
      }
  }

  func fetchCriticalAlerts() async -> PopUpMessagesResult? {
      return await withUnsafeContinuation { continuation in
          fetchCriticalAlerts { result in
            continuation.resume(returning: result)
          }
      }
  }
}
