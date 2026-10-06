#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

/// Reaches iOS 27.1's reserved region and hinge APIs whether the app is built with the 27.1 SDK or an older one.
@interface BRFoldRegions : NSObject

/// The frames of `view`'s active division regions (e.g. iPhone Duo's fold while partially open), in its coordinate space.
/// Empty before iOS 27.1.
+ (NSArray<NSValue *> *)activeDivisionFramesInView:(UIView *)view;

/// A hinge interaction calling `handler` whenever the hinge state changes, with whether the hinge is partially open,
/// or nil before iOS 27.1.
+ (nullable id<UIInteraction>)hingeInteractionWithHandler:(void (^)(BOOL partiallyOpen))handler;

@end

NS_ASSUME_NONNULL_END
