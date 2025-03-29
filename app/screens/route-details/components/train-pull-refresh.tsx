import React, { useCallback } from "react"
import { View, PanResponder, NativeSyntheticEvent, NativeScrollEvent } from "react-native"
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from "react-native-reanimated"
import { color, spacing } from "../../../theme"
import { translate } from "../../../i18n/translate"
import Svg, { Path, Rect } from "react-native-svg"

interface TrainPullRefreshProps {
  onRefresh: () => void
  showEntireRoute: boolean
  children: React.ReactNode
}

const MAX_PULL_DISTANCE = 150
const REFRESH_THRESHOLD = MAX_PULL_DISTANCE / 2

export const TrainPullRefresh: React.FC<TrainPullRefreshProps> = ({ onRefresh, showEntireRoute, children }) => {
  const scrollPosition = useSharedValue(0)
  const pullDownPosition = useSharedValue(0)
  const isReadyToRefresh = useSharedValue(false)
  const [refreshing, setRefreshing] = React.useState(false)
  const [isDragging, setIsDragging] = React.useState(false)

  const handleScrollEvent = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y
    scrollPosition.value = offsetY
  }, [])

  const onRefreshComplete = () => {
    setRefreshing(false)
    pullDownPosition.value = withTiming(0, { duration: 180 })
  }

  const onPanRelease = () => {
    setIsDragging(false)

    if (isReadyToRefresh.value) {
      pullDownPosition.value = withTiming(REFRESH_THRESHOLD, { duration: 180 })
      isReadyToRefresh.value = false
      setRefreshing(true)

      // Perform the refresh action
      onRefresh()

      // After a short delay, reset the pull-down position
      setTimeout(() => {
        onRefreshComplete()
      }, 300)
    } else {
      pullDownPosition.value = withTiming(0, { duration: 180 })
    }
  }

  const panResponderRef = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture the gesture if we're at the top of the scroll and pulling down
        return scrollPosition.value <= 0 && gestureState.dy > 0
      },
      onPanResponderGrant: () => {
        setIsDragging(true)
      },
      onPanResponderMove: (_, gestureState) => {
        // Apply a resistance factor to make the pull feel more elastic
        const resistanceFactor = 0.5
        pullDownPosition.value = Math.min(MAX_PULL_DISTANCE, gestureState.dy * resistanceFactor)

        // Update the refresh state based on pull distance
        if (pullDownPosition.value >= REFRESH_THRESHOLD && !isReadyToRefresh.value) {
          isReadyToRefresh.value = true
        } else if (pullDownPosition.value < REFRESH_THRESHOLD && isReadyToRefresh.value) {
          isReadyToRefresh.value = false
        }
      },
      onPanResponderRelease: onPanRelease,
      onPanResponderTerminate: onPanRelease,
    }),
  )

  const pullDownStyles = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: pullDownPosition.value }],
    }
  })

  const refreshContainerStyles = useAnimatedStyle(() => {
    return {
      height: pullDownPosition.value,
    }
  })

  // Animation for train fill based on pull distance
  const trainFillStyles = useAnimatedStyle(() => {
    // Calculate fill percentage based on pull position
    const fillPercentage = Math.min(1, pullDownPosition.value / REFRESH_THRESHOLD)

    return {
      opacity: fillPercentage,
    }
  })

  const trainIconStyles = useAnimatedStyle(() => {
    const scale = Math.min(1, Math.max(0.5, pullDownPosition.value / MAX_PULL_DISTANCE))

    return {
      opacity: refreshing
        ? withDelay(100, withTiming(0, { duration: 20 }))
        : Math.min(1, Math.max(0, pullDownPosition.value) / 50),
      transform: [{ scale }, { rotate: `${pullDownPosition.value * 0.5}deg` }] as const,
    }
  }, [refreshing])

  const textStyles = useAnimatedStyle(() => {
    return {
      opacity: refreshing ? 0 : Math.min(1, Math.max(0, pullDownPosition.value) / 50),
    }
  }, [refreshing])

  // Attach the scroll handler to the children
  const childrenWithProps = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        onScroll: handleScrollEvent,
        scrollEventThrottle: 16,
        // Disable scrolling while pulling down
        scrollEnabled: !isDragging,
      } as any)
    }
    return child
  })

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.refreshContainer, refreshContainerStyles]}>
        <Animated.View style={[styles.trainIcon, trainIconStyles]}>
          <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
            {/* Train outline */}
            <Path
              d="M4 15.5V4C4 2.9 4.9 2 6 2H18C19.1 2 20 2.9 20 4V15.5C20 16.3 19.3 17 18.5 17H5.5C4.7 17 4 16.3 4 15.5Z"
              stroke={color.text}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Train windows */}
            <Rect x="7" y="5" width="4" height="4" rx="1" stroke={color.text} strokeWidth={1.5} />
            <Rect x="13" y="5" width="4" height="4" rx="1" stroke={color.text} strokeWidth={1.5} />

            {/* Train fill - animated based on pull */}
            <Animated.View style={trainFillStyles}>
              <Svg width={32} height={32} viewBox="0 0 24 24">
                <Rect x="4.5" y="2.5" width="15" height="14" rx="1" fill={color.primary} opacity={0.7} />
                <Rect x="7.5" y="5.5" width="3" height="3" rx="0.5" fill={color.background} />
                <Rect x="13.5" y="5.5" width="3" height="3" rx="0.5" fill={color.background} />
              </Svg>
            </Animated.View>

            {/* Train bottom parts */}
            <Path d="M9 20H15" stroke={color.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            <Path d="M8 17H16" stroke={color.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </Animated.View>
        <Animated.Text style={[styles.refreshText, textStyles]}>
          {translate(showEntireRoute ? "routeDetails.hideAllStations" : "routeDetails.showAllStations")}
        </Animated.Text>
      </Animated.View>

      <Animated.View style={[styles.content, pullDownStyles]} {...panResponderRef.current.panHandlers}>
        {childrenWithProps}
      </Animated.View>
    </View>
  )
}

const styles = {
  container: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  content: {
    flex: 1,
  },
  refreshContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: color.background,
  },
  trainIcon: {
    width: 32,
    height: 32,
    marginBottom: spacing[2],
    alignItems: "center",
    justifyContent: "center",
  },
  refreshText: {
    color: color.text,
    fontSize: 14,
    textAlign: "center",
  },
} as const
