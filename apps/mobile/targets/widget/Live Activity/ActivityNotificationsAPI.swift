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
    let viaStationId: Int?
  
  init(token: String, departureDate: String, originId: Int, destinationId: Int, trains: [Int], locale: String, viaStationId: Int? = nil) {
    self.token = token
    self.departureDate = departureDate
    self.originId = originId
    self.destinationId = destinationId
    self.trains = trains
    self.locale = locale
    self.provider = "ios"
    self.viaStationId = viaStationId
  }
}

struct StartActivityResult: Decodable {
  let success: Bool
  /// Missing when the server didn't start the ride. `reason` then says why, e.g. "ride_in_past".
  let rideId: String?
  let reason: String?
}

/// Why the server didn't return a ride ID.
enum RideStartFailure: Error {
  /// No answer: the device is offline, the request timed out, or the app was suspended mid-request.
  case noResponse(URLError.Code?)
  /// The server answered without a ride ID.
  case rejected(status: Int, reason: String?)
}

struct EndActivityResult: Decodable {
  let success: Bool
}

class ActivityNotificationsAPI {
  static let basePath = "https://api.better-rail.co.il/api/v1"
  
  static func startRide(ride: Ride) async -> Result<String, RideStartFailure> {
    let url = URL(string: "\(ActivityNotificationsAPI.basePath)/ride")!

    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    // Leave room within LiveActivitiesController.rideStartTimeout for the push token to arrive first.
    request.timeoutInterval = 15
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")

    let data: Data
    let response: URLResponse
    do {
      request.httpBody = try JSONEncoder().encode(ride)
      (data, response) = try await URLSession.shared.data(for: request)
    } catch {
      print("Ride start request failed: \(String(describing: error))")
      return .failure(.noResponse((error as? URLError)?.code))
    }

    print("Response data: \(String(data: data, encoding: .utf8) ?? "")")
    let result = try? JSONDecoder().decode(StartActivityResult.self, from: data)
    if result?.success == true, let rideId = result?.rideId {
      return .success(rideId)
    }

    let status = (response as? HTTPURLResponse)?.statusCode ?? 0
    return .failure(.rejected(status: status, reason: result?.reason))
  }
  
  static func endRide(rideId: String) async throws -> EndActivityResult {
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
      
      let decoder = JSONDecoder()
      let endResult = try decoder.decode(EndActivityResult.self, from: data)
      
      return endResult
    } catch {
      print("Error decoding JSON: \(String(describing: error))")
      throw error
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


