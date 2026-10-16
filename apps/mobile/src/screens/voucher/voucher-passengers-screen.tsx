import { useRef, useState } from "react"
import { ActivityIndicator, ScrollView, View } from "react-native"
import { StyleSheet, useUnistyles } from "react-native-unistyles"
import { useLocalSearchParams, useRouter } from "expo-router"
import { useQuery, useQueryClient } from "react-query"
import HapticFeedback from "react-native-haptic-feedback"
import { Button, Text } from "@/components"
import { translate } from "@/i18n"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import { useVouchersStore } from "@/models/vouchers/vouchers"
import { voucherApi } from "@/services/api"
import { trackEvent } from "@/services/analytics"
import { useVoucherAvailability, voucherCapacityQueryKey } from "@/hooks/use-voucher-availability"
import { getVoucherDate } from "@/utils/helpers/voucher-helpers"
import { PassengerStepper } from "./components/passenger-stepper"
import { VoucherHero } from "./components/voucher-hero"
import { trackVoucherFailure, voucherErrorText } from "./voucher-error"

/** Last step, once signed in: how many vouchers to order, within what's left for this phone. */
export function VoucherPassengersScreen() {
  const router = useRouter()
  const { theme } = useUnistyles()
  const queryClient = useQueryClient()
  const { phone } = useLocalSearchParams<{ phone: string }>()
  const train = useNavigationParamsStore((s) => s.voucherTrain)
  const { remaining, isLow } = useVoucherAvailability(train ?? undefined)
  const departureDate = train ? getVoucherDate(train) : ""

  const [selectedPassengers, setSelectedPassengers] = useState(1)
  const [isOrdering, setIsOrdering] = useState(false)
  // A double tap would order twice, and the extra vouchers can only be cancelled by SMS
  const orderingRef = useRef(false)
  const [error, setError] = useState<string | null>(null)

  const limit = useQuery(
    ["voucherPhoneLimit", train?.trainNumber, departureDate],
    () => voucherApi.getCapacityLimit(train!.trainNumber, departureDate),
    { enabled: !!train, retry: false, cacheTime: 0 },
  )

  if (!train) return null

  const availableForPhone = limit.data
    ? Math.max(0, limit.data.maxPassengersPerCustomerPerTrip - limit.data.currentPassengers)
    : 0
  const max = remaining !== undefined ? Math.min(availableForPhone, remaining) : availableForPhone
  // The cap can drop after a pick (capacity refreshes), so what's shown is also what's ordered
  const passengers = Math.max(1, Math.min(selectedPassengers, max))

  const order = async () => {
    if (orderingRef.current) return
    orderingRef.current = true
    setError(null)
    setIsOrdering(true)
    try {
      const confirmationCode = await voucherApi.order({
        trainNumber: train.trainNumber,
        departureDate,
        fromStationId: train.originStationId,
        toStationId: train.destinationStationId,
        passengers,
      })

      useVouchersStore.getState().add({
        confirmationCode,
        trainNumber: train.trainNumber,
        departureDate,
        departureTime: train.departureTime,
        arrivalTime: train.arrivalTime,
        fromStationId: train.originStationId,
        toStationId: train.destinationStationId,
        passengers,
        phone,
        createdAt: Date.now(),
      })
      queryClient.invalidateQueries(voucherCapacityQueryKey(departureDate))
      HapticFeedback.trigger("notificationSuccess")
      trackEvent("voucher_booked", { passengers })
      router.replace({ pathname: "/voucher/ticket", params: { code: confirmationCode } })
    } catch (orderError) {
      setError(voucherErrorText(orderError))
      trackVoucherFailure("order", orderError)
      orderingRef.current = false
      setIsOrdering(false)
    }
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
      <VoucherHero
        trainNumber={train.trainNumber}
        departureTime={train.departureTime}
        arrivalTime={train.arrivalTime}
        fromStationId={train.originStationId}
        toStationId={train.destinationStationId}
      />

      <Text style={styles.title}>{translate("voucher.passengers")}</Text>

      {limit.isLoading && <ActivityIndicator color={theme.colors.label} />}

      {!!limit.error && <Text style={styles.error}>{voucherErrorText(limit.error)}</Text>}

      {limit.data && max === 0 && <Text style={styles.hint}>{translate("voucher.noneLeftForPhone")}</Text>}

      {limit.data && max > 0 && (
        <View style={styles.picker}>
          <PassengerStepper value={passengers} max={max} onChange={setSelectedPassengers} />
          <Text style={styles.hint}>{translate("voucher.upTo", { count: max })}</Text>
          {remaining !== undefined && (
            <Text style={[styles.availability, isLow && styles.availabilityLow]}>
              {translate(isLow ? "voucher.almostSoldOut" : "voucher.seatsAvailable", { count: remaining })}
            </Text>
          )}
        </View>
      )}

      {error && <Text style={styles.error}>{error}</Text>}

      {limit.data && max > 0 && (
        <Button
          title={translate("voucher.orderVouchers") ?? ""}
          onPress={order}
          loading={isOrdering}
          disabled={isOrdering}
          containerStyle={styles.button}
        />
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create((theme) => ({
  content: {
    padding: theme.spacing[4],
    paddingBottom: theme.spacing[5],
    gap: theme.spacing[4],
  },
  title: {
    marginTop: theme.spacing[2],
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  picker: {
    alignItems: "center",
    gap: theme.spacing[3],
  },
  hint: {
    fontSize: 15,
    textAlign: "center",
    color: theme.colors.label,
  },
  availability: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.greenText,
  },
  availabilityLow: {
    color: theme.colors.error,
  },
  error: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
    color: theme.colors.error,
  },
  button: {
    marginTop: theme.spacing[2],
  },
}))
