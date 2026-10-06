#import "BRArrangement.h"

// `UIArrangementViewControllerViewPlacement`: taken from the SDK when it has it (UIHingeInteraction.h arrived with
// UIArrangementViewController in iOS 27.1), otherwise its documented order — none, primary, secondary.
#if __has_include(<UIKit/UIHingeInteraction.h>)
static NSInteger UIKitPlacement(BRArrangementPlacement placement)
{
  return placement == BRArrangementPlacementSecondary ? UIArrangementViewControllerViewPlacementSecondary
                                                      : UIArrangementViewControllerViewPlacementPrimary;
}
#else
static NSInteger UIKitPlacement(BRArrangementPlacement placement)
{
  return placement == BRArrangementPlacementSecondary ? 2 : 1;
}
#endif

// The iOS 27.1 SDK declarations used here (UIArrangementViewController.h and friends), as selectors on `id`. They are
// only ever sent to instances of classes looked up by name, so this builds with any SDK and links nothing new.
@protocol BRArrangementViewControlling <NSObject>
- (void)setViewController:(nullable UIViewController *)viewController
             forPlacement:(NSInteger)placement
                 animated:(BOOL)animated;
- (void)updateArrangement:(id)arrangement animated:(BOOL)animated;
- (nullable id)stateForPlacement:(NSInteger)placement;
@end

@protocol BRSplitArrangement <NSObject>
+ (instancetype)splitArrangement;
@property (nonatomic) UIAxis axes;
- (void)setViewProperties:(id)viewProperties forPlacement:(NSInteger)placement;
@end

@protocol BRSplitArrangementViewProperties <NSObject>
@property (nonatomic, copy) id width;
@property (nonatomic) CGFloat layoutPriority;
@end

@protocol BRSplitArrangementDimensionRange <NSObject>
@property (nonatomic, copy) id minimum;
@property (nonatomic, copy) id preferred;
@property (nonatomic, copy) id maximum;
@end

@protocol BRSplitArrangementDimension <NSObject>
+ (instancetype)automaticDimension;
+ (instancetype)absoluteDimension:(CGFloat)absoluteValue;
+ (instancetype)fractionalDimension:(CGFloat)fraction;
@end

@protocol BRArrangementViewState <NSObject>
@property (nonatomic, readonly, getter=isHidden) BOOL hidden;
@end

@implementation BRArrangement

+ (BOOL)isAvailable
{
  return NSClassFromString(@"UIArrangementViewController") != nil && NSClassFromString(@"UISplitArrangement") != nil &&
      NSClassFromString(@"UISplitArrangementViewProperties") != nil &&
      NSClassFromString(@"UISplitArrangementDimensionRange") != nil &&
      NSClassFromString(@"UISplitArrangementDimension") != nil;
}

+ (nullable UIViewController *)makeArrangementViewController
{
  if (!self.isAvailable) {
    return nil;
  }
  return [[NSClassFromString(@"UIArrangementViewController") alloc] init];
}

+ (void)setViewController:(nullable UIViewController *)viewController
               forPlacement:(BRArrangementPlacement)placement
    inArrangementController:(UIViewController *)arrangementController
{
  [(id<BRArrangementViewControlling>)arrangementController setViewController:viewController
                                                                 forPlacement:UIKitPlacement(placement)
                                                                     animated:NO];
}

+ (nullable id)dimension:(CGFloat)value
{
  Class dimensionClass = NSClassFromString(@"UISplitArrangementDimension");
  if (value < 0) {
    return [(Class<BRSplitArrangementDimension>)dimensionClass automaticDimension];
  }
  if (value < 1) {
    return [(Class<BRSplitArrangementDimension>)dimensionClass fractionalDimension:value];
  }
  return [(Class<BRSplitArrangementDimension>)dimensionClass absoluteDimension:value];
}

+ (id)viewPropertiesForWidth:(BRArrangementPaneWidth)width
{
  id<BRSplitArrangementDimensionRange> range = [[NSClassFromString(@"UISplitArrangementDimensionRange") alloc] init];
  range.minimum = [self dimension:width.minimum];
  range.preferred = [self dimension:width.preferred];
  range.maximum = [self dimension:width.maximum];

  id<BRSplitArrangementViewProperties> properties = [[NSClassFromString(@"UISplitArrangementViewProperties") alloc] init];
  properties.width = range;
  if (width.layoutPriority >= 0) {
    properties.layoutPriority = width.layoutPriority;
  }
  return properties;
}

+ (void)applyHorizontalSplitToArrangementController:(UIViewController *)arrangementController
                                       primaryWidth:(BRArrangementPaneWidth)primaryWidth
                                     secondaryWidth:(BRArrangementPaneWidth)secondaryWidth
                                           animated:(BOOL)animated
{
  if (!self.isAvailable) {
    return;
  }
  id<BRSplitArrangement> split = [(Class<BRSplitArrangement>)NSClassFromString(@"UISplitArrangement") splitArrangement];
  // Side by side only: stacked, the route list or planner would get a strip of the screen.
  split.axes = UIAxisHorizontal;
  [split setViewProperties:[self viewPropertiesForWidth:primaryWidth]
              forPlacement:UIKitPlacement(BRArrangementPlacementPrimary)];
  [split setViewProperties:[self viewPropertiesForWidth:secondaryWidth]
              forPlacement:UIKitPlacement(BRArrangementPlacementSecondary)];
  [(id<BRArrangementViewControlling>)arrangementController updateArrangement:split animated:animated];
}

+ (BOOL)isPlacementHidden:(BRArrangementPlacement)placement
    inArrangementController:(UIViewController *)arrangementController
{
  id<BRArrangementViewState> state =
      [(id<BRArrangementViewControlling>)arrangementController stateForPlacement:UIKitPlacement(placement)];
  return state == nil || state.isHidden;
}

@end
