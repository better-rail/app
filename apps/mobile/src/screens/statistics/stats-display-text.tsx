import { StyleSheet } from "react-native-unistyles"
import { Text } from "@/components/text/text"
import type { TextProps } from "@/components/text/text.props"
import { userLocale } from "@/i18n"

/** Short stats headings and metric captions. Controls, dates and body copy keep Heebo. */
export function StatsDisplayText({ englishSize = 20, style, ...props }: TextProps & { englishSize?: number }) {
  return <Text {...props} style={[style, userLocale === "en" && styles.english(englishSize)]} />
}

const styles = StyleSheet.create({
  english: (size: number) => ({
    fontFamily: "BebasNeue",
    fontSize: size,
    lineHeight: Math.round(size * 1.2),
    fontWeight: "400",
    letterSpacing: 0.6,
  }),
})
