import React, { useEffect, useMemo, useRef, useState } from "react"
import HapticFeedback from "react-native-haptic-feedback"
import * as Burnt from "burnt"
import { View, ActivityIndicator, Dimensions, useColorScheme } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { FlashList, type FlashListRef, type ViewToken } from "@shopify/flash-list"
import { useNetworkState } from "expo-network"
import { useQuery } from "react-query"
import { addDays } from "date-fns"
import { useRouter, useLocalSearchParams, useIsFocused, Redirect } from "expo-router"
import { useObserve } from "expo-observe"
import { useSharedValue } from "react-native-reanimated"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import { useShallow } from "zustand/react/shallow"
import { useTrainRoutesStore, useRoutePlanStore, useRideStore, useSettingsStore } from "@/models"
import { filterRouteDataByMaxChanges, TRAIN_INFO_PROMPT_SEARCH_THRESHOLD } from "@/models/settings/settings"
import { color, fontScale, spacing } from "@/theme"
import type { RouteItem } from "@/services/api"
import { RouteApi } from "@/services/api/route-api"
import { Screen, RouteDetailsHeader, RouteCard, WebsiteHandoff } from "@/components"
import {
  NoTrainsFoundMessage,
  FilteredTrainsMessage,
  RouteListError,
  RouteListWarning,
  ResultDateCard,
  DateScroll,
  HourIndexBar,
  HOUR_INDEX_MAX_FONT_SCALE,
  type HourIndexEntry,
} from "./components"
import { flatMap, max, round } from "lodash"
import { translate } from "@/i18n"
import { shareRouteAction } from "@/utils/helpers/route-share-helpers"
import { addRouteToCalendar } from "@/utils/helpers/calendar-helpers"
import { getActionSheetStyleOptions } from "@/utils/helpers/action-sheet-helpers"
import { formatDateForAPI, isRouteInThePast } from "@/utils/helpers/date-helpers"
import { isHourIndexSupported } from "@/utils/hour-index"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"
import { useActionSheet } from "@expo/react-native-action-sheet"
import { useFeatureFlag } from "posthog-react-native"
import { RoutesNotFoundError, type RouteSearchResult } from "@/models/train-routes/search-routes"
import {
  getInitialScrollIndex,
  getRouteListWarning,
  organizeRouteResults,
  patchRoutes,
  routeListDayQueryKey,
  subscribeToFreshRoutes,
  upsertRouteResult,
  type RouteData,
} from "./route-list-query"

// Report the top row as soon as it scrolls in, so the hour index highlight keeps up
const VIEWABILITY_CONFIG = { minimumViewTime: 0, itemVisiblePercentThreshold: 50 }

export function RouteListScreen() {
  const params = useLocalSearchParams<{
    originId: string
    destinationId: string
    time: string
    enableQuery?: string
    trip?: string
    viaStationId?: string
  }>()
  const hideSlowTrains = useSettingsStore((s) => s.hideSlowTrains)
  const time = Number(params.time)
  if (!params.originId || !params.destinationId || !Number.isFinite(time)) return <Redirect href="/" />

  return (
    <RouteListResults
      key={`${params.originId}-${params.destinationId}-${time}-${hideSlowTrains}`}
      originId={params.originId}
      destinationId={params.destinationId}
      time={time}
      enableQuery={params.enableQuery === "true"}
      hideSlowTrains={hideSlowTrains}
      trip={params.trip}
      viaStationId={params.viaStationId}
    />
  )
}

