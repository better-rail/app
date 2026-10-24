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
RCT_EXTERN_METHOD(activityAuthorizationInfo:(NSString *)emptyString resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(isRunningOnMac:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(setLayoutDirection:(BOOL)isRTL)
RCT_EXTERN_METHOD(getInstalledWidgets:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(arrivalAlarmAuthorization:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(requestArrivalAlarmAuthorization:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(scheduleArrivalAlarm:(NSDictionary *)alarm resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(moveArrivalAlarm:(NSDictionary *)push resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(cancelArrivalAlarm)
RCT_EXTERN_METHOD(getArrivalAlarm:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
