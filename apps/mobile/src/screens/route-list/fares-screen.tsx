import { ActivityIndicator, Platform, Pressable, View } from "react-native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import Svg, { Circle, Path } from "react-native-svg"
import { useLocalSearchParams } from "expo-router"
import { useQuery } from "react-query"
import HapticFeedback from "react-native-haptic-feedback"
import { Text } from "@/components"
import { ContextMenu } from "@/components/context-menu/context-menu"
import { useMountEffect } from "@/hooks/use-mount-effect"
import { translate, userLocale } from "@/i18n"
import { useSettingsStore } from "@/models"
import { SETTING_GROUP, settingsBorderRadius } from "@/screens/settings/settings-styles"
import { faresApi, isConnectionError } from "@/services/api"
import type { FareProfile } from "@/services/api"
import { trackEvent } from "@/services/analytics"
import {
  DEFAULT_PROFILE_ID,
  discountedPrices,
  formatPrice,
  hasMonthlyOnlyDiscount,
  isFree,
  profileName,
  profileNote,
  ridesFree,
} from "@/utils/helpers/fare-helpers"

// The tariff moves about once a year; the sheet is reopened far more often than that.
const FARES_STALE_TIME = 60 * 60 * 1000

/**
 * Ticket fares for the route, per passenger profile. The prices come from the
 * server's snapshot of Israel Railways' tariff (`/fares`); the chosen profile is
 * remembered in settings.
 */
export function FaresScreen() {
  const { originId, destinationId } = useLocalSearchParams<{ originId: string; destinationId: string }>()
  const profileCode = useSettingsStore((s) => s.profileCode)
  const setProfileCode = useSettingsStore((s) => s.setProfileCode)

  const fare = useQuery(["fare", originId, destinationId], () => faresApi.getRouteFare(originId, destinationId), {
    enabled: !!originId && !!destinationId,
    retry: 1,
    staleTime: FARES_STALE_TIME,
  })
  const profiles = useQuery(["fareProfiles"], () => faresApi.getProfiles(), { retry: 1, staleTime: FARES_STALE_TIME })

  useMountEffect(() => {
    trackEvent("fares_opened", { originId, destinationId })
  })

  const profileList = (profiles.data ?? []).filter((profile) => !ridesFree(profile))
  const selectedProfile =
    profileList.find((profile) => profile.id === profileCode) ??
    profileList.find((profile) => profile.id === DEFAULT_PROFILE_ID) ??
    null

  const selectProfile = (profile: FareProfile) => {
    HapticFeedback.trigger("impactLight")
    setProfileCode(profile.id)
    trackEvent("fare_profile_selected", { profileId: profile.id })
  }

  const passengerProfileLabel = translate("profileCodes.passengerProfile") ?? undefined
  const isLoading = fare.isLoading || profiles.isLoading
  const isUnavailable = fare.isError || profiles.isError
  // A failed request means one of two different things to the user: the phone couldn't
  // reach us at all, or the server has no tariff to serve. Only the first is worth retrying.
  const offline = isConnectionError(fare.error ?? profiles.error)

  const retry = () => {
    HapticFeedback.trigger("impactLight")
    if (fare.isError) fare.refetch()
    if (profiles.isError) profiles.refetch()
  }
  const note = selectedProfile ? profileNote(selectedProfile, userLocale) : null
  const monthlyOnly = selectedProfile ? hasMonthlyOnlyDiscount(selectedProfile) : false

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title} tx="fares.title" />

      {/* A native dropdown menu, so a Touchable child would swallow the tap — plain views only. */}
      <ContextMenu
        style={styles.profileMenu}
        fillWidth
        mode="tap"
        title={passengerProfileLabel}
        disabled={profileList.length === 0}
        actions={profileList.map((profile) => ({
          title: profileName(profile, userLocale),
          selected: profile.id === selectedProfile?.id,
          onPress: () => selectProfile(profile),
        }))}
      >
        <ProfileSelect
          label={passengerProfileLabel}
          value={selectedProfile ? profileName(selectedProfile, userLocale) : translate("profileCodes.general")}
        />
      </ContextMenu>

      {isLoading ? (
        <ActivityIndicator size="large" color="grey" style={styles.loader} />
      ) : isUnavailable ? (
        <View>
          <Text style={styles.message} tx={offline ? "fares.connectionError" : "fares.unavailable"} />
          {offline && (
            <Pressable onPress={retry} accessibilityRole="button" hitSlop={12}>
              <Text style={styles.retry} tx="common.tryAgain" />
            </Pressable>
          )}
        </View>
      ) : !fare.data ? (
        <Text style={styles.message} tx="fares.noFareForRoute" />
      ) : (
        <>
          <View style={SETTING_GROUP}>
            <PriceRow
              first
              label={translate("fares.singleRide")}
              fullPrice={fare.data.prices.single}
              price={discountedPrices(fare.data.prices, selectedProfile).single}
              rate={selectedProfile?.discounts.single ?? 0}
            />
            <PriceRow
              label={translate("fares.dailyPass")}
              fullPrice={fare.data.prices.daily}
              price={discountedPrices(fare.data.prices, selectedProfile).daily}
              rate={selectedProfile?.discounts.daily ?? 0}
            />
            <PriceRow
              last
              label={translate("fares.monthlyPass")}
              fullPrice={fare.data.prices.monthly}
              price={discountedPrices(fare.data.prices, selectedProfile).monthly}
              rate={selectedProfile?.discounts.monthly ?? 0}
            />
          </View>

          {monthlyOnly && <Text style={styles.hint} tx="fares.monthlyOnlyDiscount" />}
          {note && <Text style={styles.hint}>{note}</Text>}
        </>
      )}
    </View>
  )
}

