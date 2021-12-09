//
//  RNBetterRail.m
//  BetterRail
//
//  Created by Guy Tepper on 06/12/2021.
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RNBetterRail, NSObject)

RCT_EXTERN_METHOD(saveCurrentRoute:(NSString *)originId destinationId:(NSString)destinationId)

@end
