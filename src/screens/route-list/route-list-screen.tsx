import React, { useEffect, useRef, useState } from "react"
import HapticFeedback from "react-native-haptic-feedback"
import * as Burnt from "burnt"
import { View, ActivityIndicator, Dimensions, useColorScheme } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import Animated from "react-native-reanimated"
import { FlashList } from "@shopify/flash-list"
import { useNetworkState } from "expo-network"
import { useQuery } from "react-query"
import { closestIndexTo } from "date-fns"
import { useRouter, useLocalSearchParams } from "expo-router"
import { useObserve } from "expo-observe"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import { useShallow } from "zustand/react/shallow"
import { useTrainRoutesStore, useRoutePlanStore, useRideStore, useSettingsStore } from "@/models"
import { fontScale, spacing } from "@/theme"
import type { RouteItem } from "@/services/api"
import { Screen, RouteDetailsHeader, RouteCard, RouteCardHeight } from "@/components"
import {
  NoTrainsFoundMessage,
  RouteListError,
  RouteListWarning,
  type WarningType,
  ResultDateCard,
  DateScroll,
} from "./components"
import { flatMap, max, round } from "lodash"
import { translate } from "@/i18n"
import { shareRouteAction } from "@/utils/helpers/route-share-helpers"
import { addRouteToCalendar } from "@/utils/helpers/calendar-helpers"
import { getActionSheetStyleOptions } from "@/utils/helpers/action-sheet-helpers"
import { isRouteInThePast } from "@/utils/helpers/date-helpers"
import { useActionSheet } from "@expo/react-native-action-sheet"
import { useFeatureFlag } from "posthog-react-native"

type RouteData = RouteItem | string

