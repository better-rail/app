#import <UIKit/UIKit.h>

NS_ASSUME_NONNULL_BEGIN

/// The two placements of an arrangement. Converted to `UIArrangementViewControllerViewPlacement` in BRArrangement.m.
typedef NS_ENUM(NSInteger, BRArrangementPlacement) {
  BRArrangementPlacementPrimary,
  BRArrangementPlacementSecondary,
} NS_SWIFT_NAME(ArrangementPlacement);

/// How wide a pane may be within a split arrangement. A value of 1 or more is in points, below 1 a fraction of the
/// arrangement's width, and a negative value leaves the dimension to the system.
typedef struct {
  CGFloat minimum;
  CGFloat preferred;
  CGFloat maximum;
  CGFloat layoutPriority;
} BRArrangementPaneWidth NS_SWIFT_NAME(ArrangementPaneWidth);

/// Reaches iOS 27.1's `UIArrangementViewController` whether the app is built with the 27.1 SDK or an older one. The
/// classes are looked up at runtime, so nothing links against symbols an older SDK or OS lacks.
NS_SWIFT_NAME(ArrangementBridge)
@interface BRArrangement : NSObject

/// Whether this OS has `UIArrangementViewController` (iOS 27.1 and later).
@property (class, nonatomic, readonly) BOOL isAvailable;

/// A new `UIArrangementViewController`, or nil before iOS 27.1.
+ (nullable UIViewController *)makeArrangementViewController NS_SWIFT_NAME(makeArrangementViewController());

+ (void)setViewController:(nullable UIViewController *)viewController
               forPlacement:(BRArrangementPlacement)placement
    inArrangementController:(UIViewController *)arrangementController
    NS_SWIFT_NAME(setViewController(_:for:in:));

/// Applies a split arrangement along the horizontal axis only — the panes sit side by side or, without room for
/// both, the lower priority one is hidden — with each pane's width range.
+ (void)applyHorizontalSplitToArrangementController:(UIViewController *)arrangementController
                                       primaryWidth:(BRArrangementPaneWidth)primaryWidth
                                     secondaryWidth:(BRArrangementPaneWidth)secondaryWidth
                                           animated:(BOOL)animated
    NS_SWIFT_NAME(applyHorizontalSplit(to:primaryWidth:secondaryWidth:animated:));

/// Whether the arrangement currently hides the pane at `placement`.
+ (BOOL)isPlacementHidden:(BRArrangementPlacement)placement
    inArrangementController:(UIViewController *)arrangementController NS_SWIFT_NAME(isHidden(_:in:));

@end

NS_ASSUME_NONNULL_END
