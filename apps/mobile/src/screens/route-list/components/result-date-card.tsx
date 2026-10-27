import { View, ActivityIndicator } from "react-native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import { Text } from "@/components"
import { fontScale, spacing } from "@/theme"
import { localizedDate } from "@/i18n"
import { headingFontStyle } from "@/theme/theme-fonts"

const LINE_HEIGHT = 24
// Fixed so the route list can place and offset date headers without measuring them; text scaling caps at 1.3
export const RESULT_DATE_CARD_HEIGHT = Math.round(spacing[2] * 2 + LINE_HEIGHT * Math.min(fontScale, 1.3))

export const ResultDateCard = function ResultDateCard(props: { date: string; isLoading?: boolean }) {
  const { theme } = useUnistyles()
  return (
    <View testID="route-results-date" style={styles.dateContainer}>
      <Text text={localizedDate(props.date)} style={styles.dateText} accessibilityRole="header" />
      {props.isLoading && <ActivityIndicator size="small" color={theme.colors.primary} style={styles.indicator} />}
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  dateText: {
    color: theme.colors.primary,
    lineHeight: LINE_HEIGHT,
    ...headingFontStyle(theme, 16, "normal"),
  },
  dateContainer: {
    display: "flex",
    alignItems: "center",
    alignContent: "center",
    height: RESULT_DATE_CARD_HEIGHT,
    backgroundColor: theme.colors.background,
    justifyContent: "center",
    flexDirection: "row",
  },
  indicator: {
    marginLeft: theme.spacing[2],
  },
}))
