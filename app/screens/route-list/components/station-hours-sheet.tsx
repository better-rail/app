import { forwardRef } from "react"
import { View, type ViewStyle } from "react-native"
import type BottomSheet from "@gorhom/bottom-sheet"
import { BottomSheetView } from "@gorhom/bottom-sheet"
import { Text } from "../../../components"
import { BottomSheetModal } from "../../../components/sheets/bottom-sheet-modal"
import { color, spacing } from "../../../theme"
import { observer } from "mobx-react-lite"
import { useQuery } from "react-query"
import { railApi } from "../../../services/api"
import { dateFnsLocalization, userLocale } from "../../../i18n"
import { addDays, format, parseISO } from "date-fns"

const WRAPPER: ViewStyle = {
  paddingHorizontal: spacing[4],
  paddingTop: spacing[5],
  alignItems: "center",
  gap: 16,
  flex: 1,
  backgroundColor: color.background,
}

type Props = {
  stationId: string
  onDone: () => void
}

export const StationHoursSheet = observer(
  forwardRef<BottomSheet, Props>(({ stationId }, ref) => {
    const { data: stationInfo, isLoading } = useQuery(["stationInfo", stationId], () => {
      return railApi.getStationInfo(userLocale, stationId)
    })

    return (
      <BottomSheetModal ref={ref}>
        <BottomSheetView style={WRAPPER}>
          {isLoading ? (
            <Text>טוען...</Text>
          ) : (
            <View>
              {stationInfo.gateInfo.map((gate) => (
                <View key={gate.stationGateId}>
                  <Text style={{ fontWeight: "bold" }}>{gate.gateName}</Text>
                  {gate.gateActivityHours
                    .filter((activityHour) => activityHour.activityHoursType === 1)
                    .map((activityHour) => (
                      <>
                        <Text>{convertDaysToAbbreviation(activityHour.activityDaysNumbers)}</Text>
                        <Text>
                          {activityHour.startHour} {"->"} {activityHour.endHour}
                        </Text>
                      </>
                    ))}
                </View>
              ))}
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
      result.push(start === prev ? getDayName(start) : `${getDayName(start)}-${getDayName(prev)}`)
      start = daysOfWeek[i]
      prev = daysOfWeek[i]
    }
  }

  // Push the last range or single day
  result.push(start === prev ? getDayName(start) : `${getDayName(start)}-${getDayName(prev)}`)

  return result.join(",")
}
