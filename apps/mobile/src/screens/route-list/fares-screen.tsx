import { ActivityIndicator, Platform, Pressable, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
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

  const profileList = profiles.data ?? []
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
        mode="tap"
        title={passengerProfileLabel}
        disabled={profileList.length === 0}
        actions={profileList.map((profile) => ({
          title: profileName(profile, userLocale),
          onPress: () => selectProfile(profile),
        }))}
      >
        <View
          style={styles.profileSelect}
          accessibilityRole="button"
          accessibilityLabel={passengerProfileLabel}
          accessibilityValue={{ text: selectedProfile ? profileName(selectedProfile, userLocale) : undefined }}
        >
          <Text style={styles.profileLabel} tx="profileCodes.passengerProfile" />
          <View style={styles.profileValueWrapper}>
            <Text style={styles.profileValue}>
              {selectedProfile ? profileName(selectedProfile, userLocale) : translate("profileCodes.general")}
            </Text>
            <View style={styles.chevronWrapper}>
              <Text style={styles.chevron}>▾</Text>
            </View>
          </View>
        </View>
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

      <Text preset="fieldLabel" style={styles.source} tx="profileCodes.dataSource" />
    </View>
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
    justifyContent: "space-between",
    alignItems: "center",
    padding: theme.spacing[4],
    marginBottom: theme.spacing[4],
    backgroundColor: theme.colors.inputBackground,
    borderRadius: settingsBorderRadius,
    borderCurve: "continuous",
    shadowColor: theme.colors.palette.black,
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 0,
    elevation: 1,
  },
  profileLabel: {
    fontWeight: "500",
    color: theme.colors.dim,
  },
  profileValueWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing[2],
    flexShrink: 1,
  },
  profileValue: {
    fontWeight: "500",
    color: theme.colors.text,
    flexShrink: 1,
    textAlign: "right",
  },
  chevronWrapper: {
    justifyContent: "center",
  },
  chevron: {
    color: theme.colors.dim,
    fontSize: 14,
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
  source: {
    textAlign: "center",
    marginTop: theme.spacing[1],
  },
}))
