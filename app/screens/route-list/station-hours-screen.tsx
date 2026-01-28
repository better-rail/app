import { useEffect, useState } from "react"
import { ActivityIndicator, Image, View, TextStyle, ViewStyle } from "react-native"
import { ScrollView } from "react-native-gesture-handler"
import HapticFeedback from "react-native-haptic-feedback"
import { Chip, Text } from "../../components"
import { color, fontScale, spacing } from "../../theme"
import { observer } from "mobx-react-lite"
import { useQuery } from "react-query"
import { railApi } from "../../services/api"
import { dateFnsLocalization, isRTL, userLocale } from "../../i18n"
import { addDays, format, parseISO } from "date-fns"
import type { StationHoursScreenProps } from "../../navigators/main-navigator"

const ARROW_LEFT = require("../../../assets/arrow-left.png")

const WRAPPER: ViewStyle = {
  paddingTop: spacing[4],
  paddingHorizontal: spacing[1],
  minHeight: 328,
}

const DAY_TEXT: TextStyle = {
  fontSize: fontScale * 20,
  color: color.text,
  fontWeight: "bold",
}

const HOUR_TEXT: TextStyle = {
  fontSize: fontScale * 20,
  color: color.text,
}

export const StationHoursScreen = observer(function StationHoursScreen({ route }: StationHoursScreenProps) {
  const { stationId } = route.params
  const { data: stationInfo, isLoading } = useQuery(["stationInfo", stationId], () => {
    return railApi.getStationInfo(userLocale, stationId)
  })

  const [selectedGateId, setSelectedGateId] = useState<number | null>()
  const selectedGate = stationInfo?.gateInfo.find((gate) => gate.stationGateId === selectedGateId)

  useEffect(() => {
    // Select the first gate by default
    setSelectedGateId(stationInfo?.gateInfo[0]?.stationGateId)
  }, [stationInfo])

  return (
    <View style={WRAPPER} key={stationInfo?.gateInfo.length}>
      {isLoading || !selectedGate ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color="grey" />
        </View>
      ) : (
        <View>
          <Text style={{ fontSize: 24, fontWeight: "bold", paddingHorizontal: spacing[4], marginBottom: spacing[2] }}>
            {stationInfo.stationDetails.stationName}
          </Text>
          <ScrollView
            horizontal
            contentContainerStyle={{ paddingHorizontal: spacing[4], marginBottom: spacing[3], gap: spacing[2] }}
            showsHorizontalScrollIndicator={false}
            style={{ maxHeight: 40 * fontScale }}
          >
            {stationInfo.gateInfo.map((gate) => {
              const selected = selectedGateId === gate.stationGateId
              return (
                <Chip
                  variant={selected ? "primary" : "transparent"}
                  onPress={() => {
                    HapticFeedback.trigger("impactLight")
                    setSelectedGateId(gate.stationGateId)
                  }}
                  key={gate.stationGateId}
                >
                  <Text style={{ color: selected ? color.whiteText : color.text, textAlign: "center" }}>{gate.gateName}</Text>
                </Chip>
              )
            })}
          </ScrollView>

          <View style={{ paddingHorizontal: spacing[4], gap: spacing[1] }}>
            {selectedGate.gateActivityHours
              .filter((activityHour) => activityHour.activityHoursType === 1)
              .map((activityHour) => (
                <View style={{ flexDirection: "column", alignItems: "flex-start" }} key={Math.random().toString(36)}>
                  <Text style={DAY_TEXT}>{convertDaysToAbbreviation(activityHour.activityDaysNumbers)}</Text>
                  <Text style={HOUR_TEXT}>
                    {activityHour.activityHoursReplaceTextKey ?? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: isRTL ? spacing[3] : 0 }}>
                        <Text style={HOUR_TEXT}>{activityHour.startHour}</Text>
                        {isRTL ? (
                          <Image source={ARROW_LEFT} style={{ width: 12.5, height: 12.5, tintColor: color.text }} />
                        ) : (
                          <Text style={{ color: color.text, fontSize: fontScale * 18 }}>{" - "}</Text>
                        )}
                        <Text style={HOUR_TEXT}>{activityHour.endHour}</Text>
                      </View>
                    )}
                  </Text>
                </View>
              ))}
          </View>
        </View>
      )}
    </View>
  )
})

const convertDaysToAbbreviation = (input: string) => {
  const daysOfWeek = input
    .split(",")
    .map(Number)
    .sort((a, b) => a - b)

  const result: string[] = []
  let start = daysOfWeek[0]
  let prev = daysOfWeek[0]

  const getDayName = (day: number) => {
    // Calculate the correct date for the day of the week (assuming 1 = Sunday)
    const baseDate = parseISO("2023-01-01") // Any Sunday date works as a base
    const actualDate = addDays(baseDate, day - 1)
    return format(actualDate, "EEE", { locale: dateFnsLocalization }) // Short name (e.g., "Sun", "Mon")
  }

  for (let i = 1; i < daysOfWeek.length; i++) {
    if (daysOfWeek[i] === prev + 1) {
      prev = daysOfWeek[i]
    } else {
      result.push(start === prev ? getDayName(start) : `${getDayName(start)} - ${getDayName(prev)}`)
      start = daysOfWeek[i]
      prev = daysOfWeek[i]
    }
  }

  // Push the last range or single day
  result.push(start === prev ? getDayName(start) : `${getDayName(start)} - ${getDayName(prev)}`)

  return result.join(",")
}
