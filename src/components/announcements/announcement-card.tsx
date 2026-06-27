import { Platform, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import TouchableScale from "react-native-touchable-scale"
import { Text } from "@/components/text/text"
import { openLink } from "@/utils/helpers/open-link"
import { removeHtmlTagsAndEntities } from "./announcements-utils"

type AnnouncementCardProps = {
  title?: string
  body: string
  link?: string
  type?: "normal" | "notification"
}

export const AnnouncementCard = ({ title, body, link, type }: AnnouncementCardProps) => (
  <TouchableScale activeScale={0.98} friction={10} disabled={!link} onPress={() => openLink(link)}>
    <View style={[styles.announcementCard, type === "notification" && styles.announcementCardNotification]}>
      {title && <Text style={[styles.title, type === "notification" && styles.notificationTitle]}>{title}</Text>}

      <Text style={[styles.body, type === "notification" && styles.notificationText]}>{removeHtmlTagsAndEntities(body)}</Text>
    </View>
  </TouchableScale>
)

const styles = StyleSheet.create((theme, rt) => ({
  announcementCard: {
    minHeight: 80 * rt.fontScale,

    marginBottom: theme.spacing[4],
    paddingVertical: theme.spacing[3],
    paddingHorizontal: theme.spacing[3],

    borderRadius: Platform.select({ ios: 12, android: 8 }),
    backgroundColor: Platform.select({ ios: theme.colors.secondaryBackground, android: theme.colors.inputBackground }),
    shadowColor: theme.colors.palette.black,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.05,
    elevation: 1,
  },
  announcementCardNotification: {
    backgroundColor: theme.colors.yellow,
  },
  title: {
    fontFamily: "Heebo",
    color: theme.colors.primaryLighter,
    fontSize: 16,
    marginBottom: theme.spacing[0],
  },
  body: {
    fontFamily: "Heebo",
    fontSize: 14,
  },
  notificationTitle: {
    color: theme.colors.palette.black,
    fontWeight: "600",
  },
  notificationText: {
    color: theme.colors.palette.black,
  },
}))
