import { useEffect } from "react"
import { Alert, Image, Platform, PlatformColor, Pressable, ViewStyle } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useRouter } from "expo-router"
import { GlassView } from "expo-glass-effect"
import HapticFeedback from "react-native-haptic-feedback"
import { translate } from "@/i18n"
import { findVouchers, useVouchersStore } from "@/models/vouchers/vouchers"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import { useVoucherAvailability } from "@/hooks/use-voucher-availability"
import { useVouchersEnabled } from "@/hooks/use-vouchers-enabled"
import { getVoucherTitle, getVoucherTrip } from "@/utils/helpers/voucher-helpers"
import { trackEvent } from "@/services/analytics"
import type { Train } from "@/services/api"

const preventLongPressNavigation = () => undefined

/** Orders, or shows the ordered, Jerusalem – Yitzhak Navon entry voucher for a train. */
export function VoucherButton({ train, style }: { train: Train; style: ViewStyle }) {
  const router = useRouter()
  // With booking switched off, the button only opens vouchers the rider already holds
  const vouchersEnabled = useVouchersEnabled()
  const { isBookable, isSoldOut, isLow, remaining } = useVoucherAvailability(vouchersEnabled ? train : undefined)
  const voucher = useVouchersStore((s) => findVouchers(s.vouchers, getVoucherTrip(train))[0])

  useEffect(() => {
    if (isBookable && !voucher) trackEvent("voucher_offer_shown")
  }, [isBookable, voucher])

  if (!voucher && !isBookable && !isSoldOut) return null

  const availability = (() => {
    if (voucher) return translate("voucher.booked", { count: voucher.passengers })
    if (isSoldOut) return translate("voucher.soldOut")
    if (remaining === undefined) return null
    return translate(isLow ? "voucher.almostSoldOut" : "voucher.seatsAvailable", { count: remaining })
  })()

  const onPress = () => {
    if (!voucher && isSoldOut) {
      Alert.alert(getVoucherTitle(train.originStationId), translate("voucher.soldOut") ?? "")
      return
    }
    HapticFeedback.trigger("impactLight")
    if (voucher) {
      router.push({ pathname: "/voucher/ticket", params: { code: voucher.confirmationCode } })
    } else {
      useNavigationParamsStore.getState().setVoucherTrain(train)
      router.push("/voucher")
    }
  }

  return (
    <Pressable
      testID="voucher-button"
      // Without an onLongPress handler, Pressable treats a long hold as a press on release
      onLongPress={preventLongPressNavigation}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={[getVoucherTitle(train.originStationId), availability].filter(Boolean).join(", ")}
      accessibilityHint={(voucher ? translate("voucher.show") : translate("voucher.book")) ?? undefined}
    >
      <GlassView
        style={style}
        isInteractive={!isSoldOut || !!voucher}
        glassEffectStyle="regular"
        tintColor={Platform.OS === "ios" ? PlatformColor("tertiarySystemBackground") : undefined}
      >
        <Image
          source={require("../../../../assets/station-ticket.png")}
          style={[
            styles.icon,
            voucher && styles.iconBooked,
            isLow && !voucher && styles.iconLow,
            isSoldOut && !voucher && styles.iconDisabled,
          ]}
        />
      </GlassView>
    </Pressable>
  )
}

const styles = StyleSheet.create((theme) => ({
  icon: {
    width: 26,
    height: 26,
    tintColor: theme.colors.text,
  },
  iconBooked: {
    tintColor: theme.colors.greenText,
  },
  iconLow: {
    tintColor: theme.colors.error,
  },
  iconDisabled: {
    opacity: 0.4,
  },
}))
