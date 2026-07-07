import { useRef } from "react"
import { View, ScrollView, Platform, Pressable, LayoutChangeEvent } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import type { Wagon } from "@/services/api/rail-api.types"
import { translate } from "@/i18n"
import { getTrainDirection } from "@/utils/helpers/direction-helpers"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import HapticFeedback from "react-native-haptic-feedback"

function WagonItem({
  wagon,
  isFirst,
  isLast,
  isAccessibilityWagon,
  onLayout,
}: {
  wagon: Wagon
  isFirst: boolean
  isLast: boolean
  isAccessibilityWagon: boolean
  onLayout?: (e: LayoutChangeEvent) => void
}) {
  const hasFeatures = isAccessibilityWagon || wagon.bicycle

  const boxBaseStyle = isFirst ? styles.wagonBoxFirst : isLast ? styles.wagonBoxLast : styles.wagonBox
  const boxStyle = [boxBaseStyle, hasFeatures && styles.wagonBoxWithFeatures]

  const containerStyle = isLast ? [styles.wagonItemContainer, { marginRight: 0 }] : styles.wagonItemContainer

  return (
    <View style={containerStyle} onLayout={onLayout}>
      <Text style={styles.wagonNumberText}>{wagon.shurA2}</Text>
      <View style={boxStyle}>
        {hasFeatures && (
          <View style={styles.featureIconContainer}>
            {isAccessibilityWagon && (
              <View style={styles.featureIconBadge}>
                <Text style={styles.featureIconText}>♿</Text>
              </View>
            )}
            {wagon.bicycle && (
              <View style={styles.featureIconBadge}>
                <Text style={styles.featureIconText}>🚲</Text>
              </View>
            )}
          </View>
        )}
      </View>
    </View>
  )
}

