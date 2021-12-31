import React, { useRef, useState, useEffect } from "react"
import { observer } from "mobx-react-lite"
import {
  Image,
  View,
  TouchableOpacity,
  Animated,
  ViewStyle,
  TextStyle,
  ImageStyle,
  Dimensions,
  AppState,
  AppStateStatus,
  Platform,
} from "react-native"
import { Screen, Button, Text, StationCard, DummyInput, ChangeDirectionButton } from "../../components"
import { useStores } from "../../models"
import { color, primaryFontIOS, fontScale, spacing } from "../../theme"
import { PlannerScreenProps } from "../../navigators/main-navigator"
import { useStations } from "../../data/stations"
import { translate, useFormattedDate, userLocale } from "../../i18n"
import DatePickerModal from "../../components/date-picker-modal"
import { useQuery } from "react-query"
import { isWeekend } from "../../utils/helpers/date-helpers"
import { differenceInHours, parseISO } from "date-fns"
import { save, load } from "../../utils/storage"
import { donateRouteIntent } from "../../utils/ios-helpers"
import * as storage from "../../utils/storage"

const now = new Date()

const { height: deviceHeight } = Dimensions.get("screen")

// #region styles
const ROOT: ViewStyle = {
  backgroundColor: color.background,
}

const CONTENT_WRAPPER: ViewStyle = {
  flex: 1,
  padding: spacing[4],
  backgroundColor: color.background,
}

const HEADER_WRAPPER: ViewStyle = {
  flexDirection: "row",
  justifyContent: "flex-end",
  alignItems: "center",
}

let headerIconSize = 25
if (fontScale > 1.15) headerIconSize = 30

const SETTINGS_ICON: ImageStyle = {
  width: headerIconSize,
  height: headerIconSize,
  marginStart: spacing[3],
  tintColor: color.primary,
  opacity: 0.7,
}

const NEW_FEATURES_BUTTON: ViewStyle = {
  paddingHorizontal: spacing[3] * fontScale,
  paddingVertical: spacing[0] + 1 * fontScale,
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: color.secondary,
  borderRadius: 30,
}

const HEADER_TITLE: TextStyle = {
  marginBottom: primaryFontIOS === "System" ? 6 : 3,
}

const CHANGE_DIRECTION_WRAPPER: ViewStyle = {
  width: 65,
  height: 65,
  top: deviceHeight > 730 ? -30 : -25,
  end: deviceHeight > 730 ? 10 : 5,
  alignSelf: "flex-end",
  marginBottom: -60,
  zIndex: 10,
}

// #endregion

