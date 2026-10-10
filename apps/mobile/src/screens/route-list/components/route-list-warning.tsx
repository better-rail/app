import React, { useEffect, useRef, useState } from "react"
import { Platform, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Stack, useIsFocused } from "expo-router"
import { GlassView } from "expo-glass-effect"
import { isLiquidGlassSupported } from "@/utils/liquid-glass"
import { Text } from "@/components"
import { format } from "date-fns"
import { dateFnsLocalization, translate } from "@/i18n"
import * as Burnt from "burnt"
import { RouteListWarningModal, type WarningType } from "./route-list-warning-modal"

export type { WarningType }

export interface RouteListModalProps {
  requestedTime: number
  routesDate: number
  warningType: WarningType
}

export function RouteListWarning({ requestedTime, routesDate, warningType }: RouteListModalProps) {
  const useNativeToolbar = Platform.OS === "ios" && isLiquidGlassSupported
  const isFocused = useIsFocused()
  const hasPresentedPopup = useRef(false)
  const [warningVisible, setWarningVisible] = useState(false)
  const formattedRequestedDate = format(requestedTime, "eeee, dd/MM/yyyy", { locale: dateFnsLocalization })
  const formattedRoutesDate = format(routesDate, "eeee, dd/MM/yyyy", { locale: dateFnsLocalization })
  const title =
    (warningType === "different-hour"
      ? translate("modals.noTrainsFoundForHour")
      : translate("modals.noTrainsFoundForRequestedDate", { date: formattedRequestedDate })) ?? ""
  const message =
    (warningType === "different-hour"
      ? translate("modals.foundTrainsAtHour")
      : translate("modals.showingTrainsForDate", { date: formattedRoutesDate })) ?? ""

  useEffect(() => {
    if (!isFocused || hasPresentedPopup.current) return
    // Let the push transition settle; the persistent banner is already visible.
    const timeout = setTimeout(() => {
      hasPresentedPopup.current = true
      if (Platform.OS === "android") {
        setWarningVisible(true)
      } else {
        Burnt.alert({
          title,
          message,
          duration: 3.5,
          preset: "custom",
          icon: { ios: { name: "exclamationmark.triangle.fill", color: "#FF9F0AFF" } },
        })
      }
    }, 600)
    return () => clearTimeout(timeout)
  }, [isFocused, title, message])

  const warningContent = (
    <>
      <Text preset="bold" text={title} style={useNativeToolbar ? styles.glassText : styles.warningText} />
      <Text text={message} style={useNativeToolbar ? styles.glassText : styles.warningText} />
    </>
  )

  return (
    <>
      {Platform.OS === "android" && (
        <RouteListWarningModal
          visible={warningVisible && isFocused}
          title={title}
          message={message}
          onClose={() => setWarningVisible(false)}
        />
      )}
      {useNativeToolbar ? (
        <Stack.Toolbar>
          <Stack.Toolbar.View hidesSharedBackground>
            <GlassView style={styles.toolbarContent} tintColor="rgba(255, 159, 10, 0.55)">
              <View testID="route-list-warning" accessible accessibilityRole="alert" accessibilityLabel={`${title}. ${message}`}>
                {warningContent}
              </View>
            </GlassView>
          </Stack.Toolbar.View>
        </Stack.Toolbar>
      ) : (
        <View testID="route-list-warning" accessibilityRole="alert" style={styles.banner}>
          {warningContent}
        </View>
      )}
    </>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  toolbarContent: {
    // The native toolbar host needs an explicit width for its custom content.
    width: rt.screen.width - 32,
    minHeight: 64,
    justifyContent: "center",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
  },
  glassText: {
    color: theme.colors.text,
    fontSize: 14,
  },
  banner: {
    backgroundColor: "#FFF0C2",
    borderTopColor: "#D4A029",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: theme.spacing[4],
    paddingTop: theme.spacing[3],
    paddingBottom: Math.max(rt.insets.bottom, theme.spacing[3]),
  },
  warningText: {
    color: "#4D3400",
    fontSize: 14,
  },
}))
