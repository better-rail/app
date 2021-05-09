import React, { useRef, useState } from "react"
import { observer } from "mobx-react-lite"
import { Image, View, TouchableOpacity, Animated, PixelRatio, ViewStyle, ImageStyle, Appearance, Dimensions } from "react-native"
import DateTimePickerModal from "react-native-modal-datetime-picker"
import { Screen, Button, Text, StationCard, DummyInput, ChangeDirectionButton } from "../../components"
import { useStores } from "../../models"
import { color, primaryFontIOS, spacing } from "../../theme"
import { PlannerScreenProps } from "../../navigators/main-navigator"
import { useStations } from "../../data/stations"
import { formatRelative, differenceInMinutes } from "date-fns"
import HapticFeedback from "react-native-haptic-feedback"
import { dateFnsLocalization, dateLocale, translate } from "../../i18n"

const now = new Date()
const fontScale = PixelRatio.getFontScale()
const changeIcon = require("../../../assets/up-down-arrow.png")
const isDarkMode = Appearance.getColorScheme() === "dark"

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

const STAR_ICON: ImageStyle = {
  width: headerIconSize,
  height: headerIconSize,
  marginStart: spacing[5],
  tintColor: color.primary,
  opacity: 0.7,
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

const SWITCH_DATE_TYPE_TOUCHABLE: ViewStyle = {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: spacing[1],
}

const CHANGE_ICON: ImageStyle = {
  width: 16 * fontScale,
  height: 16 * fontScale,
  marginStart: 1 + spacing[1] * fontScale,
  tintColor: color.label,
  opacity: 0.5,
  transform: [{ rotate: "90deg" }],
}

// #endregion

export const PlannerScreen = observer(function PlannerScreen({ navigation }: PlannerScreenProps) {
  const { routePlan, trainRoutes } = useStores()
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false)
  const stationCardScale = useRef(new Animated.Value(1)).current

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

  const formattedDate = React.useMemo(() => {
    if (routePlan.date) {
      if (differenceInMinutes(routePlan.date, now) === 0) return translate("plan.now")
      return formatRelative(routePlan.date, now, { locale: dateFnsLocalization })
    }
  }, [routePlan.date])

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

  const onSwitchPress = () => {
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

    // Delay the actual switch so it'll be synced with the animation
    setTimeout(() => {
      routePlan.switchDirection()
    }, 50)
  }

  const onGetRoutePress = () => {
    trainRoutes.updateResultType("normal")
    navigation.navigate("routeList", {
      originId: routePlan.origin.id,
      destinationId: routePlan.destination.id,
      time: routePlan.date.getTime(),
    })
  }

  return (
    <Screen style={ROOT} preset="scroll" statusBarBackgroundColor={isDarkMode ? "#1c1c1e" : color.dim}>
      <View style={CONTENT_WRAPPER}>
        <View style={HEADER_WRAPPER}>
          <TouchableOpacity onPress={() => navigation.navigate("favoritesStack")} activeOpacity={0.8} accessibilityLabel="הגדרות">
            <Image source={require("../../../assets/star.png")} style={STAR_ICON} />
          </TouchableOpacity>
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
          <ChangeDirectionButton onPress={onSwitchPress} />
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

        <TouchableOpacity
          style={SWITCH_DATE_TYPE_TOUCHABLE}
          activeOpacity={0.9}
          onPress={() => {
            HapticFeedback.trigger("impactLight")
            routePlan.switchDateType()
          }}
        >
          <Text preset="fieldLabel" text={routePlan.dateTypeDisplayName} />
          <Image style={CHANGE_ICON} source={changeIcon} />
        </TouchableOpacity>

        <DummyInput
          placeholder={translate("plan.now")}
          value={formattedDate}
          style={{ marginBottom: spacing[5] }}
          onPress={() => setDatePickerVisibility(true)}
        />
        <Button
          title={translate("plan.find")}
          onPress={onGetRoutePress}
          disabled={!routePlan.origin || !routePlan.destination || routePlan.origin.id === routePlan.destination.id}
        />
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="datetime"
          date={routePlan.date}
          onChange={onDateChange}
          onConfirm={handleConfirm}
          onCancel={() => setDatePickerVisibility(false)}
          locale={dateLocale}
          minimumDate={now}
          minuteInterval={15}
          customHeaderIOS={() => null}
          customCancelButtonIOS={() => null}
          confirmTextIOS={translate("common.ok")}
        />
      </View>
    </Screen>
  )
})
