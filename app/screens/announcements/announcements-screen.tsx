import { Platform, ScrollView, View, ViewStyle } from "react-native"
import { observer } from "mobx-react-lite"
import { Screen, Text } from "../../components"
import { color, fontScale, spacing } from "../../theme"
import { useIsDarkMode } from "../../hooks"
import { AnnouncementsScreenProps } from "../../navigators/announcements/announcements-navigator"
import { AnnouncementsList } from "../../components/announcements/announcements-list"
import TouchableScale from "react-native-touchable-scale"

const ROOT: ViewStyle = {
  backgroundColor: color.background,
}

const SCROLL_VIEW: ViewStyle = {
  padding: spacing[3],
  paddingBottom: spacing[5],
}

const NOTIFICATOIN_BUTTON: ViewStyle = {
  justifyContent: "center",
  height: 100 * fontScale,
  paddingHorizontal: spacing[3],
  marginBottom: spacing[3],
  backgroundColor: color.primary,
  borderRadius: 12,
  shadowColor: color.palette.black,
  shadowOffset: { height: 0, width: 0 },
  shadowOpacity: 0.05,
  elevation: 4,
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
        <TouchableScale
          onPress={() => navigation.navigate("notificationsSetup")}
          activeScale={0.97}
          friction={10}
          style={NOTIFICATOIN_BUTTON}
        >
          <Text
            tx="announcements.notifications.newButtonTitle"
            style={{ textAlign: "center", fontSize: 18, color: color.whiteText, fontWeight: "500" }}
          />

          <Text
            tx="announcements.notifications.newButtonContent"
            style={{ textAlign: "center", fontSize: 16, color: color.whiteText }}
          />
        </TouchableScale>

        <AnnouncementsList updatesType="regular" />
      </ScrollView>
    </Screen>
  )
})
