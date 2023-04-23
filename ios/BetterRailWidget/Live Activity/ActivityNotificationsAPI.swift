//
//  ActivityNotificationsAPI.swift
//  BetterRailWidgetExtension
//
//  Created by Guy Tepper on 08/04/2023.
//

import Foundation

struct Ride: Encodable, Identifiable {
    var id: String { token }
    let token: String
    let departureDate: String
    let originId: Int
    let destinationId: Int
    let trains: [Int]
    let locale: String
    let provider: String
  
  init(token: String, departureDate: String, originId: Int, destinationId: Int, trains: [Int], locale: String) {
    self.token = token
    self.departureDate = departureDate
    self.originId = originId
    self.destinationId = destinationId
    self.trains = trains
    self.locale = locale
    self.provider = "ios"
  }
}

struct StartActivityResult: Decodable {
  let success: Bool
  let rideId: String
}

@available(iOS 16.2, *)
class ActivityNotificationsAPI {
  static let envPath = LiveActivitiesController.env == "production" ? "" : "-test"
  static let basePath = "https://better-rail\(envPath).up.railway.app/api/v1"
  
  static func startRide(ride: Ride) async -> String? {
      // Define the request URL
    let url = URL(string: "\(ActivityNotificationsAPI.basePath)/ride")!

    // Convert the request body to Data
    guard let httpBody = try? JSONEncoder().encode(ride) else {
        print("Failed to encode request body")
      return nil;
    }

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.httpBody = httpBody
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    do {
      let (data, _) = try await URLSession.shared.data(for: request)
      print("Response data: \(String(data: data, encoding: .utf8) ?? "")")
      
      let decoder = JSONDecoder()
      let activityResult = try decoder.decode(StartActivityResult.self, from: data)
      return activityResult.rideId
    } catch {
      print("Error decoding JSON: \(String(describing: error))")
      return nil
    }
  }
  
  static func endRide(rideId: String) async {
    let url = URL(string: "\(ActivityNotificationsAPI.basePath)/ride")!
    
    // Convert the request body to Data
    let requestBody = ["rideId": rideId]
    let jsonData = try! JSONSerialization.data(withJSONObject: requestBody)
    
    var request = URLRequest(url: url)
    request.httpMethod = "DELETE"
    request.httpBody = jsonData
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    do {
      let (data, _) = try await URLSession.shared.data(for: request)
      print("End ride data: \(String(data: data, encoding: .utf8) ?? "")")
    } catch {
      print("Error decoding JSON: \(String(describing: error))")
    }
  }
  
  static func updateRideToken(rideId: String, token: String) async {
    let url = URL(string: "\(ActivityNotificationsAPI.basePath)/ride/updateToken")!

    // Convert the request body to Data
    let requestBody = ["rideId": rideId, "token": token]
    let jsonData = try! JSONSerialization.data(withJSONObject: requestBody)
    
    var request = URLRequest(url: url)
    request.httpMethod = "PATCH"
    request.httpBody = jsonData
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    do {
      let (data, _) = try await URLSession.shared.data(for: request)
      print("Update ride token data: \(String(data: data, encoding: .utf8) ?? "")")
    } catch {
      print("Error decoding JSON: \(String(describing: error))")
    }
  }
}


