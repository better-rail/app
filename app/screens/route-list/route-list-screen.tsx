import React, { useEffect, useMemo, useRef, useState, useCallback } from "react"
import { View, ActivityIndicator, ViewStyle, Dimensions } from "react-native"
import Animated from "react-native-reanimated"
import { FlashList } from "@shopify/flash-list"
import { observer } from "mobx-react-lite"
import { useNetInfo } from "@react-native-community/netinfo"
import { useQuery } from "react-query"
import { closestIndexTo } from "date-fns"
import { RouteListScreenProps } from "../../navigators/main-navigator"
import { useStores } from "../../models"
import { color, fontScale, spacing } from "../../theme"
import { RouteItem } from "../../services/api"
import { Screen, RouteDetailsHeader, RouteCard, RouteCardHeight } from "../../components"
import {
  NoTrainsFoundMessage,
  RouteListError,
  RouteListWarning,
  StationHoursSheet,
  WarningType,
  ResultDateCard,
  DateScroll,
} from "./components"
import { flatMap, max, round, uniqBy } from "lodash"
import { translate } from "../../i18n"
import type BottomSheet from "@gorhom/bottom-sheet/lib/typescript/components/bottomSheet/BottomSheet"

const ROOT: ViewStyle = {
  backgroundColor: color.background,
  flex: 1,
}

type RouteData = RouteItem | string

// Direction type for date navigation
type DateDirection = "forward" | "backward" | "initial"

