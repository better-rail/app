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
      // The server retired this endpoint (the Israel Railways proxy is gone): it now
      // always answers with an empty result, so no alert button is shown. The fetch is
      // kept so alerts light up again if the server ever serves them from a new source.
      // TEMP: point to Railway; revert host to api.better-rail.co.il
      let urlString = "https://better-rail.up.railway.app/api/v1/rail-api/common/api/v1/PopUpMessages/?LanguageId=\(language)&PageTypeId=MainPage"
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
