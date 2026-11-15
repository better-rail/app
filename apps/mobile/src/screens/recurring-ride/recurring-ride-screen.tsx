import { useEffect, useRef, useState } from "react"
import { Alert, Linking, Platform, Pressable, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { router, useLocalSearchParams } from "expo-router"
import * as Notifications from "expo-notifications"
import * as Crypto from "expo-crypto"
import { addDays, format } from "date-fns"
import SegmentedControl from "@expo/ui/community/segmented-control"
import HapticFeedback from "react-native-haptic-feedback"
import * as Burnt from "burnt"
import { Button, Text } from "@/components"
import { translate } from "@/i18n"
import { getStationById } from "@/data/stations"
import { formatClockTime, israelNow } from "@/utils/helpers/date-helpers"
import { trackEvent } from "@/services/analytics"
import {
  findRecurringRide,
  isPastOneTimeRide,
  MAX_RECURRING_RIDES,
  rideToSaveOver,
  useRecurringRidesStore,
  type RecurringRide,
} from "@/models/recurring-rides/recurring-rides"
import { MenuPicker } from "@/screens/settings/components/menu-picker"
import { settingsStyles } from "@/screens/settings/settings-styles"
import { VoucherHero } from "@/screens/voucher/components/voucher-hero"
import { headingFontStyle } from "@/theme/theme-fonts"

import { useDateHasTrain, useDayAvailability } from "./day-availability"
import { RideDatePicker } from "./ride-date-picker"
import { calendarDate, dateKey, leadTimeLabel, weekdayFullName, weekdayName, WEEKDAYS, WORKWEEK } from "./recurring-ride-format"

const LEAD_MINUTES = [15, 30, 45, 60]
const DEFAULT_LEAD_MINUTES = 15
// How far ahead a one-time ride can be set: the timetable isn't published much further
const MAX_ONCE_DAYS_AHEAD = 30

/** The departure at an "HH:mm" time on a "YYYY-MM-DD" date, or today */
const departureOn = (time: string, date?: string) => {
  const [hours, minutes] = time.split(":").map(Number)
  const departure = date ? calendarDate(date) : new Date()
  departure.setHours(hours, minutes, 0, 0)
  return departure.getTime()
}

/** The start times still ahead of a departure */
const leadsAhead = (departureAt: number, now: number) => LEAD_MINUTES.filter((minutes) => departureAt - minutes * 60_000 > now)

/** The wanted start time if it's an option, else the earliest one listed; undefined when none is */
const pickLead = (options: number[], wanted: number) => (options.includes(wanted) ? wanted : options.at(-1))

export function RecurringRideScreen() {
  // Opened from a route (its stations and departure) or from Settings (a saved ride's id)
  const params = useLocalSearchParams<{
    rideId?: string
    originId?: string
    destinationId?: string
    viaStationId?: string
    departureAt?: string
  }>()
  const rides = useRecurringRidesStore((state) => state.rides)
  const saved = params.rideId ? rides.find((ride) => ride.id === params.rideId) : undefined

  // Schedule times hold Israel's wall clock read in the device's zone, so the device's clock formats them.
  const departureAt = saved ? departureOn(saved.departureTime, saved.date) : Number(params.departureAt)
  // Deleting the ride re-renders with neither a saved ride nor a departure before the sheet closes
  const departureTime = saved?.departureTime ?? (Number.isFinite(departureAt) ? format(departureAt, "HH:mm") : "")
  const origin = getStationById(saved ? String(saved.originId) : (params.originId ?? ""))
  const destination = getStationById(saved ? String(saved.destinationId) : (params.destinationId ?? ""))
  // A route searched through a via station keeps it: without it the server could start a different itinerary
  const viaStationId = saved ? saved.viaStationId : params.viaStationId ? Number(params.viaStationId) : undefined
  const trip = { originId: Number(origin?.id), destinationId: Number(destination?.id), viaStationId, departureTime }
  // The date of the train the sheet was opened from
  const openedDate = saved ? saved.date : Number.isFinite(departureAt) ? dateKey(departureAt) : undefined
  // What the sheet starts from: the saved ride, or the one the route menu shows for this train
  const initial = saved ?? findRecurringRide(rides, trip, openedDate)

  // A one-time ride runs on a date the rider picks: from today, while today's train is still far enough ahead
  const now = israelNow()
  const today = dateKey(now)
  const firstOnceDate = leadsAhead(departureOn(departureTime, today), now).length > 0 ? today : dateKey(addDays(now, 1))
  const lastOnceDate = dateKey(addDays(now, MAX_ONCE_DAYS_AHEAD))
  const [once, setOnce] = useState(Boolean(initial?.date))
  const [onceDate, setOnceDate] = useState(() =>
    openedDate && (initial?.date || openedDate >= firstOnceDate) ? openedDate : firstOnceDate,
  )
  const onceDepartureAt = departureOn(departureTime, onceDate)
  const onceHasTrain = useDateHasTrain(origin?.id, destination?.id, onceDepartureAt, viaStationId, once)
  // The ride a save replaces follows what's picked, so a trip never gets two rides of a kind on one date.
  // A saved ride keeps its kind.
  const editing = saved ?? rideToSaveOver(rides, trip, once ? onceDate : undefined)

  const [days, setDays] = useState<number[]>(() => {
    if (initial?.days.length) return initial.days
    const weekday = new Date(departureAt).getDay()
    // A weekend ride is likely a one-day habit; a weekday one, the workweek.
    return WORKWEEK.includes(weekday) ? WORKWEEK : [weekday]
  })
  const [leadMinutes, setLeadMinutes] = useState(initial?.leadMinutes ?? DEFAULT_LEAD_MINUTES)
  // Once, only start times still ahead of the train; a passed one falls back to the earliest still ahead
  const leadOptions = once ? leadsAhead(onceDepartureAt, now) : LEAD_MINUTES
  const lead = pickLead(leadOptions, leadMinutes)

  // Weekdays without a train at this time can't be picked
  const availability = useDayAvailability(origin?.id, destination?.id, departureTime, viaStationId)
  const touchedDays = useRef(false)
  // A new ride starts without them, unless the rider already changed the days
  useEffect(() => {
    if (initial?.days.length || touchedDays.current || availability.length === 0) return
    setDays((current) => {
      const available = current.filter((day) => availability[day] !== false)
      return available.length === current.length ? current : available
    })
  }, [availability, initial])

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
    // A one-time ride whose train left no longer takes a place
    const active = useRecurringRidesStore.getState().rides.filter((ride) => !isPastOneTimeRide(ride))
    if (!editing && active.length >= MAX_RECURRING_RIDES) {
      Alert.alert(translate("recurringRides.limitReached", { count: MAX_RECURRING_RIDES }) ?? "")
      return
    }

    const { granted } = await Notifications.requestPermissionsAsync()

    // The sheet may have stayed open past the start time it shows, so check it against the clock now
    const startLeadMinutes = once ? pickLead(leadsAhead(onceDepartureAt, israelNow()), leadMinutes) : leadMinutes
    if (startLeadMinutes === undefined) {
      Alert.alert(translate("recurringRides.tooLate") ?? "")
      return
    }

    const ride: RecurringRide = {
      id: editing?.id ?? Crypto.randomUUID(),
      originId: Number(origin.id),
      destinationId: Number(destination.id),
      ...(viaStationId && { viaStationId }),
      departureTime,
      ...(once ? { days: [], date: onceDate } : { days }),
      leadMinutes: startLeadMinutes,
      mode: "auto",
      // Saving changes doesn't resume a paused ride
      enabled: editing?.enabled ?? true,
      skipDates: once ? [] : (editing?.skipDates ?? []),
    }

    useRecurringRidesStore.getState().save(ride)
    trackEvent(editing ? "recurring_ride_updated" : "recurring_ride_created", {
      days: once ? 0 : days.length,
      leadMinutes: startLeadMinutes,
      once,
    })

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
    if (!editing) return
    Alert.alert(translate("recurringRides.removeConfirm") ?? "", undefined, [
      { text: translate("common.cancel") ?? "", style: "cancel" },
      {
        text: translate("common.delete") ?? "",
        style: "destructive",
        onPress: () => {
          useRecurringRidesStore.getState().remove(editing.id)
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

      {!saved && (
        <SegmentedControl
          testID="recurring-ride-frequency"
          values={[translate("recurringRides.weekly") ?? "", translate("recurringRides.once") ?? ""]}
          selectedIndex={once ? 1 : 0}
          onChange={(event) => {
            HapticFeedback.trigger("impactLight")
            setOnce(event.nativeEvent.selectedSegmentIndex === 1)
          }}
          style={styles.frequency}
        />
      )}

      {once ? (
        <View style={settingsStyles.group}>
          <RideDatePicker
            testID="recurring-ride-date"
            label={translate("recurringRides.date") ?? ""}
            value={onceDate}
            minimumDate={onceDate < firstOnceDate ? onceDate : firstOnceDate}
            maximumDate={onceDate > lastOnceDate ? onceDate : lastOnceDate}
            onChange={setOnceDate}
          />
        </View>
      ) : (
        <>
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
        </>
      )}

      <View style={settingsStyles.group}>
        <MenuPicker
          testID="recurring-ride-lead"
          label={translate("recurringRides.remindMe") ?? ""}
          value={String(lead ?? leadMinutes)}
          onChange={(value) => setLeadMinutes(Number(value))}
          options={(lead === undefined ? [leadMinutes] : leadOptions).map((minutes) => ({
            value: String(minutes),
            label: leadTimeLabel(minutes),
          }))}
        />
      </View>

      <View testID="recurring-ride-summary" style={styles.summary}>
        {once && onceHasTrain === false ? (
          <Text style={styles.summaryTitle}>
            {translate("recurringRides.noTrainOnDate", { time: formatClockTime(departureTime) })}
          </Text>
        ) : once ? (
          <Text style={styles.summaryNote}>{translate("recurringRides.onceNote")}</Text>
        ) : days.length > 0 ? (
          <Text style={styles.summaryNote}>{translate("recurringRides.skipNote")}</Text>
        ) : (
          <Text style={styles.summaryTitle}>{translate("recurringRides.chooseDay")}</Text>
        )}
      </View>

      <Button
        testID="recurring-ride-save"
        title={translate(editing ? "recurringRides.update" : "recurringRides.save") ?? ""}
        disabled={once ? onceHasTrain === false || lead === undefined : days.length === 0}
        onPress={save}
      />

      {editing && (
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
  frequency: {
    marginBottom: theme.spacing[4],
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