export const PlannerScreen = observer(function PlannerScreen({ navigation }: PlannerScreenProps) {
  const { routePlan, trainRoutes } = useStores()
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false)
  const [displayNewBadge, setDisplayNewBadge] = useState(false)

  const formattedDate = useFormattedDate(routePlan.date)
  const stationCardScale = useRef(new Animated.Value(1)).current

  const { origin, destination } = routePlan

  const stations = useStations()

  // The datetimepicker  docs says the first argument is an event, but we get a date instead
  // https://github.com/react-native-datetimepicker/datetimepicker#onchange-optional
  const onDateChange = (date: Date) => {
    routePlan.setDate(date)
  }

  const handleConfirm = (date: Date) => {
    // We have to hide the date picker before changing the date value:
    // https://github.com/react-native-datetimepicker/datetimepicker/issues/54#issuecomment-552951685
    setDatePickerVisibility(false)
    onDateChange(date)
  }

  const originData = React.useMemo(() => {
    if (routePlan.origin) {
      return stations.find((s) => s.id === routePlan.origin.id)
    }

    return undefined
  }, [routePlan.origin?.name, stations])

  const destinationData = React.useMemo(() => {
    if (routePlan.destination) {
      return stations.find((s) => s.id === routePlan.destination.id)
    }

    return undefined
  }, [routePlan.destination?.name, stations])

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

    // Delay the actual switch so it'll be synced with the animation
    setTimeout(() => {
      routePlan.switchDirection()
    }, 50)
  }

  const onGetRoutePress = () => {
    const { id: originId } = routePlan.origin
    const { id: destinationId } = routePlan.destination

    if (Platform.OS === "ios") {
      donateRouteIntent(originId, destinationId)
    }

    navigation.navigate("routeList", {
      originId,
      destinationId,
      time: routePlan.date.getTime(),
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
              routePlan.setDate(new Date())
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

  useQuery(
    ["origin", origin?.id, "destination", destination?.id, "time", routePlan.date.getDate()],
    () => trainRoutes.getRoutes(origin?.id, destination?.id, routePlan.date.getTime()),
    /**
     *  TODO: Temporary fix for displaying "no trains found" modal, omitting cache during the weekend.
     *  Usually on weekends there are no trains, and the results are displayed for a different day.
     *  Those results will be cached and the "no trains modal" modal won't be displayed for them. Therefor we omit caching during
     *  for weekend requests.
     */
    { cacheTime: isWeekend(routePlan.date) ? 0 : 7200000 },
  )

  useEffect(() => {
    // Widget feature available only for iOS. Arabic translation for announcement is not available yet.
    if (Platform.OS === "ios" && userLocale !== "ar") {
      storage.load("seenWidgetAnnouncement").then((seenWidget) => {
        if (!seenWidget && origin && destination) {
          setDisplayNewBadge(true)
        }
      })
    }
  }, [])

  return (
    <Screen style={ROOT} preset="scroll">
      <View style={CONTENT_WRAPPER}>
        <View style={HEADER_WRAPPER}>
          {!displayNewBadge && (
            <TouchableOpacity style={NEW_FEATURES_BUTTON} onPress={() => navigation.navigate("newFeatureStack")}>
              <Image
                source={require("../../../assets/sparkles.png")}
                style={{ height: 16, width: 16, marginEnd: spacing[2], tintColor: "white" }}
              />
              <Text style={{ color: "white", fontWeight: "500" }} tx="common.new" />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => navigation.navigate("settingsStack")} activeOpacity={0.8} accessibilityLabel="הגדרות">
            <Image source={require("../../../assets/settings.png")} style={SETTINGS_ICON} />
          </TouchableOpacity>
        </View>

        <Text preset="header" tx="plan.title" style={HEADER_TITLE} />

        <Text preset="fieldLabel" tx="plan.origin" text="תחנת מוצא" style={{ marginBottom: spacing[1] }} />
        <Animated.View style={{ transform: [{ scale: stationCardScale }] }}>
          <StationCard
            name={originData?.name}
            image={originData?.image}
            style={{ marginBottom: spacing[4] }}
            onPress={() => navigation.navigate("selectStation", { selectionType: "origin" })}
          />
        </Animated.View>

        <View style={CHANGE_DIRECTION_WRAPPER}>
          <ChangeDirectionButton onPress={onSwitchPress} disabled={!origin || !destination} />
        </View>

        <Text preset="fieldLabel" tx="plan.destination" style={{ marginBottom: spacing[1] }} />
        <Animated.View style={{ transform: [{ scale: stationCardScale }] }}>
          <StationCard
            name={destinationData?.name}
            image={destinationData?.image}
            style={{ marginBottom: spacing[4] }}
            onPress={() => navigation.navigate("selectStation", { selectionType: "destination" })}
          />
        </Animated.View>

        <Text preset="fieldLabel" text={routePlan.dateTypeDisplayName} style={{ marginBottom: spacing[1] }} />

        <DummyInput
          placeholder={translate("plan.now")}
          value={formattedDate}
          style={{ marginBottom: spacing[5] }}
          onPress={() => setDatePickerVisibility(true)}
        />

        <DatePickerModal
          isVisible={isDatePickerVisible}
          mode="datetime"
          date={routePlan.date}
          onChange={onDateChange}
          onConfirm={handleConfirm}
          onCancel={() => setDatePickerVisibility(false)}
          minimumDate={now}
        />

        <Button
          title={translate("plan.find")}
          onPress={onGetRoutePress}
          disabled={!routePlan.origin || !routePlan.destination || routePlan.origin.id === routePlan.destination.id}
        />
      </View>
    </Screen>
  )
})
