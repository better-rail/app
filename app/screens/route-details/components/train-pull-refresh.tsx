import React, { useCallback, useEffect, useRef } from "react"
import { View, PanResponder, NativeSyntheticEvent, NativeScrollEvent, Image } from "react-native"
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from "react-native-reanimated"
import { color, spacing } from "../../../theme"
import { translate } from "../../../i18n/translate"

interface TrainPullRefreshProps {
  onRefresh: () => void
  showEntireRoute: boolean
  children: React.ReactNode
}

const MAX_PULL_DISTANCE = 150
const REFRESH_THRESHOLD = MAX_PULL_DISTANCE / 2
const REFRESH_DURATION = 300

export const TrainPullRefresh: React.FC<TrainPullRefreshProps> = ({ onRefresh, showEntireRoute, children }) => {
  const scrollPosition = useSharedValue(0)
  const pullDownPosition = useSharedValue(0)
  const isReadyToRefresh = useSharedValue(false)
  const [refreshing, setRefreshing] = React.useState(false)
  const [isDragging, setIsDragging] = React.useState(false)
  const refreshTimeoutRef = useRef<NodeJS.Timeout>()

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  const handleScrollEvent = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y
    scrollPosition.value = offsetY
  }, [])

  const onRefreshComplete = useCallback(() => {
    setRefreshing(false)
    pullDownPosition.value = withTiming(0, { duration: 180 })
  }, [])

  const onPanRelease = useCallback(() => {
    setIsDragging(false)

    if (isReadyToRefresh.value) {
      pullDownPosition.value = withTiming(REFRESH_THRESHOLD, { duration: 180 })
      isReadyToRefresh.value = false
      setRefreshing(true)

      // Perform the refresh action
      onRefresh()

      // Clear any existing timeout
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }

      // Set new timeout for refresh completion
      refreshTimeoutRef.current = setTimeout(() => {
        onRefreshComplete()
      }, REFRESH_DURATION)
    } else {
      pullDownPosition.value = withTiming(0, { duration: 180 })
    }
  }, [isReadyToRefresh.value, onRefresh, onRefreshComplete])

  const panResponderRef = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture the gesture if we're at the top of the scroll and pulling down
        // and not currently refreshing
        return !refreshing && scrollPosition.value <= 0 && gestureState.dy > 0
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
      onPanResponderReject: () => {
        setIsDragging(false)
        pullDownPosition.value = withTiming(0, { duration: 180 })
      },
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

  const iconStyles = useAnimatedStyle(() => {
    const scale = Math.min(1, Math.max(0.5, pullDownPosition.value / MAX_PULL_DISTANCE))

    return {
      opacity: refreshing
        ? withDelay(100, withTiming(0, { duration: 20 }))
        : Math.min(1, Math.max(0, pullDownPosition.value) / 50),
      transform: [{ scale }] as const,
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
        // Disable scrolling while pulling down or refreshing
        scrollEnabled: !isDragging && !refreshing,
      } as any)
    }
    return child
  })

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.refreshContainer, refreshContainerStyles]}>
        <Animated.View style={[styles.iconContainer, iconStyles]}>
          <Image source={require("../../../../assets/route.png")} style={styles.icon} resizeMode="contain" />
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
  iconContainer: {
    width: 32,
    height: 32,
    marginBottom: spacing[2],
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    width: 24,
    height: 24,
  },
  refreshText: {
    color: color.text,
    fontSize: 14,
    textAlign: "center",
  },
} as const
