import { useEffect, useRef, useState } from "react"
import { Alert, Linking, Platform, Pressable, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { router, useLocalSearchParams } from "expo-router"
import * as Notifications from "expo-notifications"
import * as Crypto from "expo-crypto"
import { format } from "date-fns"
import * as Burnt from "burnt"
import { Button, Text } from "@/components"
import { translate } from "@/i18n"
import { getStationById } from "@/data/stations"
import { formatClockTime } from "@/utils/helpers/date-helpers"
import { trackEvent } from "@/services/analytics"
import {
  findRecurringRide,
  MAX_RECURRING_RIDES,
  useRecurringRidesStore,
  type RecurringRide,
} from "@/models/recurring-rides/recurring-rides"
import { MenuPicker } from "@/screens/settings/components/menu-picker"
import { settingsStyles } from "@/screens/settings/settings-styles"
import { VoucherHero } from "@/screens/voucher/components/voucher-hero"
import { headingFontStyle } from "@/theme/theme-fonts"

import { useDayAvailability } from "./day-availability"
import { leadTimeLabel, weekdayFullName, weekdayName, WEEKDAYS, WORKWEEK } from "./recurring-ride-format"

const LEAD_MINUTES = [15, 30, 45, 60]
const DEFAULT_LEAD_MINUTES = 15

/** Today at an "HH:mm" time, for showing a saved ride's departure */
const todayAt = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number)
  const date = new Date()
  date.setHours(hours, minutes, 0, 0)
  return date.getTime()
}

