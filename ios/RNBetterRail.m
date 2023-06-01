//
//  RNBetterRail.m
//  BetterRail
//
//  Created by Guy Tepper on 06/12/2021.
//

#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(RNBetterRail, NSObject)

RCT_EXTERN_METHOD(saveCurrentRoute:(NSString *)originId destinationId:(NSString)destinationId)
RCT_EXTERN_METHOD(donateRouteIntent:(NSString *)originId destinationId:(NSString)destinationId)
RCT_EXTERN_METHOD(startActivity:(NSString *)routeJSON resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(endActivity:(NSString *)routeId resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(isRideActive:(NSString *)rideId resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(monitorActivities)
RCT_EXTERN_METHOD(reloadAllTimelines)
RCT_EXTERN_METHOD(activityAuthorizationInfo:(NSString *)blankString resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)


@end
