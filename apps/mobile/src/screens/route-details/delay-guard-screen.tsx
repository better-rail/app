import { useState } from "react"
import { ScrollView, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useRouter } from "expo-router"
import { useShallow } from "zustand/react/shallow"
import HapticFeedback from "react-native-haptic-feedback"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { Button, Chip, Text } from "@/components"
import { translate } from "@/i18n"
import { stationName } from "@/data/stations"
import { delayGuardFor, useSettingsStore } from "@/models"
import { useNavigationParamsStore } from "@/models/navigation-params/navigation-params"
import { DEFAULT_GUARD_MINUTES, GUARD_MINUTES_OPTIONS, guardKey } from "@/services/api"
import { trackEvent } from "@/services/analytics"
import { usePushPermission } from "@/hooks"

/**
 * Delay Guard, as a sheet over a route: the train the rider boards, from how many minutes late
 * they want to hear, and the reminder that a delay can shrink again. Saving keeps the guard in the
 * settings store; the server watches the train from then on (apps/server/src/delay-guards).
 */
export function DelayGuardScreen() {
  const router = useRouter()
  const insets = useSafeAreaInsets()
  const draft = useNavigationParamsStore((s) => s.delayGuardDraft)
  const { guards, setDelayGuard, removeDelayGuard } = useSettingsStore(
    useShallow((s) => ({ guards: s.delayGuards, setDelayGuard: s.setDelayGuard, removeDelayGuard: s.removeDelayGuard })),
  )
  const existing = draft ? delayGuardFor(guards, draft.trainNumber, draft.originStationId) : undefined
  const [minutes, setMinutes] = useState(existing?.thresholdMinutes ?? draft?.thresholdMinutes ?? DEFAULT_GUARD_MINUTES)
  const { ensure } = usePushPermission()

  if (!draft) return null

  const origin = stationName(draft.originStationId)
  const destination = stationName(draft.destinationStationId)

  const save = async () => {
    if (!(await ensure("delay_guard", { title: "delayGuard.title", message: "delayGuard.permissionDenied" }))) return
    HapticFeedback.trigger("notificationSuccess")
    trackEvent(existing ? "delay_guard_updated" : "delay_guard_enabled", { trainNumber: draft.trainNumber, minutes })
    setDelayGuard({
      trainNumber: draft.trainNumber,
      originStationId: draft.originStationId,
      destinationStationId: draft.destinationStationId,
      departureTime: draft.departureTime,
      thresholdMinutes: minutes,
    })
    router.back()
  }

  const remove = () => {
    HapticFeedback.trigger("impactLight")
    trackEvent("delay_guard_disabled", { trainNumber: draft.trainNumber })
    removeDelayGuard(guardKey(draft))
    router.back()
  }

  return (
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]} testID="delay-guard-screen">
      <Text style={styles.emoji}>🛡️</Text>
      <Text style={styles.title} tx="delayGuard.title" />
      <Text style={styles.intro} tx="delayGuard.intro" />

      <View style={styles.trainCard}>
        <Text style={styles.trainTitle}>
          {translate("delayGuard.train", { trainNumber: draft.trainNumber, time: draft.departureTime })}
        </Text>
        <Text style={styles.trainRoute} preset="small">
          {translate("delayGuard.fromTo", { origin, destination })}
        </Text>
        {existing && <Text style={styles.onText} preset="small" tx="delayGuard.on" />}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle} tx="delayGuard.notifyFrom" />
        <View style={styles.chips}>
          {GUARD_MINUTES_OPTIONS.map((option) => (
            <View
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ selected: option === minutes }}
              testID={`delay-guard-minutes-${option}${option === minutes ? "-selected" : ""}`}
            >
              <Chip
                variant={option === minutes ? "primary" : "default"}
                onPress={() => {
                  HapticFeedback.trigger("selection")
                  setMinutes(option)
                }}
                style={styles.chip}
              >
                <Text style={[styles.chipText, option === minutes && styles.chipTextSelected]} maxFontSizeMultiplier={1.3}>
                  {translate("delayGuard.minutes", { minutes: option })}
                </Text>
              </Chip>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.reminder}>
        <Text style={styles.reminderText} preset="small" tx="delayGuard.reminder" />
      </View>

      <Button
        title={translate(existing ? "delayGuard.update" : "delayGuard.save") ?? ""}
        onPress={save}
        testID="delay-guard-save"
      />
      {existing && (
        <Button
          variant="secondary"
          title={translate("delayGuard.remove") ?? ""}
          onPress={remove}
          containerStyle={styles.removeButton}
          testID="delay-guard-remove"
        />
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create((theme) => ({
  content: {
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[5],
    gap: theme.spacing[3],
  },
  emoji: {
    fontSize: 48,
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  intro: {
    textAlign: "center",
    color: theme.colors.label,
  },
  trainCard: {
    backgroundColor: theme.colors.tertiaryBackground,
    borderRadius: 14,
    borderCurve: "continuous",
    padding: theme.spacing[4],
    gap: 4,
    marginTop: theme.spacing[2],
  },
  trainTitle: {
    fontSize: 17,
    fontWeight: "600",
  },
  trainRoute: {
    color: theme.colors.label,
  },
  onText: {
    color: theme.colors.success,
    fontWeight: "600",
    marginTop: 4,
  },
  section: {
    gap: theme.spacing[2],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  chips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing[2],
  },
  chip: {
    paddingVertical: 6,
  },
  chipText: {
    fontSize: 15,
    fontWeight: "500",
  },
  chipTextSelected: {
    color: theme.colors.whiteText,
  },
  reminder: {
    backgroundColor: theme.colors.secondaryBackground,
    borderRadius: 12,
    borderCurve: "continuous",
    padding: theme.spacing[3],
  },
  reminderText: {
    color: theme.colors.label,
  },
  removeButton: {
    marginTop: -theme.spacing[1],
  },
}))
