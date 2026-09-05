import { View, Image } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components/text/text"

type AnnouncementsHeaderProps = {
  separator?: "top" | "bottom"
}

export const AnnouncementsHeader: React.FC<AnnouncementsHeaderProps> = ({ separator }) => {
  return (
    <>
      {separator === "top" && <View style={styles.separator} />}
      <View style={styles.headerRow}>
        <Image style={styles.icon} source={require("../../../assets/info.png")} />
        <Text tx="routes.updates" style={styles.headerText} />
      </View>
      {separator === "bottom" && <View style={styles.separator} />}
    </>
  )
}

const styles = StyleSheet.create((theme) => ({
  separator: {
    backgroundColor: theme.colors.separator,
    height: 1,
    width: "100%",
    marginVertical: theme.spacing[4],
  },
  headerRow: {
    width: "100%",
    marginBottom: theme.spacing[4],
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    width: 20,
    height: 20,
    marginEnd: theme.spacing[2],
    tintColor: theme.colors.text,
  },
  headerText: {
    fontWeight: "500",
  },
}))
