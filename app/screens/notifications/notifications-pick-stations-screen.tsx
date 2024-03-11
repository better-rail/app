import { ScrollView, View } from "react-native"
import { StationListItem } from "./station-list-item"
import { spacing } from "../../theme"

export function NotificationsPickStationsScreen() {
  return (
    <ScrollView style={{ paddingHorizontal: spacing[2] }} contentContainerStyle={{ rowGap: 12 }}>
      <StationListItem />
      <StationListItem />
      <StationListItem />
    </ScrollView>
  )
}
