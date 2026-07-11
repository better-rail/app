import React from "react"
import { TextStyle, View, ViewStyle } from "react-native"
import { Text } from "@/components"
import { translate, TxKeyPath } from "@/i18n"
import { color, spacing } from "@/theme"
import type { Train } from "@/services/api"

const t = (key: TxKeyPath, options?: object): string => translate(key, options) ?? ""

const WARNING_WRAPPER: ViewStyle = {
  justifyContent: "center",
  alignItems: "center",
  marginBottom: spacing[4],
  backgroundColor: color.secondary,
  width: "100%",
}

const WARNING_TITLE: TextStyle = {
  fontSize: 18,
  fontWeight: "bold",
}

const WARNING_TEXT: TextStyle = {
  paddingHorizontal: spacing[5],
  marginBottom: spacing[3],
  textAlign: "center",
}

const Warning = ({ emoji, title, text }: { emoji: string; title: string; text: string }) => (
  <View style={WARNING_WRAPPER}>
    <Text style={{ fontSize: 48 }}>{emoji}</Text>
    <Text style={WARNING_TITLE}>{title}</Text>
    <Text style={WARNING_TEXT}>{text}</Text>
  </View>
)

/**
 * Realtime service-change banners for a single train leg: a full cancellation,
 * a skipped boarding/alighting station, or a changed last stop.
 */
export const RouteChangeWarnings = ({ train }: { train: Train }) => {
  if (train.isCancelled) {
    return <Warning emoji="🚫" title={t("routeDetails.trainCancelled")} text={t("routeDetails.trainCancelledText")} />
  }

  const changes: string[] = []
  if (train.originCancelled) changes.push(t("routeDetails.skippedStationText", { station: train.originStationName }))
  if (train.destinationCancelled) {
    changes.push(t("routeDetails.skippedStationText", { station: train.destinationStationName }))
  }
  if (train.isLastStopChanged) changes.push(t("routeDetails.lastStopChangedText", { station: train.lastStop }))

  if (changes.length === 0) return null
  return <Warning emoji="⚠️" title={t("routeDetails.routeChanged")} text={changes.join("\n")} />
}