function RouteListResults({
  originId,
  destinationId,
  time,
  enableQuery,
  hideSlowTrains,
  trip,
  viaStationId,
}: {
  originId: string
  destinationId: string
  time: number
  enableQuery: boolean
  hideSlowTrains: boolean
  trip?: string
  viaStationId?: string
}) {
  const router = useRouter()
  const getRoutes = useTrainRoutesStore((s) => s.getRoutes)
  const isFocused = useIsFocused()
  const { dateType, date: routePlanDate } = useRoutePlanStore(useShallow((s) => ({ dateType: s.dateType, date: s.date })))
  const isRouteActive = useRideStore((s) => s.isRouteActive)
  const rideRoute = useRideStore((s) => s.route)
  const hourIndexEnabled = useSettingsStore((s) => s.showHourIndex)
  const maxChanges = useSettingsStore((s) => s.maxChanges)
  const setMaxChanges = useSettingsStore((s) => s.setMaxChanges)
  const { trainSearchCount, recordTrainSearch, seenTrainInfoPrompt, setSeenTrainInfoPrompt } = useSettingsStore(
    useShallow((s) => ({
      trainSearchCount: s.trainSearchCount,
      recordTrainSearch: s.recordTrainSearch,
      seenTrainInfoPrompt: s.seenTrainInfoPrompt,
      setSeenTrainInfoPrompt: s.setSeenTrainInfoPrompt,
    })),
  )
  const { showActionSheetWithOptions } = useActionSheet()
  const colorScheme = useColorScheme()
  const { markInteractive } = useObserve()

  const [dayResults, setDayResults] = useState<RouteSearchResult[]>([])
  const routeData = useMemo(() => organizeRouteResults(dayResults), [dayResults])
  // Only explicit pagination changes the query date. Automatic fallback stays tied to its request.
  const [currentDate, setCurrentDate] = useState(() => new Date(time))
  const nextDayDate = addDays(dayResults.at(-1)?.resolvedTime ?? time, 1)

  // Route details refresh live data across loaded days, preserving each search's warning.
  useEffect(
    () =>
      subscribeToFreshRoutes({
        originId,
        destinationId,
        onRoutes: (routes) =>
          setDayResults((results) =>
            results.map((result) => ({
              ...result,
              routes: patchRoutes(result.routes, routes),
            })),
          ),
      }),
    [originId, destinationId],
  )

  const flashListRef = useRef<FlashListRef<RouteData>>(null)
  const hasRecordedSearch = useRef(false)

  // Prompt the user once to choose whether to show the "Train Info" row on route cards.
  // Gated behind the "show-train-info-prompt" PostHog feature flag and delayed until the
  // user has searched for trains at least twice. It is shown at most once per user.
  const trainInfoPromptFlag = useFeatureFlag("show-train-info-prompt")
  useEffect(() => {
    if (!trainInfoPromptFlag || trainSearchCount < TRAIN_INFO_PROMPT_SEARCH_THRESHOLD || seenTrainInfoPrompt) return

    // Wait for the route-list push transition to settle before presenting the sheet.
    const timeout = setTimeout(() => {
      setSeenTrainInfoPrompt(true)
      router.push("/train-info-prompt")
    }, 600)

    return () => clearTimeout(timeout)
  }, [router, seenTrainInfoPrompt, setSeenTrainInfoPrompt, trainInfoPromptFlag, trainSearchCount])

  const { isInternetReachable } = useNetworkState()
  const queryKey = routeListDayQueryKey(originId, destinationId, currentDate.getTime(), hideSlowTrains)
  const trains = useQuery(
    queryKey,
    () =>
      getRoutes(originId, destinationId, currentDate.getTime(), {
        hideSlowTrains,
      }),
    {
      enabled: enableQuery,
      retry: false,
      refetchInterval: 60_000,
      keepPreviousData: false,
    },
  )

  // Keep trip restoration tied to the requested day while the list loads other days.
  const requestedDayQueryKey = routeListDayQueryKey(originId, destinationId, time, hideSlowTrains)
  const websiteTripRoutes = useQuery(
    viaStationId ? ["websiteTrip", originId, destinationId, time, viaStationId] : requestedDayQueryKey,
    async () => {
      if (!viaStationId) {
        return getRoutes(originId, destinationId, time, {
          hideSlowTrains,
        })
      }
      const [date, hour] = formatDateForAPI(time)
      return new RouteApi().getRoutes(originId, destinationId, date, hour, { viaStation: viaStationId })
    },
    {
      enabled: enableQuery && !!trip && isFocused,
      retry: false,
      select: (data) => (Array.isArray(data) ? data : data.routes),
    },
  )

  const openedWebsiteTrip = useRef<string | null>(null)
  useEffect(() => {
    if (!isFocused || !trip || !websiteTripRoutes.isSuccess || !websiteTripRoutes.data) return
    const key = `${originId}/${destinationId}/${time}/${trip}/${viaStationId ?? ""}`
    if (openedWebsiteTrip.current === key) return
    // Handle unavailable trips once so polling doesn't open details later.
    openedWebsiteTrip.current = key
    const routeItem = websiteTripRoutes.data.find(
      (route) =>
        new Date(route.departureTime).toDateString() === new Date(time).toDateString() &&
        route.trains.map((train) => train.trainNumber).join("-") === trip,
    )
    if (!routeItem) return
    useNavigationParamsStore.getState().setRouteDetails({
      routeItem: { ...routeItem, viaStationId },
      originId,
      destinationId,
    })
    router.push("/route-details")
  }, [isFocused, trip, websiteTripRoutes.isSuccess, websiteTripRoutes.data, originId, destinationId, time, viaStationId, router])

  // This also handles cached results, for which onSuccess is not called on initial display.
  useEffect(() => {
    if (!trains.data) return
    setDayResults((results) => upsertRouteResult(results, trains.data))
    if (!hasRecordedSearch.current) {
      hasRecordedSearch.current = true
      recordTrainSearch()
    }
  }, [trains.data, recordTrainSearch])

  const loadingDate = trains.isLoading ? currentDate.toDateString() : null
  const loadNextDayData = () => {
    if (!trains.isFetching) setCurrentDate(nextDayDate)
  }

  // Filtered on loaded data so switching never refetches
  const displayData = useMemo(() => filterRouteDataByMaxChanges(routeData, maxChanges), [routeData, maxChanges])
  const todayDate = new Date().toDateString()
  const allRoutesHiddenByFilter = routeData.some((item) => typeof item !== "string") && displayData.length === 0

  // The hour index covers the day currently at the top of the list, and highlights its hour.
  // The hour lives in a shared value so scrolling doesn't re-render the screen.
  const [visibleDate, setVisibleDate] = useState<string | null>(null)
  const handoffDate = new Date(visibleDate ?? displayData.find((item) => typeof item === "string") ?? currentDate.getTime())
  handoffDate.setHours(currentDate.getHours(), currentDate.getMinutes(), 0, 0)
  const topHour = useSharedValue(-1)
  const onViewableItemsChanged = ({ viewableItems }: { viewableItems: ViewToken<RouteData>[] }) => {
    const first = viewableItems[0]?.item
    if (!first) return
    setVisibleDate(typeof first === "string" ? first : new Date(first.trains[0].departureTime).toDateString())
    const firstRoute = viewableItems.find((token) => typeof token.item !== "string")?.item as RouteItem | undefined
    if (firstRoute) topHour.value = new Date(firstRoute.trains[0].departureTime).getHours()
  }

  const hourIndexEntries = useMemo(() => {
    const entries: HourIndexEntry[] = []
    const targetDate = visibleDate ?? displayData.find((item) => typeof item === "string")
    let date: string | null = null
    displayData.forEach((item, index) => {
      if (typeof item === "string") {
        date = item
        return
      }
      if (date !== targetDate) return
      const hour = new Date(item.trains[0].departureTime).getHours()
      if (entries.at(-1)?.hour !== hour) entries.push({ hour, index })
    })
    return entries
  }, [displayData, visibleDate])
  const showHourIndex =
    isHourIndexSupported() && hourIndexEnabled && hourIndexEntries.length >= 4 && fontScale <= HOUR_INDEX_MAX_FONT_SCALE

  const scrollToHour = ({ index }: HourIndexEntry) => {
    // Keep the date header in view when jumping to the first train of the day
    const target = typeof displayData[index - 1] === "string" ? index - 1 : index
    flashListRef.current?.scrollToIndex({ index: target, animated: false })
  }

  // Signal TTI after the results or an empty/error state has resolved.
  useEffect(() => {
    if (displayData.length > 0 || (!trains.isLoading && (trains.isError || allRoutesHiddenByFilter))) {
      markInteractive()
    }
  }, [displayData.length, trains.isLoading, trains.isError, allRoutesHiddenByFilter, markInteractive])

  const initialScrollIndex = getInitialScrollIndex(displayData, time, dateType)

  // The list stays mounted across filter changes, so re-anchor it on the closest train ourselves
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    if (initialScrollIndex === undefined) return
    flashListRef.current?.scrollToIndex({ index: initialScrollIndex, animated: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxChanges])

  const shouldShowDashedLine = (() => {
    const { width: deviceWidth } = Dimensions.get("screen")

    // Get the longest text for duration and delay that will be in the list
    const allTexts = flatMap(trains.data?.routes ?? [], ({ delay, duration }) => [
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
      const headerItem = displayData[headerIndex]
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
        testID={`route-card-${item.isExchange ? "exchange" : "direct"}`}
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

  const warning = getRouteListWarning(dayResults)
  const isNextDayLoading = loadingDate === nextDayDate.toDateString()
  const noTrainsFound = trains.error instanceof RoutesNotFoundError

  return (
    <Screen
      testID="route-list-screen"
      style={styles.root}
      preset="fixed"
      unsafe={true}
      statusBar="light-content"
      statusBarBackgroundColor="transparent"
      translucent
    >
      <WebsiteHandoff originId={originId} destinationId={destinationId} time={handoffDate.getTime()} />
      <RouteDetailsHeader
        screenName="routeList"
        originId={originId}
        destinationId={destinationId}
        style={{ paddingHorizontal: spacing[3], marginBottom: spacing[3] }}
      />

      {/* Only show the no internet error if we're not loading and there's no data */}
      {!isInternetReachable && !trains.isLoading && routeData.length === 0 && <RouteListError errorType="no-internet" />}

      {/* Only show the request error if we're not loading, internet is available, and there's an error */}
      {isInternetReachable && !trains.isLoading && trains.isError && !noTrainsFound && routeData.length === 0 && (
        <RouteListError errorType="request-error" />
      )}

      {/* Show the loading indicator only when we're loading and there's no data yet */}
      {trains.isLoading && routeData.length === 0 && (
        <ActivityIndicator size="large" style={{ marginTop: spacing[6] }} color="grey" />
      )}

      {displayData.length > 0 && (
        <View style={styles.listContainer}>
          <FlashList
            key={`route-list-${hideSlowTrains}`}
            ref={flashListRef}
            renderItem={renderRouteCard}
            keyExtractor={(item) =>
              typeof item === "string"
                ? item
                : item.trains.map((train) => `${train.trainNumber}-${train.departureTimeString}`).join()
            }
            data={displayData}
            getItemType={(item) => (typeof item === "string" ? "date" : "route")}
            stickyHeaderIndices={displayData.flatMap((item, index) =>
              typeof item === "string" && item !== todayDate ? [index] : [],
            )}
            stickyHeaderConfig={{ hideRelatedCell: true }}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={VIEWABILITY_CONFIG}
            // The native scroll indicator would sit on top of the hour index
            showsVerticalScrollIndicator={!showHourIndex}
            contentContainerStyle={{
              paddingTop: spacing[4],
              paddingStart: spacing[3],
              paddingEnd: showHourIndex ? spacing[5] + spacing[1] : spacing[3],
              paddingBottom: warning && isLiquidGlassSupported ? spacing[8] + spacing[5] : spacing[3],
            }}
            initialScrollIndex={initialScrollIndex}
            // so the list will re-render when the ride route changes, and so the item will be marked
            extraData={[rideRoute, routePlanDate, trains.status, loadingDate, hideSlowTrains, maxChanges]}
            ListFooterComponent={
              <DateScroll
                setTime={loadNextDayData}
                currenTime={nextDayDate.getTime()}
                isLoadingDate={isNextDayLoading}
                isDisabled={trains.isFetching}
              />
            }
            ListFooterComponentStyle={{ paddingBottom: spacing[3] }}
          />
          {showHourIndex && <HourIndexBar entries={hourIndexEntries} topHour={topHour} onSelect={scrollToHour} />}
        </View>
      )}

      {noTrainsFound && !trains.isLoading && isInternetReachable && routeData.length === 0 && (
        <View style={{ marginTop: spacing[4] }}>
          <NoTrainsFoundMessage />
        </View>
      )}

      {allRoutesHiddenByFilter && <FilteredTrainsMessage maxChanges={maxChanges} onShowAll={() => setMaxChanges(null)} />}

      {warning && <RouteListWarning key={`${warning.requestedTime}-${warning.routesDate}-${warning.warningType}`} {...warning} />}
    </Screen>
  )
}

const styles = StyleSheet.create((theme) => ({
  root: {
    backgroundColor: theme.colors.background,
    flex: 1,
  },
  listContainer: {
    flex: 1,
  },
}))
