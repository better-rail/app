import { Platform, ScrollView } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Screen } from "@/components"
import { useIsDarkMode } from "@/hooks"
import { AnnouncementsList } from "@/components/announcements/announcements-list"

export function AnnouncementsScreen() {
  const isDarkMode = useIsDarkMode()

  return (
    <Screen
      style={styles.root}
      preset="fixed"
      unsafe={true}
      statusBar={Platform.select({ ios: "light-content" })}
      statusBarBackgroundColor={isDarkMode ? "#000" : "#fff"}
      translucent
    >
      <ScrollView contentContainerStyle={styles.scrollView}>
        <AnnouncementsList updatesType="regular" />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create((theme) => ({
  root: {
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    padding: theme.spacing[3],
    paddingBottom: theme.spacing[5],
  },
}))