export function RecurringRideScreen() {
  // Opened from a route (its stations and departure) or from Settings (a saved ride's id)
  const params = useLocalSearchParams<{ rideId?: string; originId?: string; destinationId?: string; departureAt?: string }>()
  const rides = useRecurringRidesStore((state) => state.rides)
  const saved = params.rideId ? rides.find((ride) => ride.id === params.rideId) : undefined

  // Schedule times hold Israel's wall clock read in the device's zone, so the device's clock formats them.
  const departureAt = saved ? todayAt(saved.departureTime) : Number(params.departureAt)
  const departureTime = saved?.departureTime ?? format(departureAt, "HH:mm")
  const origin = getStationById(saved ? String(saved.originId) : (params.originId ?? ""))
  const destination = getStationById(saved ? String(saved.destinationId) : (params.destinationId ?? ""))
  const existing = saved ?? findRecurringRide(rides, Number(origin?.id), Number(destination?.id), departureTime)

  const [days, setDays] = useState<number[]>(() => {
    if (existing) return existing.days
    const weekday = new Date(departureAt).getDay()
    // A weekend ride is likely a one-day habit; a weekday one, the workweek.
    return WORKWEEK.includes(weekday) ? WORKWEEK : [weekday]
  })
  const [leadMinutes, setLeadMinutes] = useState(existing?.leadMinutes ?? DEFAULT_LEAD_MINUTES)

  // Weekdays without a train at this time can't be picked
  const availability = useDayAvailability(origin?.id, destination?.id, departureTime)
  const touchedDays = useRef(false)
  // A new ride starts without them, unless the rider already changed the days
  useEffect(() => {
    if (existing || touchedDays.current || availability.length === 0) return
    setDays((current) => {
      const available = current.filter((day) => availability[day] !== false)
      return available.length === current.length ? current : available
    })
  }, [availability, existing])

  if (!origin || !destination || !Number.isFinite(departureAt)) return null

  const toggleDay = (day: number) => {
    touchedDays.current = true
    if (availability[day] === false) {
      // A saved ride's day that lost its train can still be turned off
      setDays((current) => current.filter((d) => d !== day))
      Alert.alert(
        translate("recurringRides.dayUnavailableTitle", { day: weekdayFullName(day) }) ?? "",
        translate("recurringRides.dayUnavailableMessage", { time: formatClockTime(departureTime) }) ?? "",
      )
      return
    }
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()))
  }

  const save = async () => {
    if (!existing && rides.length >= MAX_RECURRING_RIDES) {
      Alert.alert(translate("recurringRides.limitReached", { count: MAX_RECURRING_RIDES }) ?? "")
      return
    }

    const ride: RecurringRide = {
      id: existing?.id ?? Crypto.randomUUID(),
      originId: Number(origin.id),
      destinationId: Number(destination.id),
      departureTime,
      days,
      leadMinutes,
      mode: "auto",
      // Saving changes doesn't resume a paused ride
      enabled: existing?.enabled ?? true,
      skipDates: existing?.skipDates ?? [],
    }

    const { granted } = await Notifications.requestPermissionsAsync()
    useRecurringRidesStore.getState().save(ride)
    trackEvent(existing ? "recurring_ride_updated" : "recurring_ride_created", { days: days.length, leadMinutes })

    if (!granted) {
      Alert.alert(translate("recurringRides.notificationsOff") ?? "", translate("recurringRides.notificationsOffMessage") ?? "", [
        { text: translate("common.close") ?? "", style: "cancel" },
        { text: translate("settings.title") ?? "", onPress: () => Linking.openSettings() },
      ])
    } else {
      Burnt.toast({ title: translate("recurringRides.saved") ?? "", preset: "done" })
    }
    router.back()
  }

  const remove = () => {
    if (!existing) return
    Alert.alert(translate("recurringRides.removeConfirm") ?? "", undefined, [
      { text: translate("common.cancel") ?? "", style: "cancel" },
      {
        text: translate("common.delete") ?? "",
        style: "destructive",
        onPress: () => {
          useRecurringRidesStore.getState().remove(existing.id)
          trackEvent("recurring_ride_removed")
          router.back()
        },
      },
    ])
  }

  return (
    <View testID="recurring-ride-screen" style={styles.wrapper}>
      <Text style={styles.title}>{translate("recurringRides.title")}</Text>
      {/* The rule follows the stations and departure time, not today's train, so no train number or arrival */}
      <VoucherHero
        style={styles.hero}
        height="auto"
        departureLabel={false}
        departureTime={departureAt}
        fromStationId={Number(origin.id)}
        toStationId={Number(destination.id)}
      />

      <Text style={styles.groupTitle}>{translate("recurringRides.days")}</Text>
      <View style={styles.days}>
        {WEEKDAYS.map((day) => {
          const selected = days.includes(day)
          const unavailable = availability[day] === false
          return (
            <Pressable
              key={day}
              testID={`recurring-ride-day-${day}${selected ? "-selected" : ""}`}
              accessibilityRole="checkbox"
              accessibilityLabel={weekdayFullName(day)}
              accessibilityState={{ checked: selected, disabled: unavailable }}
              hitSlop={4}
              onPress={() => toggleDay(day)}
              style={[styles.day, selected && styles.daySelected, unavailable && styles.dayUnavailable]}
            >
              <Text style={[styles.dayText, selected && styles.dayTextSelected, unavailable && styles.dayTextUnavailable]}>
                {weekdayName(day)}
              </Text>
            </Pressable>
          )
        })}
      </View>

      <View style={settingsStyles.group}>
        <MenuPicker
          testID="recurring-ride-lead"
          label={translate("recurringRides.remindMe") ?? ""}
          value={String(leadMinutes)}
          onChange={(value) => setLeadMinutes(Number(value))}
          options={LEAD_MINUTES.map((minutes) => ({ value: String(minutes), label: leadTimeLabel(minutes) }))}
        />
      </View>

      <View testID="recurring-ride-summary" style={styles.summary}>
        {days.length > 0 ? (
          <Text style={styles.summaryNote}>{translate("recurringRides.skipNote")}</Text>
        ) : (
          <Text style={styles.summaryTitle}>{translate("recurringRides.chooseDay")}</Text>
        )}
      </View>

      <Button
        testID="recurring-ride-save"
        title={translate(existing ? "recurringRides.update" : "recurringRides.save") ?? ""}
        disabled={days.length === 0}
        onPress={save}
      />

      {existing && (
        <Pressable testID="recurring-ride-remove" onPress={remove} style={styles.removeButton}>
          <Text style={styles.removeText}>{translate("recurringRides.remove")}</Text>
        </Pressable>
      )}
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
    ...headingFontStyle(theme, 24),
    marginBottom: theme.spacing[3],
    color: theme.colors.text,
  },
  hero: {
    marginBottom: theme.spacing[3],
  },
  groupTitle: {
    marginStart: theme.spacing[3],
    marginBottom: theme.spacing[2],
    color: theme.colors.label,
    fontSize: 16,
    fontWeight: "600",
  },
  days: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: theme.spacing[5],
  },
  day: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.secondaryBackground,
  },
  daySelected: {
    backgroundColor: theme.colors.primary,
  },
  dayText: {
    fontSize: 15,
    fontWeight: "500",
    color: theme.colors.text,
  },
  dayTextSelected: {
    color: "white",
  },
  // Still tappable, to explain why
  dayUnavailable: {
    opacity: 0.35,
  },
  dayTextUnavailable: {
    textDecorationLine: "line-through",
  },
  summary: {
    alignItems: "center",
    marginTop: -theme.spacing[2],
    marginBottom: theme.spacing[4],
    paddingHorizontal: theme.spacing[2],
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  summaryNote: {
    fontSize: 13,
    textAlign: "center",
    opacity: 0.6,
  },
  removeButton: {
    alignItems: "center",
    paddingVertical: theme.spacing[3],
    marginTop: theme.spacing[2],
  },
  removeText: {
    color: theme.colors.destroy,
    fontSize: 16,
  },
}))
