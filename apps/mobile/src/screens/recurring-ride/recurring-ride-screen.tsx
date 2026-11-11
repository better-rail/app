import { useState } from "react"
import { Alert, Platform, Pressable, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { router, useLocalSearchParams } from "expo-router"
import * as Notifications from "expo-notifications"
import * as Crypto from "expo-crypto"
import { format } from "date-fns"
import * as Burnt from "burnt"
import { Button, Text } from "@/components"
import { translate } from "@/i18n"
import { getStationById } from "@/data/stations"
import { trackEvent } from "@/services/analytics"
import {
  findRecurringRide,
  MAX_RECURRING_RIDES,
  useRecurringRidesStore,
  type RecurringRide,
} from "@/models/recurring-rides/recurring-rides"
import { SettingBox } from "@/screens/settings/components/settings-box"
import { settingsStyles } from "@/screens/settings/settings-styles"

import { describeRoute, weekdayName, WEEKDAYS, WORKWEEK } from "./recurring-ride-format"

const LEAD_MINUTES = [5, 10, 15, 30]

export function RecurringRideScreen() {
  const params = useLocalSearchParams<{ originId: string; destinationId: string; departureAt: string }>()
  const departureAt = Number(params.departureAt)
  const origin = getStationById(params.originId)
  const destination = getStationById(params.destinationId)
  // Schedule times hold Israel's wall clock read in the device's zone, so the device's clock formats them.
  const departureTime = format(departureAt, "HH:mm")

  const rides = useRecurringRidesStore((state) => state.rides)
  const existing = findRecurringRide(rides, Number(params.originId), Number(params.destinationId), departureTime)

  const [days, setDays] = useState<number[]>(() => {
    if (existing) return existing.days
    const weekday = new Date(departureAt).getDay()
    // A weekend ride is likely a one-day habit; a weekday one, the workweek.
    return WORKWEEK.includes(weekday) ? WORKWEEK : [weekday]
  })
  const [leadMinutes, setLeadMinutes] = useState(existing?.leadMinutes ?? 10)

  if (!origin || !destination || !Number.isFinite(departureAt)) return null

  const toggleDay = (day: number) =>
    setDays((current) => (current.includes(day) ? current.filter((d) => d !== day) : [...current, day].sort()))

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
      enabled: true,
      skipDates: existing?.skipDates ?? [],
    }

    const { granted } = await Notifications.requestPermissionsAsync()
    useRecurringRidesStore.getState().save(ride)
    trackEvent(existing ? "recurring_ride_updated" : "recurring_ride_created", { days: days.length, leadMinutes })

    if (!granted) {
      Alert.alert(translate("recurringRides.notificationsOff") ?? "", translate("recurringRides.notificationsOffMessage") ?? "")
    } else {
      Burnt.toast({ title: translate("recurringRides.saved") ?? "", preset: "done" })
    }
    router.back()
  }

  const remove = () => {
    if (!existing) return
    useRecurringRidesStore.getState().remove(existing.id)
    trackEvent("recurring_ride_removed", { source: "sheet" })
    router.back()
  }

  return (
    <View testID="recurring-ride-screen" style={styles.wrapper}>
      <Text style={styles.title}>{translate("recurringRides.title")}</Text>
      <Text style={styles.subtitle}>
        {describeRoute({ originId: Number(origin.id), destinationId: Number(destination.id), departureTime })}
      </Text>

      <Text style={styles.description}>{translate("recurringRides.description")}</Text>

      <Text style={styles.groupTitle}>{translate("recurringRides.days")}</Text>
      <View style={styles.days}>
        {WEEKDAYS.map((day) => {
          const selected = days.includes(day)
          return (
            <Pressable
              key={day}
              testID={`recurring-ride-day-${day}${selected ? "-selected" : ""}`}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              onPress={() => toggleDay(day)}
              style={[styles.day, selected && styles.daySelected]}
            >
              <Text style={[styles.dayText, selected && styles.dayTextSelected]}>{weekdayName(day)}</Text>
            </Pressable>
          )
        })}
      </View>

      <Text style={styles.groupTitle}>{translate("recurringRides.remindMe")}</Text>
      <View style={settingsStyles.group}>
        {LEAD_MINUTES.map((minutes, index) => (
          <SettingBox
            key={minutes}
            testID={`recurring-ride-lead-${minutes}`}
            first={index === 0}
            last={index === LEAD_MINUTES.length - 1}
            title={translate("recurringRides.minutesBefore", { minutes }) ?? ""}
            checkmark={leadMinutes === minutes}
            onPress={() => setLeadMinutes(minutes)}
          />
        ))}
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
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
  },
  subtitle: {
    marginTop: theme.spacing[1],
    marginBottom: theme.spacing[3],
    fontSize: 15,
    opacity: 0.8,
  },
  description: {
    marginBottom: theme.spacing[4],
    fontSize: 14,
    opacity: 0.7,
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