export function RouteListScreen() {
  const router = useRouter()
  const rawParams = useLocalSearchParams<{ originId: string; destinationId: string; time: string; enableQuery?: string }>()
  const originId = rawParams.originId
  const destinationId = rawParams.destinationId
  const time = parseInt(rawParams.time as string, 10)
  const enableQuery = rawParams.enableQuery === "true"
  const { resultType, getRoutes, updateResultType } = useTrainRoutesStore(
    useShallow((s) => ({ resultType: s.resultType, getRoutes: s.getRoutes, updateResultType: s.updateResultType })),
  )
  const { dateType, date: routePlanDate } = useRoutePlanStore(useShallow((s) => ({ dateType: s.dateType, date: s.date })))
  const isRouteActive = useRideStore((s) => s.isRouteActive)
  const rideRoute = useRideStore((s) => s.route)
  const hideSlowTrains = useSettingsStore((s) => s.hideSlowTrains)
  const seenTrainInfoPrompt = useSettingsStore((s) => s.seenTrainInfoPrompt)
  const setSeenTrainInfoPrompt = useSettingsStore((s) => s.setSeenTrainInfoPrompt)
  const { showActionSheetWithOptions } = useActionSheet()
  const colorScheme = useColorScheme()
  const { markInteractive } = useObserve()

  const [routeData, setRouteData] = useState<RouteData[]>([])

  // Track the current date and the next day being loaded
  const [currentDate, setCurrentDate] = useState<Date>(new Date(time))
  const [nextDayDate, setNextDayDate] = useState<Date>(() => {
    const date = new Date(time)
    date.setDate(date.getDate() + 1)
    return date
  })
  const [loadingDate, setLoadingDate] = useState<string | null>(null)

  // Keep track of the dates we've already loaded
  const [loadedDates, setLoadedDates] = useState<Set<string>>(new Set())

  // Reset route data and loaded dates when origin or destination changes
  useEffect(() => {
    setRouteData([])
    setLoadedDates(new Set())
  }, [originId, destinationId])

  const flashListRef = useRef(null)

  // Prompt the user once to choose whether to show the "Train Info" row on route cards.
  // Gated behind the "show-train-info-prompt" PostHog feature flag; shown at most once per
  // user (tracked via seenTrainInfoPrompt).
  const trainInfoPromptFlag = useFeatureFlag("show-train-info-prompt")
  useEffect(() => {
    if (!trainInfoPromptFlag || seenTrainInfoPrompt) return

    // Wait for the route-list push transition to settle before presenting the sheet.
    const timeout = setTimeout(() => {
      setSeenTrainInfoPrompt(true)
      router.push("/train-info-prompt")
    }, 600)

    return () => clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainInfoPromptFlag])

  // Helper function to organize routes by date
  const organizeRoutesByDate = (routes: RouteItem[], currentDateStr: string, existingData: RouteData[] = []) => {
    // Extract all existing dates and their routes
    const dateToRoutesMap = new Map<string, RouteItem[]>()

    // Initialize with empty arrays for all dates from existing data
    const allDates = existingData.filter((item) => typeof item === "string") as string[]
    allDates.forEach((date) => dateToRoutesMap.set(date, []))

    // Add the current date if it doesn't exist
    if (!dateToRoutesMap.has(currentDateStr)) {
      dateToRoutesMap.set(currentDateStr, [])
    }

    // Fill in routes for each date from existing data
    let headerDate: string | null = null
    for (const item of existingData) {
      if (typeof item === "string") {
        headerDate = item
      } else if (headerDate) {
        // Only add the route if it's not from the date we're updating
        if (headerDate !== currentDateStr) {
          const existingRoutes = dateToRoutesMap.get(headerDate) || []
          existingRoutes.push(item)
          dateToRoutesMap.set(headerDate, existingRoutes)
        }
      }
    }

    // Add the new routes for the current date
    // First, validate that each route actually belongs to this date
    const validatedRoutes = routes.filter((route) => {
      const routeDate = new Date(route.trains[0].departureTime).toDateString()
      // If the route date is different from the requested date, we need to handle it
      if (routeDate !== currentDateStr) {
        // If we don't have this date in our map yet, add it
        if (!dateToRoutesMap.has(routeDate)) {
          dateToRoutesMap.set(routeDate, [])
        }
        // Add this route to its actual date instead of the requested date
        const routesForActualDate = dateToRoutesMap.get(routeDate) || []
        routesForActualDate.push(route)
        dateToRoutesMap.set(routeDate, routesForActualDate)
        return false // Don't include this route in the current date's routes
      }
      return true
    })

    // Add the validated routes to the current date
    dateToRoutesMap.set(currentDateStr, validatedRoutes)

    // Convert the map back to a flat array with date headers followed by their routes
    const newData: RouteData[] = []

    // Sort dates chronologically
    const sortedDates = Array.from(dateToRoutesMap.keys()).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime()
    })

    // Build the final array with dates and their routes
    for (const date of sortedDates) {
      const dateRoutes = dateToRoutesMap.get(date) || []
      if (dateRoutes.length > 0) {
        newData.push(date)
        newData.push(...dateRoutes)
      }
    }

    return newData
  }

  // Function to get the next day date
  const getNextDayDate = (): Date => nextDayDate

  // Function to load data for the next day
  const loadNextDayData = () => {
    const newDate = getNextDayDate()
    const newDateString = newDate.toDateString()

    // Check if we've already loaded this date
    if (loadedDates.has(newDateString)) {
      // If we've already loaded this date, just update the current date
      setCurrentDate(newDate)

      // Update the next day date
      const nextDate = new Date(newDate)
      nextDate.setDate(nextDate.getDate() + 1)
      setNextDayDate(nextDate)

      return
    }

    // Set the loading date
    setLoadingDate(newDateString)

    // Update the current date
    setCurrentDate(newDate)

    // Don't update the next day date until loading is complete
    // This ensures the DateScroll component shows the correct date during loading
  }

  const { isInternetReachable } = useNetworkState()

  const trains = useQuery(
    ["origin", originId, "destination", destinationId, "time", currentDate.getTime()],
    async () => {
      const result = await getRoutes(originId, destinationId, currentDate.getTime())
      return result
    },
    {
      enabled: enableQuery,
      retry: false,
      // Periodically refresh to catch platform changes and delays
      refetchInterval: 60_000,
      // Don't show stale data while refetching
      keepPreviousData: false,
      // Handle errors properly
      onError: () => {
        // Only update the error state if we don't have any data yet
        if (routeData.length === 0) {
          updateResultType("not-found")
        }
        setLoadingDate(null)
      },
      onSuccess: (data) => {
        // Check if we need to update the date based on the actual routes
        if (data && data.length > 0) {
          const firstRouteDate = new Date(data[0].trains[0].departureTime).toDateString()
          if (firstRouteDate !== currentDate.toDateString()) {
            // Update the current date to match the actual date of the routes, keeping the
            // originally requested time-of-day — resetting to midnight re-runs the query
            // with 00:00 and triggers a spurious "different-hour" warning.
            const updatedDate = new Date(firstRouteDate)
            updatedDate.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0)
            setCurrentDate(updatedDate)
            // Update the next day date accordingly
            const nextDate = new Date(updatedDate)
            nextDate.setDate(nextDate.getDate() + 1)
            setNextDayDate(nextDate)
          }
        }

        // Add the current date to the set of loaded dates
        setLoadedDates((prev) => {
          const newSet = new Set(prev)
          newSet.add(currentDate.toDateString())
          return newSet
        })

        // Now that loading is complete, update the next day date
        const nextDate = new Date(currentDate)
        nextDate.setDate(nextDate.getDate() + 1)
        setNextDayDate(nextDate)

        // Clear loading state
        setLoadingDate(null)
      },
    },
  )

  // Update the loading date when the current date changes
  useEffect(() => {
    if (trains.isLoading) {
      setLoadingDate(currentDate.toDateString())
    }
  }, [currentDate, trains.isLoading])

  useEffect(() => {
    // Reset the error state when starting a new query
    if (trains.isLoading) {
      updateResultType("normal")
    }

    if (trains.isSuccess) {
      // Create a new date string for the current date
      const dateString = currentDate.toDateString()

      // Organize routes by date
      setRouteData((prevData) => {
        const newData = organizeRoutesByDate(trains.data, dateString, prevData)
        return newData
      })
    }
  }, [trains.data, currentDate, organizeRoutesByDate, trains.isSuccess, trains.isLoading])

  // Initialize the loaded dates with the initial date
  useEffect(() => {
    const initialDate = new Date(time).toDateString()
    setLoadedDates(new Set([initialDate]))

    // Also make sure the current and next day dates are properly set
    const current = new Date(time)
    setCurrentDate(current)

    const nextDay = new Date(time)
    nextDay.setDate(nextDay.getDate() + 1)
    setNextDayDate(nextDay)
  }, [time])

  // Filter out slow trains when the setting is enabled
  const filteredRouteData = (() => {
    if (!hideSlowTrains) return routeData
    return routeData.filter((item) => {
      if (typeof item === "string") return true // Keep date headers
      return !item.isMuchLonger
    })
  })()

  // Signal EAS Observe per-route TTI once the route results have resolved — either
  // routes are rendered, or we've reached a terminal not-found / error state.
  useEffect(() => {
    const hasResults = filteredRouteData.length > 0
    const isTerminalEmpty = !trains.isLoading && (resultType === "not-found" || trains.status === "error")
    if (hasResults || isTerminalEmpty) {
      markInteractive()
    }
  }, [filteredRouteData.length, trains.isLoading, trains.status, resultType, markInteractive])

  // Set the initial scroll index, since the Israel Rail API ignores the supplied time and
  // returns a route list for the whole day.
  const initialScrollIndex = (() => {
    if (!trains.isSuccess || filteredRouteData.length === 0) return undefined

    // Get only the route items (not date headers)
    const routeItems = filteredRouteData.filter((item): item is RouteItem => typeof item !== "string")

    if (routeItems.length === 0) return undefined

    let targetRoute: RouteItem | undefined

    if (dateType === "departure") {
      const departureTimes = routeItems.map((r) => r.trains[0].departureTime)
      const closestIdx = closestIndexTo(time, departureTimes)
      targetRoute = routeItems[closestIdx]
    } else if (dateType === "arrival") {
      const arrivalTimes = routeItems.map((r) => r.trains[0].arrivalTime)
      const closestIdx = closestIndexTo(time, arrivalTimes)
      targetRoute = routeItems[closestIdx]
    }

    if (!targetRoute) return undefined

    // Find the actual index in filteredRouteData (which includes date headers)
    return filteredRouteData.findIndex((item) => item === targetRoute)
  })()

  const shouldShowDashedLine = (() => {
    const { width: deviceWidth } = Dimensions.get("screen")

    // Get the longest text for duration and delay that will be in the list
    const allTexts = flatMap(trains.data ?? [], ({ delay, duration }) => [
      delay > 0 ? (delay + " " + translate("routes.delayTime")).length : 0,
      duration.length,
    ])
    const maxTextLength = max(allTexts)

    // Check if there's enough space for the dashed line with that text
    const shouldShowDashedLineByTextLength = round(deviceWidth / fontScale / 30) >= maxTextLength

    /**
     * Show the dashed line only when all these conditions are matched:
     * - Device width is 360 or more
     * - Font Scale is 1.2 or less
     * - There's enough space for the dashed line with the longest duration/delay text
     */
    return fontScale <= 1.2 && deviceWidth >= 360 && shouldShowDashedLineByTextLength
  })()

  const handleRouteLongPress = async (routeItem: RouteItem) => {
    HapticFeedback.trigger("impactMedium")

    const options = [translate("routeDetails.addToCalendar"), translate("routes.share"), translate("common.cancel")]
    const cancelButtonIndex = 2

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        title: translate("routes.routeActions"),
        ...getActionSheetStyleOptions(colorScheme),
      },
      async (selectedIndex) => {
        if (selectedIndex === cancelButtonIndex) return

        try {
          switch (selectedIndex) {
            case 0: // Add to Calendar
              const wasAdded = await addRouteToCalendar(routeItem)
              if (wasAdded) {
                Burnt.alert({
                  title: translate("routes.addedToCalendar"),
                  preset: "done",
                  message: translate("routes.addedToCalendar"),
                })
              }
              break

            case 1: // Share
              await shareRouteAction(routeItem, originId, destinationId)
              break

            default:
              // Should never happen since we check for cancelButtonIndex above
              break
          }
        } catch (error) {
          if (selectedIndex === 0) {
            console.error("Failed to add to calendar:", error)
            Burnt.alert({
              title: translate("common.error"),
              preset: "error",
              message: "Failed to add to calendar",
            })
          }
        }
      },
    )
  }

  const renderRouteCard = ({ item, index }: { item: RouteData; index: number }) => {
    if (typeof item === "string") {
      // If this date is currently loading, show the loading indicator
      return <ResultDateCard date={item} isLoading={item === loadingDate} />
    }

    // Validate that this route belongs under the correct date header
    // Find the most recent date header that appears before this route
    let headerIndex = index
    while (headerIndex > 0) {
      headerIndex--
      const headerItem = filteredRouteData[headerIndex]
      if (typeof headerItem === "string") {
        // Check if the route's departure date matches the header date
        const routeDate = new Date(item.trains[0].departureTime).toDateString()
        if (routeDate !== headerItem) {
          console.warn(`Route date mismatch: ${routeDate} vs header ${headerItem}`)
          // This is a fallback in case there's a mismatch - we'll still show the route
        }
        break
      }
    }

    const departureTime = item.trains[0].departureTime
    let arrivalTime = item.trains[0].arrivalTime
    let stops = 0

    // If the train contains an exchange, change to arrival time to the last stop from the last train
    if (item.isExchange) {
      stops = item.trains.length - 1
      arrivalTime = item.trains[stops].arrivalTime
    }

    return (
      <RouteCard
        duration={item.duration}
        isMuchShorter={item.isMuchShorter}
        isMuchLonger={item.isMuchLonger}
        stops={stops}
        departureTime={departureTime}
        arrivalTime={arrivalTime}
        delay={item.delay}
        isActiveRide={isRouteActive(item)}
        isRouteInThePast={isRouteInThePast(arrivalTime, item.delay)}
        onPress={() => {
          useNavigationParamsStore.getState().setRouteDetails({ routeItem: item, originId, destinationId })
          router.push("/route-details")
        }}
        onLongPress={() => handleRouteLongPress(item)}
        routeItem={item}
        originId={originId}
        destinationId={destinationId}
        shouldShowDashedLine={shouldShowDashedLine}
        style={{ marginBottom: spacing[3] }}
      />
    )
  }

  const shouldShowWarning =
    trains.isSuccess && trains.data?.length > 0 && ["different-date", "different-hour"].includes(resultType)

  // Check if the next day date is currently loading
  const isNextDayLoading = loadingDate === nextDayDate.toDateString()

  return (
    <Screen
      style={styles.root}
      preset="fixed"
      unsafe={true}
      statusBar="light-content"
      statusBarBackgroundColor="transparent"
      translucent
    >
      <Animated.View sharedTransitionTag="route-header">
        <RouteDetailsHeader
          screenName="routeList"
          originId={originId}
          destinationId={destinationId}
          style={{ paddingHorizontal: spacing[3], marginBottom: spacing[3] }}
        />
      </Animated.View>

      {/* Only show the no internet error if we're not loading and there's no data */}
      {!isInternetReachable && !trains.isLoading && !trains.data && <RouteListError errorType="no-internet" />}

      {/* Only show the request error if we're not loading, internet is available, and there's an error */}
      {isInternetReachable && !trains.isLoading && trains.status === "error" && !trains.data && (
        <RouteListError errorType="request-error" />
      )}

      {/* Show the loading indicator only when we're loading and there's no data yet */}
      {trains.isLoading && filteredRouteData.length === 0 && (
        <ActivityIndicator size="large" style={{ marginTop: spacing[6] }} color="grey" />
      )}

      {filteredRouteData.length > 0 && (
        <FlashList
          key={`route-list-${hideSlowTrains}`}
          ref={flashListRef}
          renderItem={renderRouteCard}
          keyExtractor={(item) =>
            typeof item === "string"
              ? item
              : item.trains.map((train) => `${train.trainNumber}-${train.departureTimeString}`).join()
          }
          data={filteredRouteData}
          contentContainerStyle={{
            paddingTop: spacing[4],
            paddingHorizontal: spacing[3],
            paddingBottom: shouldShowWarning ? spacing[8] + 12 : spacing[3],
          }}
          estimatedItemSize={RouteCardHeight + spacing[3]}
          initialScrollIndex={initialScrollIndex}
          // so the list will re-render when the ride route changes, and so the item will be marked
          extraData={[rideRoute, routePlanDate, trains.status, loadingDate, hideSlowTrains]}
          ListFooterComponent={
            <DateScroll setTime={loadNextDayData} currenTime={nextDayDate.getTime()} isLoadingDate={isNextDayLoading} />
          }
          ListFooterComponentStyle={{ paddingBottom: spacing[3] }}
        />
      )}

      {/* A failed background refetch sets "not-found" in the store directly, bypassing the
          onError guard — so also require that no results are currently displayed. */}
      {resultType === "not-found" && !trains.isLoading && isInternetReachable && routeData.length === 0 && (
        <View style={{ marginTop: spacing[4] }}>
          <NoTrainsFoundMessage />
        </View>
      )}

      {shouldShowWarning && !trains.isLoading && (
        <RouteListWarning routesDate={trains.data[0].trains[0].departureTime} warningType={resultType as WarningType} />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create((theme) => ({
  root: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
}))
