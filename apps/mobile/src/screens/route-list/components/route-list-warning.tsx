import React, { useEffect, useState } from "react"
import { Platform, View } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import Animated, { FadeInDown } from "react-native-reanimated"
import { Stack } from "expo-router"
import { isLiquidGlassSupported, LiquidGlassView } from "@callstack/liquid-glass"
import { BottomScreenSheet, Text } from "@/components"
import { format } from "date-fns"
import { dateFnsLocalization, translate } from "@/i18n"
import * as Burnt from "burnt"
import { RouteListWarningModal, type WarningType } from "./route-list-warning-modal"

const shouldDisplayModal = Platform.OS === "android"
// iOS 26+ shows the warning in the native bottom toolbar instead of our custom sheet
const useNativeToolbar = Platform.OS === "ios" && isLiquidGlassSupported

export type { WarningType }

export interface RouteListModalProps {
  routesDate: number
  warningType: WarningType
}

/**
 * A modal that warns that no trains were found for the provided date, so we show
 * trains for the next day which has trains.
 *
 * For iOS we'll display a native alert, for Android we'll show modal
 */
export const RouteListWarning = function RouteListWarning({ routesDate, warningType }: RouteListModalProps) {
  const [warningVisible, setWarningVisible] = useState(false)
  const [displayWarningSheet, setDisplayWarningSheet] = useState(false)
  const formattedRoutesDate = format(routesDate, "eeee, dd/MM/yyyy", {
    locale: dateFnsLocalization,
  })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (shouldDisplayModal) {
      setTimeout(() => setWarningVisible(true), 250)
    }
  }, [])

  useEffect(() => {
    if (!shouldDisplayModal) {
      const duration = 3.5 // seconds
      Burnt.alert({
        title:
          warningType === "different-hour" ? translate("modals.noTrainsFoundForHour") : translate("modals.noTrainsFoundForDate"),
        message:
          warningType === "different-hour"
            ? translate("modals.foundTrainsAtHour")
            : `${translate("modals.foundTrainsAtDate")}${formattedRoutesDate}`,
        duration,
        preset: "custom",
        icon: {
          ios: {
            name: "exclamationmark.triangle.fill",
            color: "#FF9F0AFF",
          },
        },
      })

      // display sheet after the alert has disappeared
      setTimeout(
        () => {
          setDisplayWarningSheet(true)
        },
        duration * 1000 + 350,
      )
    }
  }, [])

  const handleClose = () => {
    setWarningVisible(false)
    setTimeout(() => setDisplayWarningSheet(true), 350)
  }

  const warningContent = (
    <View>
      <Text preset="bold" tx={warningType === "different-hour" ? "modals.noTrainsFoundForHour" : "modals.noTrainsFoundForDate"} />
      <Text style={{ fontSize: 14 }}>
        {warningType === "different-hour" ? (
          translate("modals.foundTrainsAtHour")
        ) : (
          <>
            {translate("modals.foundTrainsAtDate")}
            {formattedRoutesDate}
          </>
        )}
      </Text>
    </View>
  )

  return (
    <>
      {shouldDisplayModal && (
        <RouteListWarningModal
          visible={warningVisible}
          warningType={warningType}
          formattedRoutesDate={formattedRoutesDate}
          onClose={handleClose}
        />
      )}
      {displayWarningSheet && useNativeToolbar && (
        <Stack.Toolbar>
          <Stack.Toolbar.View hidesSharedBackground>
            <LiquidGlassView style={styles.toolbarContent} tintColor="rgba(255, 159, 10, 0.55)">
              {warningContent}
            </LiquidGlassView>
          </Stack.Toolbar.View>
        </Stack.Toolbar>
      )}
      {displayWarningSheet && !useNativeToolbar && (
        <Animated.View entering={FadeInDown}>
          <BottomScreenSheet style={{ backgroundColor: "orange" }}>{warningContent}</BottomScreenSheet>
        </Animated.View>
      )}
    </>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  // The toolbar host has no intrinsic size, so the custom view needs an explicit width
  toolbarContent: {
    width: rt.screen.width - 32,
    height: 64,
    justifyContent: "center",
    paddingHorizontal: 18,
    borderRadius: 24,
  },
}))
