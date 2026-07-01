import Foundation

struct PopUpMessagesResult: Decodable, Encodable {
  let creationDate: String
  let version: String
  let statusCode: Int
  var result: [PopUpMessage]
}

struct PopUpMessage: Decodable, Encodable, Identifiable {
  let id: Int
  let pageTypeId: Int
  let title: String
  let messageBody: String
  let startDate: String
  let endDate: String
}

struct CriticalAlertsModel {
  func fetchCriticalAlerts(completion: @escaping (PopUpMessagesResult?) -> Void) {
      let language = getUserLocale().rawValue.capitalized
      // Popup messages still come from the Israel Railways API, but via our server proxy.
      let urlString = "https://api.better-rail.co.il/api/v1/rail-api/common/api/v1/PopUpMessages/?LanguageId=\(language)&PageTypeId=MainPage"
      guard let url = URL(string: urlString) else {
          completion(nil)
          return
      }

      var request = URLRequest(url: url)
      
      DispatchQueue.global(qos: .userInitiated).async {
          URLSession.shared.dataTask(with: request) { data, _, _ in
            let decoder = JSONDecoder()
            
            do {
              var response = try decoder.decode(PopUpMessagesResult.self, from: data ?? Data())
              response.result = response.result
                .map({ message in
                  PopUpMessage(
                    id: message.id,
                    pageTypeId: message.pageTypeId,
                    title: message.title.htmlConvertedString,
                    messageBody: message.messageBody.htmlConvertedString,
                    startDate: message.startDate,
                    endDate: message.endDate
                  )
                })
                .filter({ message in
                  !message.title.isEmpty && !message.messageBody.isEmpty
                })
              
              completion(response)
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
