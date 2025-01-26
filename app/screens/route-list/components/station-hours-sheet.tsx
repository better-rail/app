import { forwardRef, useEffect, useState } from "react"
import { ActivityIndicator, ScrollView, TextStyle, View, type ViewStyle } from "react-native"
import type BottomSheet from "@gorhom/bottom-sheet"
import { BottomSheetView } from "@gorhom/bottom-sheet"
import { Chip, Text } from "../../../components"
import { BottomSheetModal } from "../../../components/sheets/bottom-sheet-modal"
import { color, fontScale, spacing } from "../../../theme"
import { observer } from "mobx-react-lite"
import { useQuery } from "react-query"
import { railApi } from "../../../services/api"
import { dateFnsLocalization, userLocale } from "../../../i18n"
import { addDays, format, parseISO } from "date-fns"

const WRAPPER: ViewStyle = {
  paddingHorizontal: spacing[4],
  paddingTop: spacing[4],
  paddingBottom: spacing[8],
  gap: 16,
  flex: 1,
  backgroundColor: color.background,
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

type Props = {
  stationId: string
  onDone: () => void
}

export const StationHoursSheet = observer(
  forwardRef<BottomSheet, Props>(({ stationId }, ref) => {
    // TODO: Persist selected gate in local storage, so it's not reset when the user closes the sheet
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
      <BottomSheetModal ref={ref} enableDynamicSizing>
        <BottomSheetView style={WRAPPER}>
          {isLoading || !selectedGate ? (
            <ActivityIndicator size="large" color="grey" />
          ) : (
            <View>
              <ScrollView
                horizontal
                contentContainerStyle={{ marginBottom: spacing[3], gap: spacing[2] }}
                style={{ maxHeight: 40 * fontScale }}
              >
                {stationInfo.gateInfo.map((gate) => {
                  const selected = selectedGateId === gate.stationGateId
                  return (
                    <Chip
                      variant={selected ? "primary" : "transparent"}
                      onPress={() => setSelectedGateId(gate.stationGateId)}
                      key={gate.stationGateId}
                    >
                      <Text style={{ color: selected ? color.whiteText : color.text, textAlign: "center" }}>{gate.gateName}</Text>
                    </Chip>
                  )
                })}
              </ScrollView>

              <View>
                {selectedGate.gateActivityHours
                  .filter((activityHour) => activityHour.activityHoursType === 1)
                  .map((activityHour) => (
                    <View
                      key={`${selectedGate.stationGateId}-${activityHour.activityHoursType} - ${activityHour.startHour}-${activityHour.endHour}`}
                    >
                      <Text style={DAY_TEXT}>{convertDaysToAbbreviation(activityHour.activityDaysNumbers)}</Text>
                      <Text style={HOUR_TEXT}>
                        {activityHour.startHour} {"-"} {activityHour.endHour}
                      </Text>
                    </View>
                  ))}
              </View>
            </View>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    )
  }),
)

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
