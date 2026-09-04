import { View, ActivityIndicator } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components"
import { color } from "@/theme"
import { localizedDate } from "@/i18n"

export const ResultDateCard = function ResultDateCard(props: { date: string; isLoading?: boolean }) {
  return (
    <View style={styles.dateContainer}>
      <Text text={localizedDate(props.date)} style={styles.dateText} />
      {props.isLoading && <ActivityIndicator size="small" color={color.primary} style={styles.indicator} />}
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  dateText: {
    color: theme.colors.primary,
  },
  dateContainer: {
    display: "flex",
    alignItems: "center",
    alignContent: "center",
    paddingBottom: theme.spacing[2],
    height: "100%",
    justifyContent: "center",
    flexDirection: "row",
  },
  indicator: {
    marginLeft: theme.spacing[2],
  },
}))
