#import "BRFoldRegions.h"

#if !__has_include(<UIKit/UIHingeInteraction.h>)
// Building with an SDK older than iOS 27.1: these declarations are copied from the iOS 27.1 SDK headers
// (UIHingeInteraction.h, UIViewReservedRegion.h, UIView.h). The classes are only ever looked up by name at runtime,
// so nothing links against symbols the older SDK lacks.
@interface UIHinge : NSObject <NSCopying>
@property (nonatomic, readonly) NSInteger status;
@end

@interface UIHingeInteractionUpdate : NSObject <NSCopying>
@property (nonatomic, readonly, copy, nullable) UIHinge *hinge;
@end

@interface UIHingeInteraction : NSObject <UIInteraction>
- (instancetype)initWithUpdateHandler:(void (^)(UIHingeInteraction *, UIHingeInteractionUpdate *))updateHandler;
@end

@interface UIViewReservedRegionKind : NSObject <NSCopying>
+ (instancetype)divisionRegionKind;
@end

@interface UIViewReservedRegion : NSObject <NSCopying>
@property (nonatomic, readonly) CGRect frame;
@end

@interface UIView (BRReservedRegion)
- (NSArray<UIViewReservedRegion *> *)reservedRegionsOfKind:(UIViewReservedRegionKind *)kind;
@end
#endif

@implementation BRFoldRegions

+ (NSArray<NSValue *> *)activeDivisionFramesInView:(UIView *)view {
  Class kindClass = NSClassFromString(@"UIViewReservedRegionKind");
  if (kindClass == nil || ![view respondsToSelector:@selector(reservedRegionsOfKind:)]) {
    return @[];
  }
  // Without options, only active regions are returned: the fold is active while the device is partially open.
  NSArray<UIViewReservedRegion *> *regions = [view reservedRegionsOfKind:[kindClass divisionRegionKind]];
  NSMutableArray<NSValue *> *frames = [NSMutableArray arrayWithCapacity:regions.count];
  for (UIViewReservedRegion *region in regions) {
    [frames addObject:[NSValue valueWithCGRect:region.frame]];
  }
  return frames;
}

+ (nullable id<UIInteraction>)hingeInteractionWithHandler:(void (^)(BOOL partiallyOpen))handler {
  Class interactionClass = NSClassFromString(@"UIHingeInteraction");
  if (interactionClass == nil) {
    return nil;
  }
  return [[interactionClass alloc] initWithUpdateHandler:^(UIHingeInteraction *interaction, UIHingeInteractionUpdate *update) {
    // UIHingeStatusPartiallyOpen = 2 in the iOS 27.1 SDK's UIHinge.h. A nil hinge means no hinge updates here.
    handler(update.hinge != nil && update.hinge.status == 2);
  }];
}

@end
