import { useState } from "react"
import { Alert, ImageBackground, Platform, Pressable, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { router, useLocalSearchParams } from "expo-router"
import * as Notifications from "expo-notifications"
import * as Crypto from "expo-crypto"
import { format } from "date-fns"
import * as Burnt from "burnt"
import LinearGradient from "react-native-linear-gradient"
import { Button, Text } from "@/components"
import { isRTL, translate } from "@/i18n"
import { getStationById } from "@/data/stations"
import { trackEvent } from "@/services/analytics"
import {
  findRecurringRide,
  MAX_RECURRING_RIDES,
  useRecurringRidesStore,
  type RecurringRide,
} from "@/models/recurring-rides/recurring-rides"
import { MenuPicker } from "@/screens/settings/components/menu-picker"
import { settingsStyles } from "@/screens/settings/settings-styles"
import { formatTime } from "@/utils/helpers/date-helpers"
import { headingFontStyle, subheadingFontStyle } from "@/theme/theme-fonts"

import { leadTimeLabel, weekdayName, WEEKDAYS, WORKWEEK } from "./recurring-ride-format"

const LEAD_MINUTES = [15, 30, 45, 60]
const DEFAULT_LEAD_MINUTES = 15

export function RecurringRideScreen() {
  const params = useLocalSearchParams<{ originId: string; destinationId: string; departureAt: string; arrivalAt?: string }>()
  const departureAt = Number(params.departureAt)
  const arrivalAt = Number(params.arrivalAt)
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
  const [leadMinutes, setLeadMinutes] = useState(existing?.leadMinutes ?? DEFAULT_LEAD_MINUTES)

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
      <ImageBackground source={origin.image} style={styles.hero} imageStyle={styles.heroImage}>
        <LinearGradient style={styles.heroShade} colors={["rgba(0, 0, 0, 0.1)", "rgba(0, 0, 0, 0.85)"]} />
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{translate("recurringRides.title")}</Text>
        </View>

        <View>
          <Text style={styles.heroTime}>
            {formatTime(departureAt)}
            {Number.isFinite(arrivalAt) && <Text style={styles.heroArrival}>{`  –  ${formatTime(arrivalAt)}`}</Text>}
          </Text>
          <Text style={styles.heroRoute} numberOfLines={2}>
            {`${origin.name}  ${isRTL ? "←" : "→"}  ${destination.name}`}
          </Text>
        </View>
      </ImageBackground>

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

      <View style={settingsStyles.group}>
        <MenuPicker
          testID="recurring-ride-lead"
          label={translate("recurringRides.remindMe") ?? ""}
          value={String(leadMinutes)}
          onChange={(value) => setLeadMinutes(Number(value))}
          options={LEAD_MINUTES.map((minutes) => ({ value: String(minutes), label: leadTimeLabel(minutes) }))}
        />
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
  hero: {
    height: 176,
    padding: theme.spacing[4],
    marginBottom: theme.spacing[3],
    justifyContent: "space-between",
    borderRadius: 22,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  heroImage: {
    borderRadius: 22,
  },
  heroShade: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: theme.spacing[3],
    paddingVertical: theme.spacing[1],
    borderRadius: 999,
    backgroundColor: theme.colors.primary,
  },
  badgeText: {
    ...subheadingFontStyle(theme, 13),
    color: "white",
    letterSpacing: 0.3,
  },
  heroTime: {
    ...headingFontStyle(theme, 34),
    color: "white",
  },
  heroArrival: {
    ...headingFontStyle(theme, 20, "500"),
    color: "rgba(255, 255, 255, 0.75)",
  },
  heroRoute: {
    ...subheadingFontStyle(theme, 15, "600"),
    marginTop: theme.spacing[1],
    color: "white",
  },
  description: {
    marginBottom: theme.spacing[4],
    paddingHorizontal: theme.spacing[1],
    fontSize: 14,
    opacity: 0.75,
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
