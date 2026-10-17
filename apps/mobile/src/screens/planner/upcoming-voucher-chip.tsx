import { Image, Pressable, View } from "react-native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import { useRouter } from "expo-router"
import { GlassView } from "expo-glass-effect"
import { format, isToday } from "date-fns"
import HapticFeedback from "react-native-haptic-feedback"
import { Text } from "@/components"
import { dateFnsLocalization, translate } from "@/i18n"
import { useUpcomingVoucher } from "@/hooks/use-upcoming-voucher"
import { formatTime } from "@/utils/helpers/date-helpers"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"
import { trackEvent } from "@/services/analytics"

const TICKET_ICON = require("../../../assets/station-ticket.png")

/** A gold pill in the planner header that opens the voucher for the rider's next Jerusalem train. */
export function UpcomingVoucherChip() {
  const router = useRouter()
  const { theme } = useUnistyles()
  const voucher = useUpcomingVoucher()

  if (!voucher) return null

  const departure = formatVoucherDeparture(voucher.departureTime)

  const onPress = () => {
    HapticFeedback.trigger("impactLight")
    router.push({ pathname: "/voucher/ticket", params: { code: voucher.confirmationCode } })
    trackEvent("voucher_chip_pressed")
  }

  const content = (
    <>
      <Image source={TICKET_ICON} style={styles.icon} />
      <Text style={styles.time} maxFontSizeMultiplier={1.3}>
        {departure}
      </Text>
    </>
  )

  return (
    <Pressable
      testID="upcoming-voucher-chip"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${translate("voucher.title")}, ${departure}`}
      accessibilityHint={translate("voucher.show") ?? undefined}
      style={({ pressed }) => !isLiquidGlassSupported && pressed && styles.pressed}
    >
      {isLiquidGlassSupported ? (
        <GlassView isInteractive tintColor={theme.colors.voucherBackground} style={styles.chip}>
          {content}
        </GlassView>
      ) : (
        <View style={[styles.chip, styles.solidChip]}>{content}</View>
      )}
    </Pressable>
  )
}

// Just the time for today's train, with the weekday for a later one
const formatVoucherDeparture = (departureTime: number) =>
  isToday(departureTime)
    ? formatTime(departureTime)
    : `${format(departureTime, "EEE", { locale: dateFnsLocalization })} ${formatTime(departureTime)}`

const styles = StyleSheet.create((theme, rt) => ({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginStart: theme.spacing[2],
    paddingVertical: 4 * Math.min(rt.fontScale, 1.3),
    paddingHorizontal: theme.spacing[3],
    borderRadius: 30,
  },
  solidChip: {
    backgroundColor: theme.colors.voucherBackground,
    borderWidth: 1,
    borderColor: theme.colors.voucherBorder,
  },
  pressed: {
    opacity: 0.7,
  },
  icon: {
    width: 18,
    height: 18,
    tintColor: theme.colors.voucherText,
  },
  time: {
    color: theme.colors.voucherText,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
}))
