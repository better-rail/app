import { Platform, ScrollView, View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import { Screen } from "../../components"
import { color, spacing } from "../../theme"
import { useIsDarkMode } from "../../hooks"
import { AnnouncementsScreenProps } from "../../navigators/announcements/announcements-navigator"
import { AnnouncementsList } from "../../components/announcements/announcements-list"

const ROOT: ViewStyle = {
  backgroundColor: color.background,
}

const SCROLL_VIEW: ViewStyle = {
  padding: spacing[3],
  paddingBottom: spacing[5],
}

export const AnnouncementsScreen = observer(function AnnouncementsScreen({ navigation }: AnnouncementsScreenProps) {
  const isDarkMode = useIsDarkMode()

  return (
    <Screen
      style={ROOT}
      preset="fixed"
      unsafe={true}
      statusBar={Platform.select({ ios: "light-content" })}
      statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
    >
      <ScrollView contentContainerStyle={SCROLL_VIEW}>
        <AnnouncementsList updatesType="regular" />
      </ScrollView>
    </Screen>
  )
})
