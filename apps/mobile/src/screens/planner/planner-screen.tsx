import React, { useRef, useState, useEffect } from "react"
import { View, Animated, AppState, Platform, Alert, ScrollView, I18nManager, useWindowDimensions } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import type { AppStateStatus } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import {
  Screen,
  Button,
  Text,
  StationCard,
  DummyInput,
  ChangeDirectionButton,
  ResetTimeButton,
  DatePickerModal,
  WebsiteHomeHandoff,
} from "@/components"
import { useShallow } from "zustand/react/shallow"
import { useRoutePlanStore, useTrainRoutesStore, useDateTypeDisplayName } from "@/models"
import HapticFeedback from "react-native-haptic-feedback"
import { spacing } from "@/theme"
import { useStations } from "@/data/stations"
import { translate, useFormattedDate } from "@/i18n"
import { useQuery } from "react-query"
import { differenceInHours, parseISO } from "date-fns"
import { save, load } from "@/utils/storage"
import { donateRouteIntent } from "@/utils/ios-helpers"
import { trackEvent } from "@/services/analytics"
import { useRouter, useIsFocused } from "expo-router"
import { useObserve } from "expo-observe"
import { useMountEffect } from "@/hooks"
import { useIsWideLayout } from "@/hooks/use-is-wide-layout"
import { FavoriteRoutes } from "@/components/favorite-routes/favorite-routes"
import { PlannerScreenHeader } from "./planner-screen-header"
import { FlingGestureWrapper } from "./planner-slider-wrapper"
import { routeListDayQueryKey } from "@/screens/route-list/route-list-query"

