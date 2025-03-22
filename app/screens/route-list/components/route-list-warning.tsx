import React, { useEffect, useState } from "react"
import { Platform, View } from "react-native"
import Animated, { FadeInDown } from "react-native-reanimated"
import { BottomScreenSheet, Text } from "../../../components"
import { format } from "date-fns"
import { dateFnsLocalization, translate } from "../../../i18n"
import * as Burnt from "burnt"
import { useModal } from "react-native-modalfy"

const shouldDisplayModal = Platform.OS === "android"

export type WarningType = "different-hour" | "different-date"

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
  const { openModal } = useModal()
  const [displayWarningSheet, setDisplayWarningSheet] = useState(false)
  const formattedRoutesDate = format(routesDate, "eeee, dd/MM/yyyy", { locale: dateFnsLocalization })
  console.log("displayWarningSheet", displayWarningSheet)
  // biome-ignore lint/correctness/useExhaustiveDependencies: no need!
  useEffect(() => {
    if (shouldDisplayModal) {
      // so modal won't be opened immidiately; looks nicer
      setTimeout(
        () =>
          openModal("RouteListWarningModal", {
            warningType,
            formattedRoutesDate,
            onClose: () => {
              setTimeout(() => {
                setDisplayWarningSheet(true)
              }, 350)
            },
          }),
        250,
      )
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
      setTimeout(() => {
        setDisplayWarningSheet(true)
      }, duration * 1000 + 350)
    }
  }, [])

  return (
    <>
      {displayWarningSheet && (
        <Animated.View entering={FadeInDown}>
          <BottomScreenSheet style={{ backgroundColor: "orange" }}>
            <View>
              <Text
                preset="bold"
                tx={warningType === "different-hour" ? "modals.noTrainsFoundForHour" : "modals.noTrainsFoundForDate"}
              />
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
          </BottomScreenSheet>
        </Animated.View>
      )}
    </>
  )
}
