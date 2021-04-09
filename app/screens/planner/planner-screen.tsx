import React, { useRef, useState } from "react"
import { observer } from "mobx-react-lite"
import { ImageBackground, View, ViewStyle, Animated } from "react-native"
import DateTimePickerModal from "react-native-modal-datetime-picker"
import { Screen, Button, Text, StationCard, DummyInput, ChangeDirectionButton } from "../../components"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { useStores } from "../../models"
import { color, spacing } from "../../theme"
import { PlannerScreenProps } from "../../navigators/main-navigator"
import stations from "../../data/stations"
import { formatRelative, differenceInMinutes } from "date-fns"
import { he } from "date-fns/locale"

const background = require("../../../assets/planner-background.png")
const now = new Date()

// #region styles
const ROOT: ViewStyle = {
  backgroundColor: color.transparent,
  flex: 1,
}

const BACKGROUND: ViewStyle = {
  width: "100%",
  flex: 1,
}

const CONTENT_WRAPPER: ViewStyle = {
  flex: 1,
  marginTop: 125,
  padding: spacing[4],
  backgroundColor: color.line,
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
}
// #endregion

export const PlannerScreen = observer(function PlannerScreen({ navigation }: PlannerScreenProps) {
  const { routePlan } = useStores()
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false)
  const insets = useSafeAreaInsets()
  const stationCardScale = useRef(new Animated.Value(1)).current

  const handleConfirm = (date) => {
    routePlan.setDate(date)
    setDatePickerVisibility(false)
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

    setTimeout(() => {
      routePlan.switchDirection()
    }, 70)
  }

  const onGetRoutePress = () => {
    navigation.navigate("routeList", {
      originId: routePlan.origin.id,
      destinationId: routePlan.destination.id,
      time: routePlan.date.getTime(),
    })
  }

  return (
    <Screen style={ROOT} preset="fixed" unsafe={true}>
      <ImageBackground source={background} style={[BACKGROUND, { paddingTop: insets.top }]}>
        <View style={[CONTENT_WRAPPER, { marginTop: CONTENT_WRAPPER.marginTop - insets.bottom }]}>
          <Text preset="header" text="תכנון מסלול" style={{ marginBottom: spacing[3] }} />

          <Text preset="fieldLabel" text="תחנת מוצא" style={{ marginBottom: spacing[1] }} />
          <Animated.View style={{ transform: [{ scale: stationCardScale }] }}>
            <StationCard
              name={originData?.name}
              image={originData?.image}
              style={{ marginBottom: spacing[3] }}
              onPress={() => navigation.navigate("selectStation", { selectionType: "origin" })}
            />
          </Animated.View>
          <View style={{ zIndex: 10 }}>
            <ChangeDirectionButton onPress={onSwitchPress} style={{ position: "absolute", end: 10, top: -26 }} />
          </View>

          <Text preset="fieldLabel" text="תחנת יעד" style={{ marginBottom: spacing[1] }} />
          <Animated.View style={{ transform: [{ scale: stationCardScale }] }}>
            <StationCard
              name={destinationData?.name}
              image={destinationData?.image}
              style={{ marginBottom: spacing[3] }}
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
            onConfirm={handleConfirm}
            onCancel={() => setDatePickerVisibility(false)}
            locale={"he_IL"}
            minimumDate={now}
            customHeaderIOS={() => null}
            customCancelButtonIOS={() => null}
            confirmTextIOS="אישור"
          />
        </View>
      </ImageBackground>
    </Screen>
  )
})