export function PlannerScreen() {
  const router = useRouter()
  const { markInteractive } = useObserve()
  const { date, origin, destination, setDate, switchDirection } = useRoutePlanStore(
    useShallow((s) => ({
      date: s.date,
      origin: s.origin,
      destination: s.destination,
      setDate: s.setDate,
      switchDirection: s.switchDirection,
    })),
  )
  const dateTypeDisplayName = useDateTypeDisplayName()
  const isFocused = useIsFocused()
  const getRoutes = useTrainRoutesStore((s) => s.getRoutes)
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false)

  const formattedDate = useFormattedDate(date)
  const stationCardScale = useRef(new Animated.Value(1)).current

  const now = new Date()

  const stations = useStations()
  // On iOS the favorite routes sit beside the planner in the system split view's second column (see AppSplitView),
  // on iPhone Duo's open inner display and iPads; this screen is the first column, capped so it never stretches into
  // a desktop-like form. Elsewhere, wide windows (tablets) lay the two out here, meeting on the display's centre line.
  const isWideWindow = useIsWideLayout()
  const isWide = Platform.OS !== "ios" && isWideWindow
  const { width: windowWidth } = useWindowDimensions()
  const insets = useSafeAreaInsets()
  // The row starts after the start inset: the left one, or the right one in right-to-left layouts.
  const centreSplitWidth = windowWidth / 2 - (I18nManager.isRTL ? insets.right : insets.left)

  // The datetimepicker docs says the first argument is an event, but we get a date instead
  // https://github.com/react-native-datetimepicker/datetimepicker#onchange-optional
  const onDateChange = (newDate: Date) => {
    setDate(newDate)
  }

  const handleConfirm = (date: Date) => {
    // We have to hide the date picker before changing the date value:
    // https://github.com/react-native-datetimepicker/datetimepicker/issues/54#issuecomment-552951685
    setDatePickerVisibility(false)
    onDateChange(date)
  }

  const onDateReset = () => {
    trackEvent("reset_date_press")
    HapticFeedback.trigger("impactLight")
    onDateChange(new Date())
  }

  const originData = (() => {
    if (origin) {
      return stations.find((s) => s.id === origin.id)
    }

    return undefined
  })()

  const destinationData = (() => {
    if (destination) {
      return stations.find((s) => s.id === destination.id)
    }

    return undefined
  })()

  const scaleStationCards = () => {
    Animated.sequence([
      Animated.timing(stationCardScale, {
        toValue: 0.96,
        duration: 175,
        useNativeDriver: true,
      }),
      Animated.timing(stationCardScale, {
        toValue: 1,
        duration: 175,
        useNativeDriver: true,
      }),
    ]).start()
  }

  const onSwitchPress = () => {
    scaleStationCards()
    HapticFeedback.trigger("impactMedium")

    // Delay the actual switch so it'll be synced with the animation
    setTimeout(() => {
      switchDirection()
    }, 50)

    trackEvent("switch_stations_btn_press")
  }

  const onGetRoutePress = () => {
    const { id: originId } = origin
    const { id: destinationId } = destination
    if (Platform.OS === "ios") {
      donateRouteIntent(originId, destinationId)
    }
    router.push({
      pathname: "/route-list",
      params: { originId, destinationId, time: String(date.getTime()), enableQuery: "true" },
    })
  }

  /**
   * When the app is in the background it may remain active in memory.
   * Therefor, `routePlan.date` might be irrelevant when opening the app after a period of time.
   *
   * This effect refreshes the date if the app has been in the background for more than 1 hour.
   */
  useEffect(() => {
    function refreshDate(currentState: AppStateStatus) {
      if (currentState === "active") {
        load("lastAppLaunch").then((launchDate: string) => {
          if (launchDate) {
            const hoursDiff = differenceInHours(new Date(), parseISO(launchDate))

            if (hoursDiff >= 1) {
              setDate(new Date())
            }
          }
          save("lastAppLaunch", new Date())
        })
      }
    }

    save("lastAppLaunch", new Date())
    const subscription = AppState.addEventListener("change", refreshDate)

    return () => subscription.remove()
  }, [])

  useMountEffect(() => {
    // Mark the screen as interactive for EAS Observe TTI metrics.
    markInteractive()
  })

  // Prefetch the complete search result, including any automatic date change.
  const queryKey = routeListDayQueryKey(origin?.id, destination?.id, date.getTime())
  useQuery(queryKey, () => getRoutes(origin?.id, destination?.id, date.getTime()), {
    cacheTime: 7200000,
    retry: false,
    enabled: !!origin && !!destination && isFocused,
  })

  const originField = (
    <>
      <Text preset="fieldLabel" tx="plan.origin" style={{ marginBottom: spacing[1] }} />
      <Animated.View testID={`planner-origin-${origin?.id ?? "empty"}`} style={{ transform: [{ scale: stationCardScale }] }}>
        <StationCard
          testID="planner-origin-card"
          name={originData?.name}
          image={originData?.image}
          style={{ marginBottom: spacing[4] }}
          onPress={() => router.push({ pathname: "/select-station", params: { selectionType: "origin" } })}
        />
      </Animated.View>
    </>
  )

  const destinationField = (
    <>
      <Text preset="fieldLabel" tx="plan.destination" style={{ marginBottom: spacing[1] }} />
      <Animated.View
        testID={`planner-destination-${destination?.id ?? "empty"}`}
        style={{ transform: [{ scale: stationCardScale }] }}
      >
        <StationCard
          testID="planner-destination-card"
          name={destinationData?.name}
          image={destinationData?.image}
          style={{ marginBottom: spacing[4] }}
          onPress={() => router.push({ pathname: "/select-station", params: { selectionType: "destination" } })}
        />
      </Animated.View>
    </>
  )

  const swapButton = (
    <ChangeDirectionButton testID="switch-stations-button" onPress={onSwitchPress} disabled={!origin || !destination} />
  )

  const timeField = (
    <>
      <Text preset="fieldLabel" text={dateTypeDisplayName} style={{ marginBottom: spacing[1] }} />
      <DummyInput
        placeholder={translate("plan.now")}
        value={formattedDate}
        style={{ marginBottom: spacing[5] }}
        onPress={() => setDatePickerVisibility(true)}
        endSection={formattedDate !== translate("plan.now") && <ResetTimeButton onPress={onDateReset} />}
      />
    </>
  )

  const findButton = (
    <Button
      testID="find-routes-button"
      title={translate("plan.find")}
      onPress={onGetRoutePress}
      disabled={!origin || !destination || origin.id === destination.id}
      onDisabledPress={() => {
        if (origin?.id === destination?.id) {
          Alert.alert(translate("routes.sameStationsMessage"))
        }
      }}
    />
  )

  const plannerForm = (
    <>
      <PlannerScreenHeader />

      <Text preset="header" tx="plan.title" style={styles.screenTitle} />

      {originField}
      <View style={styles.changeDirectionWrapper}>{swapButton}</View>
      {destinationField}
      {timeField}
      {findButton}
    </>
  )

  const favoritesSidebar = (
    <ScrollView style={styles.savedRoutesSidebar} contentContainerStyle={styles.savedRoutesContent}>
      <FavoriteRoutes
        onSelect={() => {
          scaleStationCards()
          HapticFeedback.trigger("impactLight")
        }}
      />
    </ScrollView>
  )

  return (
    <Screen testID="planner-screen" style={styles.root}>
      <WebsiteHomeHandoff />
      {isWide ? (
        // Wide tablets: the planner keeps its phone layout in a column, and the favorite routes fill the other side —
        // one tap from planning a trip.
        <View style={styles.wideRow}>
          <View style={{ width: centreSplitWidth }}>
            <FlingGestureWrapper onFling={onSwitchPress}>
              <View style={[styles.contentWrapper, styles.widePlanner]}>{plannerForm}</View>
            </FlingGestureWrapper>
          </View>
          {favoritesSidebar}
        </View>
      ) : (
        <FlingGestureWrapper onFling={onSwitchPress}>
          {/* In the split view's column the cap only matters once the column is wider than a phone. */}
          <View style={[styles.contentWrapper, Platform.OS === "ios" && styles.widePlanner]}>{plannerForm}</View>
        </FlingGestureWrapper>
      )}

      <DatePickerModal
        isVisible={isDatePickerVisible}
        onConfirm={handleConfirm}
        onCancel={() => setDatePickerVisibility(false)}
        minimumDate={now}
      />
    </Screen>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  root: {
    backgroundColor: theme.colors.background,
  },
  contentWrapper: {
    flex: 1,
    padding: theme.spacing[4],
    // The Screen wrapper already applies the top safe-area inset, so keep the top
    // padding flush to sit the header close to the status bar and reclaim screen space.
    paddingTop: 0,
    backgroundColor: theme.colors.background,
  },
  screenTitle: {
    marginBottom: 3,
  },
  wideRow: {
    flex: 1,
    flexDirection: "row",
  },
  widePlanner: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
  },
  savedRoutesSidebar: {
    flex: 1,
    borderStartWidth: StyleSheet.hairlineWidth,
    borderStartColor: theme.colors.dimmer,
  },
  // Lines the favorites' heading up with the planner's title, below the header row.
  savedRoutesContent: {
    paddingTop: 48 + theme.spacing[2],
    paddingBottom: theme.spacing[5],
  },
  changeDirectionWrapper: {
    width: 65,
    height: 65,
    top: rt.screen.height > 730 ? -30 : -25,
    end: rt.screen.height > 730 ? 10 : 5,
    alignSelf: "flex-end",
    marginBottom: -60,
    zIndex: 10,
  },
}))