export function RouteDetailsTrainInfo() {
  const train = useNavigationParamsStore((s) => s.train)
  const insets = useSafeAreaInsets()
  const sortedWagons = (() => {
    if (!train.visaWagonData?.wagons || train.visaWagonData.wagons.length === 0) {
      return []
    }
    return [...train.visaWagonData.wagons].sort((a, b) => a.shurA2 - b.shurA2)
  })()

  const direction = (() => {
    try {
      const routeStationIds = train.routeStations.map((s) => s.stationId.toString())
      return getTrainDirection(train.originStationId.toString(), routeStationIds)
    } catch {
      return null
    }
  })()

  const scrollViewRef = useRef<ScrollView>(null)
  const wagonLayoutsRef = useRef<Record<number, number>>({})

  const scrollToWagonIndex = (targetIndex: number) => {
    const x = wagonLayoutsRef.current[targetIndex]
    if (x !== undefined) {
      scrollViewRef.current?.scrollTo({ x: Math.max(0, x - 20), animated: true })
    }
  }

  // Car #1 is always the front (locomotive end). Accessibility = southernmost car.
  // N/E: descending (car #N on left = southernmost/accessibility, car #1 on right = front) → N
  // S/W: ascending  (car #1 on left = southernmost/accessibility/front)              ← S
  // In both cases the accessibility car lands at index 0 (leftmost).
  const displayWagons = (() => {
    if (direction === "N" || direction === "E") return [...sortedWagons].reverse()
    return sortedWagons
  })()

  // Accessibility = southernmost car = highest shurA2 = always index 0 in the descending display.
  const accessibilityWagonIndex = (() => {
    if (!direction || displayWagons.length === 0) return null
    return 0
  })()

  const hasWagons = displayWagons.length > 0
  const hasHandicapped = accessibilityWagonIndex !== null
  const hasBicycle = sortedWagons.some((w) => w.bicycle)
  const showLegend = hasHandicapped || hasBicycle

  const handleAccessibilityPress = () => {
    if (accessibilityWagonIndex !== null) {
      HapticFeedback.trigger("impactLight")
      scrollToWagonIndex(accessibilityWagonIndex)
    }
  }

  const handleBicyclePress = () => {
    const firstBicycleIndex = displayWagons.findIndex((w) => w.bicycle)
    if (firstBicycleIndex !== -1) {
      HapticFeedback.trigger("impactLight")
      scrollToWagonIndex(firstBicycleIndex)
    }
  }

  const seatCount = train.visaWagonData?.seatplaces
  const wagonCount = train.visaWagonData?.totkr

  return (
    <View style={[styles.root, { paddingBottom: Platform.select({ ios: 0, android: insets.bottom + 8 }) }]}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>
          {train.trainNumber} {translate("common.toStationName", { stationName: train.lastStop })}
        </Text>
      </View>

      {hasWagons ? (
        <>
          <View style={{ direction: "ltr" }}>
            <ScrollView
              ref={scrollViewRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.wagonsScrollContainer}
              onContentSizeChange={() => {
                // Content is forced LTR, so scroll positions are always physical:
                // scrollToEnd = rightmost (car #1 for N/E), scrollTo(0) = leftmost (car #1 for S/W).
                if (direction === "N" || direction === "E") {
                  scrollViewRef.current?.scrollToEnd({ animated: false })
                } else if (direction === "S" || direction === "W") {
                  scrollViewRef.current?.scrollTo({ x: 0, animated: false })
                }
              }}
            >
              {(direction === "S" || direction === "W") && (
                <View style={[styles.directionIndicator, styles.directionIndicatorStart]}>
                  <Text style={styles.wagonNumberText}> </Text>
                  <View style={styles.directionArrowContainer}>
                    <Text style={styles.directionArrow}>←</Text>
                  </View>
                </View>
              )}
              {displayWagons.map((wagon, index) => (
                <WagonItem
                  key={wagon.krsid}
                  wagon={wagon}
                  isFirst={index === 0}
                  isLast={index === displayWagons.length - 1}
                  isAccessibilityWagon={index === accessibilityWagonIndex}
                  onLayout={(e) => {
                    wagonLayoutsRef.current[index] = e.nativeEvent.layout.x
                  }}
                />
              ))}
              {(direction === "N" || direction === "E" || direction === null) && (
                <View style={styles.directionIndicator}>
                  <Text style={styles.wagonNumberText}> </Text>
                  <View style={styles.directionArrowContainer}>
                    <Text style={styles.directionArrow}>→</Text>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>

          <View style={styles.divider} />

          {showLegend && (
            <View style={styles.legendContainer}>
              {hasHandicapped && (
                <Pressable style={styles.legendItem} onPress={handleAccessibilityPress}>
                  <Text style={{ fontSize: 16 }}>♿</Text>
                  <Text style={styles.legendText}>{translate("routeDetails.wheelchairAccessible")}</Text>
                </Pressable>
              )}
              {hasBicycle && (
                <Pressable style={styles.legendItem} onPress={handleBicyclePress}>
                  <Text style={{ fontSize: 16 }}>🚲</Text>
                  <Text style={styles.legendText}>{translate("routeDetails.bicyclesAllowed")}</Text>
                </Pressable>
              )}
            </View>
          )}

          <View style={styles.divider} />

          {(seatCount || wagonCount) && (
            <View style={styles.metadataContainer}>
              {wagonCount && (
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataText}>{translate("routeDetails.carsCount", { count: wagonCount })}</Text>
                </View>
              )}
              {seatCount && (
                <View style={styles.metadataItem}>
                  <Text style={styles.metadataText}>{translate("routeDetails.seatsCount", { count: seatCount })}</Text>
                </View>
              )}
            </View>
          )}
        </>
      ) : (
        <View style={styles.emptyStateContainer}>
          <Text style={styles.emptyStateText}>{translate("routeDetails.noWagonInformationAvailable")}</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  root: {
    flex: 1,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: theme.spacing[4],
    gap: theme.spacing[2],
    paddingTop: theme.spacing[4],
    paddingStart: theme.spacing[5],
  },
  headerText: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    textAlign: "center",
  },
  wagonItemContainer: {
    alignItems: "center",
    marginRight: theme.spacing[1],
  },
  wagonNumberText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: "600",
    width: 50,
    textAlign: "center",
    marginBottom: theme.spacing[1],
  },
  wagonsScrollContainer: {
    flexDirection: "row",
    paddingHorizontal: theme.spacing[4],
    alignItems: "flex-start",
    justifyContent: "center",
    flexGrow: 1,
    direction: "ltr",
  },
  directionIndicator: {
    alignItems: "center",
    marginLeft: theme.spacing[2],
  },
  directionIndicatorStart: {
    marginLeft: 0,
    marginRight: theme.spacing[2],
  },
  directionArrowContainer: {
    height: 50,
    justifyContent: "center",
    alignItems: "center",
  },
  directionArrow: {
    fontSize: 20,
    color: theme.colors.primary,
  },
  legendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: theme.spacing[4],
  },
  legendItem: {
    flexDirection: "column",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  legendText: {
    fontSize: 13,
    color: theme.colors.label,
  },
  metadataContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: theme.spacing[1],
    gap: theme.spacing[4],
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[1],
  },
  metadataText: {
    fontSize: 14,
    color: theme.colors.text,
  },
  wagonBox: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryBackground,
    justifyContent: "center",
    alignItems: "center",
  },
  wagonBoxFirst: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryBackground,
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
    borderTopRightRadius: 0,
    borderBottomRightRadius: 0,
    borderLeftWidth: 1.5,
  },
  wagonBoxLast: {
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.secondaryBackground,
    justifyContent: "center",
    alignItems: "center",
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: 0,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
    borderRightWidth: 1.5,
  },
  wagonBoxWithFeatures: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    borderLeftWidth: 1.5,
    borderRightWidth: 1.5,
  },
  featureIconContainer: {
    flexDirection: "row",
    gap: theme.spacing[1],
    alignItems: "center",
  },
  featureIconBadge: {
    backgroundColor: "white",
    borderRadius: 4,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  featureIconText: {
    fontSize: 14,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.separator,
    marginVertical: theme.spacing[4],
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: theme.spacing[5],
    paddingVertical: theme.spacing[6],
  },
  emptyStateText: {
    fontSize: 15,
    color: theme.colors.label,
    textAlign: "center",
    lineHeight: 22,
  },
}))
