//
//  User.swift
//  WatchBetterRail Extension
//
//  Created by Matan Mashraki on 27/05/2023.
//

import Foundation
import RevenueCat

class UserInfo: NSObject, ObservableObject, PurchasesDelegate {
  @Published var isLoading: Bool
  @Published var isPro: Bool
  
  override init() {
    self.isLoading = true
    self.isPro = false
    super.init()
    
    Purchases.shared.delegate = self
    Task {
      self.isPro = await checkIsPro()
      self.isLoading = false
    }
  }
  
  func checkIsPro() async -> Bool {
    return await withUnsafeContinuation({ continuation in
      Purchases.shared.getCustomerInfo { customerInfo, error in
        if let customerInfo, error == nil {
          let isPro = customerInfo.entitlements.active["better-rail-pro"]?.isActive ?? false
          continuation.resume(with: .success(isPro))
        }
      }
    })
  }
  
  func purchases(_ purchases: Purchases, receivedUpdated customerInfo: CustomerInfo) {
    Task {
      self.isPro = await checkIsPro()
    }
  }
}
