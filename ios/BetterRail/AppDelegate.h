#import <RCTAppDelegate.h>
#import <UIKit/UIKit.h>
#import <Expo/Expo.h>

@interface AppDelegate : RCTAppDelegate

@end

@interface UpdateLiveActivityTaskScheduler : NSObject
+ (UpdateLiveActivityTaskScheduler * _Nonnull)shared;
- (void)registerTasks;
@end