export const RouteListScreen = observer(function RouteListScreen({ navigation, route }: RouteListScreenProps) {
  const { trainRoutes, routePlan, ride } = useStores()
  const { originId, destinationId, time, enableQuery } = route.params

  const [routeData, setRouteData] = useState<RouteData[]>([])

  // Track the current date and the dates being loaded in each direction
  const [currentDate, setCurrentDate] = useState<Date>(new Date(time))
  const [forwardDate, setForwardDate] = useState<Date>(() => {
    const date = new Date(time)
    date.setDate(date.getDate() + 1)
    return date
  })
  const [backwardDate, setBackwardDate] = useState<Date>(() => {
    const date = new Date(time)
    date.setDate(date.getDate() - 1)
    return date
  })
  const [loadingDirection, setLoadingDirection] = useState<DateDirection | null>(null)
  const [loadingDate, setLoadingDate] = useState<string | null>(null)

  // Keep track of the dates we've already loaded
  const [loadedDates, setLoadedDates] = useState<Set<string>>(new Set())

  const stationHoursSheetRef = useRef<BottomSheet>(null)
  const flashListRef = useRef(null)

  // Helper function to organize routes by date
  const organizeRoutesByDate = useCallback((routes: RouteItem[], currentDateStr: string, existingData: RouteData[] = []) => {
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
      return routeDate === currentDateStr
    })

    if (validatedRoutes.length !== routes.length) {
      console.warn(`Found ${routes.length - validatedRoutes.length} routes with incorrect dates`)
    }

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
  }, [])

  // Function to get a date for a specific direction
  const getDateForDirection = useCallback(
    (direction: DateDirection): Date => {
      if (direction === "forward") {
        return forwardDate
      } else if (direction === "backward") {
        return backwardDate
      }
      return currentDate
    },
    [currentDate, forwardDate, backwardDate],
  )

  // Function to load data for a specific direction
  const loadDataForDirection = useCallback(
    (direction: DateDirection) => {
      const newDate = getDateForDirection(direction)
      const newDateString = newDate.toDateString()

      // Check if we've already loaded this date
      if (loadedDates.has(newDateString)) {
        // If we've already loaded this date, just update the current date
        setCurrentDate(newDate)

        // Update only the relevant date based on direction
        if (direction === "forward") {
          const nextDate = new Date(newDate)
          nextDate.setDate(nextDate.getDate() + 1)
          setForwardDate(nextDate)
        } else if (direction === "backward") {
          const prevDate = new Date(newDate)
          prevDate.setDate(prevDate.getDate() - 1)
          setBackwardDate(prevDate)
        }

        return
      }

      // Set the loading direction and date
      setLoadingDirection(direction)
      setLoadingDate(newDateString)

      // Update the current date
      setCurrentDate(newDate)

      // Update only the relevant date based on direction
      if (direction === "forward") {
        const nextDate = new Date(newDate)
        nextDate.setDate(nextDate.getDate() + 1)
        setForwardDate(nextDate)
      } else if (direction === "backward") {
        const prevDate = new Date(newDate)
        prevDate.setDate(prevDate.getDate() - 1)
        setBackwardDate(prevDate)
      }
    },
    [getDateForDirection, loadedDates],
  )

  const { isInternetReachable } = useNetInfo()
  const trains = useQuery(
    ["origin", originId, "destination", destinationId, "time", currentDate.getTime()],
    async () => {
      const result = await trainRoutes.getRoutes(originId, destinationId, currentDate.getTime())
      return result
    },
    {
      enabled: enableQuery,
      retry: false,
      // Don't show stale data while refetching
      keepPreviousData: false,
      // Handle errors properly
      onError: () => {
        // Only update the error state if we don't have any data yet
        if (routeData.length === 0) {
          trainRoutes.updateResultType("not-found")
        }
        setLoadingDate(null)
        setLoadingDirection(null)
      },
      onSuccess: () => {
        setLoadingDate(null)
        setLoadingDirection(null)

        // Add the current date to the set of loaded dates
        setLoadedDates((prev) => {
          const newSet = new Set(prev)
          newSet.add(currentDate.toDateString())
          return newSet
        })
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
      trainRoutes.updateResultType("normal")
    }

    if (trains.isSuccess) {
      // Create a new date string for the current date
      const dateString = currentDate.toDateString()

      // Check if we already have this date in our data
      const dateExists = routeData.some((item) => typeof item === "string" && item === dateString)

      // Organize routes by date
      setRouteData((prevData) => organizeRoutesByDate(trains.data, dateString, prevData))

      // If we've just loaded a new date, scroll to the beginning of that date's routes
      if (!dateExists && flashListRef.current) {
        // Find the index of the new date in the updated routeData
        setTimeout(() => {
          const dateIndex = routeData.findIndex((item) => typeof item === "string" && item === dateString)
          if (dateIndex >= 0) {
            flashListRef.current?.scrollToIndex({
              index: dateIndex,
              animated: true,
            })
          }
        }, 100)
      }
    }
  }, [trains.data?.length, currentDate, organizeRoutesByDate, trains.isSuccess, trains.isLoading])

  // Initialize the loaded dates with the initial date
  useEffect(() => {
    const initialDate = new Date(time).toDateString()
    setLoadedDates(new Set([initialDate]))

    // Also make sure the current, forward, and backward dates are properly set
    const current = new Date(time)
    setCurrentDate(current)

    const forward = new Date(time)
    forward.setDate(forward.getDate() + 1)
    setForwardDate(forward)

    const backward = new Date(time)
    backward.setDate(backward.getDate() - 1)
    setBackwardDate(backward)
  }, [time])

  const onDoneStationHoursSheet = () => {
    stationHoursSheetRef.current?.close()
    stationHoursSheetRef.current = null
  }

  // Set the initial scroll index, since the Israel Rail API ignores the supplied time and
  // returns a route list for the whole day.
  const initialScrollIndex = useMemo(() => {
    if (trains.isSuccess) {
      let index

      if (routePlan.dateType === "departure") {
        const departureTimes = trains.data.map((route) => route.trains[0].departureTime)
        index = closestIndexTo(route.params.time, departureTimes)
      } else if (routePlan.dateType === "arrival") {
        const arrivalTimes = trains.data.map((route) => route.trains[0].arrivalTime)
        index = closestIndexTo(route.params.time, arrivalTimes)
      }

      return index
    }

    return undefined
  }, [trains.isSuccess])

  const shouldShowDashedLine = useMemo(() => {
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
  }, [trains.data])

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
      const headerItem = routeData[headerIndex]
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
        isActiveRide={ride.isRouteActive(item)}
        onPress={() =>
          navigation.navigate("routeDetails", {
            routeItem: item,
            originId: route.params.originId,
            destinationId: route.params.destinationId,
          })
        }
        shouldShowDashedLine={shouldShowDashedLine}
        style={{ marginBottom: spacing[3] }}
      />
    )
  }

  const shouldShowWarning =
    trains.isSuccess && trains.data?.length > 0 && ["different-date", "different-hour"].includes(trainRoutes.resultType)

  // Calculate the next and previous dates
  const nextDate = useMemo(() => forwardDate, [forwardDate])
  const prevDate = useMemo(() => backwardDate, [backwardDate])

  // Check if the next and previous dates are currently loading
  const isNextDateLoading = loadingDirection === "forward" && loadingDate === nextDate.toDateString()
  const isPrevDateLoading = loadingDirection === "backward" && loadingDate === prevDate.toDateString()

  return (
    <Screen
      style={ROOT}
      preset="fixed"
      unsafe={true}
      statusBar="light-content"
      statusBarBackgroundColor="transparent"
      translucent
    >
      <Animated.View sharedTransitionTag="route-header">
        <RouteDetailsHeader
          screenName="routeList"
          originId={route.params.originId}
          destinationId={route.params.destinationId}
          style={{ paddingHorizontal: spacing[3], marginBottom: spacing[3] }}
          stationHoursSheetRef={stationHoursSheetRef}
        />
      </Animated.View>

      {/* Only show the no internet error if we're not loading and there's no data */}
      {!isInternetReachable && !trains.isLoading && !trains.data && <RouteListError errorType="no-internet" />}

      {/* Only show the request error if we're not loading, internet is available, and there's an error */}
      {isInternetReachable && !trains.isLoading && trains.status === "error" && !trains.data && (
        <RouteListError errorType="request-error" />
      )}

      {/* Show the loading indicator only when we're loading and there's no data yet */}
      {trains.isLoading && routeData.length === 0 && (
        <ActivityIndicator size="large" style={{ marginTop: spacing[6] }} color="grey" />
      )}

      {routeData.length > 0 && (
        <FlashList
          ref={flashListRef}
          renderItem={renderRouteCard}
          keyExtractor={(item) => (typeof item === "string" ? item : item.trains.map((train) => train.trainNumber).join())}
          data={routeData}
          contentContainerStyle={{
            paddingTop: spacing[4],
            paddingHorizontal: spacing[3],
            paddingBottom: shouldShowWarning ? spacing[8] + 12 : spacing[3],
          }}
          estimatedItemSize={RouteCardHeight + spacing[3]}
          initialScrollIndex={initialScrollIndex}
          // so the list will re-render when the ride route changes, and so the item will be marked
          extraData={[ride.route, routePlan.date, trains.status, loadingDate, loadingDirection]}
          ListFooterComponent={
            <DateScroll
              direction="forward"
              setTime={() => loadDataForDirection("forward")}
              currenTime={forwardDate.getTime()}
              isLoadingDate={isNextDateLoading}
            />
          }
          ListFooterComponentStyle={{ height: spacing[7] }}
          ListHeaderComponent={
            <>
              <DateScroll
                direction="backward"
                setTime={() => loadDataForDirection("backward")}
                currenTime={backwardDate.getTime()}
                isLoadingDate={isPrevDateLoading}
              />
            </>
          }
          ListHeaderComponentStyle={{ height: spacing[7], marginBottom: spacing[3] }}
        />
      )}

      {trainRoutes.resultType === "not-found" && !trains.isLoading && (
        <View style={{ marginTop: spacing[4] }}>
          <NoTrainsFoundMessage />
        </View>
      )}

      {shouldShowWarning && !trains.isLoading && (
        <RouteListWarning
          routesDate={trains.data[0].trains[0].departureTime}
          warningType={trainRoutes.resultType as WarningType}
        />
      )}

      <StationHoursSheet
        stationId={route.params.originId}
        onDone={onDoneStationHoursSheet}
        ref={stationHoursSheetRef}
        key={route.params.originId}
      />
    </Screen>
  )
})
