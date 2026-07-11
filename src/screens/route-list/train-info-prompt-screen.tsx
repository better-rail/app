import React, { useEffect } from "react"
import { Platform, Pressable, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { useRouter } from "expo-router"
import { useShallow } from "zustand/react/shallow"
import { Button, RouteCardPreview, Text } from "@/components"
import { useSettingsStore } from "@/models"
import { translate } from "@/i18n"
import { setAnalyticsUserProperty, trackEvent } from "@/services/analytics"

interface PromptOptionProps {
  label: string
  showHeader: boolean
  selected: boolean
  onPress: () => void
}

function PromptOption({ label, showHeader, selected, onPress }: PromptOptionProps) {
  return (
    <Pressable onPress={onPress} style={[styles.option, selected && styles.optionSelected]}>
      <View style={styles.optionHeader}>
        <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>{label}</Text>
      </View>

      {/* Display-only preview — swallow touches so the whole option stays tappable. */}
      <View pointerEvents="none">
        <RouteCardPreview showHeaderOverride={showHeader} />
      </View>
    </Pressable>
  )
}

export function TrainInfoPromptScreen() {
  const router = useRouter()
  const { showRouteCardHeader, setShowRouteCardHeader } = useSettingsStore(
    useShallow((s) => ({ showRouteCardHeader: s.showRouteCardHeader, setShowRouteCardHeader: s.setShowRouteCardHeader })),
  )

  // Measure which decision users make. Fire "shown" on open, and "completed" on dismiss
  // (Done tap or swipe) with the final choice read fresh from the store — this captures
  // users who accept the pre-selected default without tapping a card.
  useEffect(() => {
    trackEvent("train_info_prompt_shown")
    return () => {
      trackEvent("train_info_prompt_completed", { show_train_info: useSettingsStore.getState().showRouteCardHeader })
    }
  }, [])

  const select = (value: boolean) => {
    if (value) {
      trackEvent("route_card_header_enabled", { source: "prompt" })
      setAnalyticsUserProperty("route_card_header_enabled", "true")
    } else {
      trackEvent("route_card_header_disabled", { source: "prompt" })
      setAnalyticsUserProperty("route_card_header_enabled", "false")
    }
    setShowRouteCardHeader(value)
  }

  return (
    <View style={styles.wrapper}>
      <Text style={styles.title}>{translate("routes.trainInfoPromptTitle")}</Text>
      <Text style={styles.description}>{translate("routes.trainInfoPromptDescription")}</Text>

      <PromptOption
        label={translate("routes.trainInfoPromptDefault")}
        showHeader={false}
        selected={!showRouteCardHeader}
        onPress={() => select(false)}
      />

      <PromptOption
        label={translate("routes.trainInfoPromptShow")}
        showHeader={true}
        selected={showRouteCardHeader}
        onPress={() => select(true)}
      />

      <Button title={translate("common.done")} onPress={() => router.back()} containerStyle={styles.doneButton} />

      <Text style={styles.footnote}>{translate("routes.trainInfoPromptFootnote")}</Text>
    </View>
  )
}

const styles = StyleSheet.create((theme) => ({
  wrapper: {
    paddingTop: theme.spacing[5],
    paddingHorizontal: theme.spacing[4],
    paddingBottom: Platform.OS === "ios" ? 0 : theme.spacing[5],
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: theme.colors.text,
    marginBottom: theme.spacing[2],
  },
  description: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: theme.spacing[4],
  },
  option: {
    borderWidth: 2,
    borderColor: theme.colors.separator,
    borderRadius: 14,
    borderCurve: "continuous",
    padding: theme.spacing[3],
    marginBottom: theme.spacing[3],
  },
  optionSelected: {
    borderColor: theme.colors.primary,
  },
  optionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: theme.spacing[2],
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  optionLabelSelected: {
    color: theme.colors.primary,
    fontWeight: "700",
  },
  doneButton: {
    marginTop: theme.spacing[2],
  },
  footnote: {
    marginTop: theme.spacing[3],
    fontSize: 15,
    textAlign: "center",
    color: theme.colors.label,
  },
}))