interface ProfileSelectProps {
  label?: string
  value: string | null
}

/**
 * The menu's trigger. It lives inside a SwiftUI host that measures the React
 * subtree with no height, so every text here carries an explicit height —
 * otherwise the labels lay out at 0pt and the row renders blank.
 */
function ProfileSelect({ label, value }: ProfileSelectProps) {
  const { theme } = useUnistyles()
  return (
    <View
      style={styles.profileSelect}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityValue={{ text: value ?? undefined }}
    >
      <View style={styles.profileIcon}>
        <PersonIcon color={theme.colors.palette.blue} />
      </View>
      <View style={styles.profileTexts}>
        <Text style={styles.profileLabel} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.profileValue} numberOfLines={1}>
          {value}
        </Text>
      </View>
    </View>
  )
}

function PersonIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={8} r={4.25} stroke={color} strokeWidth={2.2} />
      <Path d="M4.5 20.5c0-3.6 3.4-6 7.5-6s7.5 2.4 7.5 6" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  )
}

interface PriceRowProps {
  label: string | null
  /** Before the profile's discount. */
  fullPrice: number
  price: number
  rate: number
  first?: boolean
  last?: boolean
}

function PriceRow({ label, fullPrice, price, rate, first, last }: PriceRowProps) {
  const discounted = rate > 0
  return (
    <View
      style={[
        styles.priceRow,
        first && styles.priceRowFirst,
        last && styles.priceRowLast,
        !first && Platform.OS === "ios" && styles.priceRowSeparator,
      ]}
      accessibilityLabel={`${label}: ${isFree(rate) ? translate("fares.free") : formatPrice(price)}`}
    >
      <Text style={styles.priceLabel}>{label}</Text>
      <View style={styles.priceValues}>
        {discounted && <Text style={styles.fullPrice}>{formatPrice(fullPrice)}</Text>}
        <Text style={styles.price}>{isFree(rate) ? translate("fares.free") : formatPrice(price)}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    paddingTop: theme.spacing[5],
    paddingHorizontal: theme.spacing[4],
    paddingBottom: Platform.OS === "ios" ? theme.spacing[4] : theme.spacing[6],
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing[3],
  },
  profileSelect: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[3],
    height: 64,
    paddingHorizontal: theme.spacing[3],
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: settingsBorderRadius,
    borderCurve: "continuous",
    shadowColor: theme.colors.dim,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 0.25,
    elevation: 1,
  },
  profileMenu: {
    marginBottom: theme.spacing[4],
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 122, 255, 0.12)",
  },
  profileTexts: {
    flex: 1,
    alignItems: "flex-start",
    gap: 1,
  },
  profileLabel: {
    height: 16,
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: "500",
    color: theme.colors.label,
  },
  profileValue: {
    height: 22,
    fontSize: 17,
    lineHeight: 22,
    fontWeight: "600",
    color: theme.colors.text,
  },
  loader: {
    marginVertical: theme.spacing[6],
  },
  message: {
    textAlign: "center",
    marginVertical: theme.spacing[5],
    color: theme.colors.dim,
  },
  retry: {
    textAlign: "center",
    marginTop: -theme.spacing[3],
    marginBottom: theme.spacing[4],
    fontWeight: "500",
    color: theme.colors.primary,
  },
  priceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: theme.spacing[4],
  },
  priceRowFirst: {
    borderTopLeftRadius: settingsBorderRadius,
    borderTopRightRadius: settingsBorderRadius,
  },
  priceRowLast: {
    borderBottomLeftRadius: settingsBorderRadius,
    borderBottomRightRadius: settingsBorderRadius,
  },
  priceRowSeparator: {
    borderTopColor: theme.colors.background,
    borderTopWidth: 1,
  },
  priceLabel: {
    fontSize: 16.5,
  },
  priceValues: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: theme.spacing[2],
  },
  fullPrice: {
    fontSize: 14,
    color: theme.colors.dim,
    textDecorationLine: "line-through",
  },
  price: {
    fontSize: 18,
    fontWeight: "bold",
  },
  hint: {
    marginTop: -theme.spacing[2],
    marginBottom: theme.spacing[4],
    paddingHorizontal: theme.spacing[2],
    fontSize: 14,
    opacity: 0.8,
  },
}))
