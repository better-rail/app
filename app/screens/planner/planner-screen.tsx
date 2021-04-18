import React, { useRef, useState } from "react"
import { observer } from "mobx-react-lite"
import { Image, View, TouchableOpacity, Animated, PixelRatio, ViewStyle, ImageStyle } from "react-native"
import DateTimePickerModal from "react-native-modal-datetime-picker"
import { Screen, Button, Text, StationCard, DummyInput, ChangeDirectionButton } from "../../components"
import { useStores } from "../../models"
import { color, spacing } from "../../theme"
import { PlannerScreenProps } from "../../navigators/main-navigator"
import stations from "../../data/stations"
import { formatRelative, differenceInMinutes } from "date-fns"
import { he } from "date-fns/locale"

const now = new Date()
const fontScale = PixelRatio.getFontScale()

// #region styles
const ROOT: ViewStyle = {
  backgroundColor: color.background,
}

const CONTENT_WRAPPER: ViewStyle = {
  flex: 1,
  padding: spacing[4],
  backgroundColor: color.background,
}

let settingsSize = 25
if (fontScale > 1.15) settingsSize = 30

const SETTINGS_ICON: ImageStyle = {
  width: settingsSize,
  height: settingsSize,
  alignSelf: "flex-end",
  tintColor: color.primary,
  opacity: 0.7,
}
// #endregion

export const PlannerScreen = observer(function PlannerScreen({ navigation }: PlannerScreenProps) {
  const { routePlan, trainRoute } = useStores()
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false)
  const stationCardScale = useRef(new Animated.Value(1)).current

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
      if (differenceInMinutes(routePlan.date, now) === 0) return "עכשיו"
      return formatRelative(routePlan.date, now, { locale: he })
    }
  }, [routePlan.date])

  const originData = React.useMemo(() => {
    // Since we can't keep the image serialized via mobx, we have to import the station images here
    let origin = routePlan.origin

    if (origin) {
      const originImage = stations.find((s) => s.id === origin.id).image
      origin = Object.assign(origin, { image: originImage })
    }

    return origin
  }, [routePlan.origin?.name])

  const destinationData = React.useMemo(() => {
    let destination = routePlan.destination

    if (destination) {
      const destinationImage = stations.find((s) => s.id === destination.id).image
      destination = Object.assign(destination, { image: destinationImage })
    }

    return destination
  }, [routePlan.destination?.name])

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
    trainRoute.updateResultType("normal")
    navigation.navigate("routeList", {
      originId: routePlan.origin.id,
      destinationId: routePlan.destination.id,
      time: routePlan.date.getTime(),
    })
  }

  return (
    <Screen style={ROOT} preset="scroll" statusBar="default">
      <View style={CONTENT_WRAPPER}>
        <TouchableOpacity onPress={() => navigation.navigate("settings")} activeOpacity={0.8} accessibilityLabel="הגדרות">
          <Image source={require("../../../assets/settings.png")} style={SETTINGS_ICON} />
        </TouchableOpacity>

        <Text preset="header" text="תכנון מסלול" style={{ marginBottom: 6 }} />

        <Text preset="fieldLabel" text="תחנת מוצא" style={{ marginBottom: spacing[1] }} />
        <Animated.View style={{ transform: [{ scale: stationCardScale }] }}>
          <StationCard
            name={originData?.name}
            image={originData?.image}
            style={{ marginBottom: spacing[4] }}
            onPress={() => navigation.navigate("selectStation", { selectionType: "origin" })}
          />
        </Animated.View>

        <View style={{ zIndex: 10, width: 65, height: 65, alignSelf: "flex-end", top: -30, end: 10, marginBottom: -60 }}>
          <ChangeDirectionButton onPress={onSwitchPress} />
        </View>

        <Text preset="fieldLabel" text="תחנת יעד" style={{ marginBottom: spacing[1] }} />
        <Animated.View style={{ transform: [{ scale: stationCardScale }] }}>
          <StationCard
            name={destinationData?.name}
            image={destinationData?.image}
            style={{ marginBottom: spacing[4] }}
            onPress={() => navigation.navigate("selectStation", { selectionType: "destination" })}
          />
        </Animated.View>
        <Text preset="fieldLabel" text="זמן יציאה" style={{ marginBottom: spacing[1] }} />
        <DummyInput
          placeholder="עכשיו"
          value={formattedDate}
          style={{ marginBottom: spacing[5] }}
          onPress={() => setDatePickerVisibility(true)}
        />
        <Button title="חישוב מסלול" onPress={onGetRoutePress} disabled={!routePlan.origin || !routePlan.destination} />
        <DateTimePickerModal
          isVisible={isDatePickerVisible}
          mode="datetime"
          display="inline"
          date={routePlan.date}
          onChange={onDateChange}
          onConfirm={handleConfirm}
          onCancel={() => setDatePickerVisibility(false)}
          locale={"he_IL"}
          minimumDate={now}
          customHeaderIOS={() => null}
          customCancelButtonIOS={() => null}
          confirmTextIOS="אישור"
        />
      </View>
    </Screen>
  )
})
