import React, { useEffect, useState } from "react"
import { ViewStyle, TextStyle, Platform, View } from "react-native"
import Modal from "react-native-modal"
import { BottomScreenSheet, Button, Text } from "../../../components"
import { format } from "date-fns"
import { dateFnsLocalization, translate } from "../../../i18n"
import { color, spacing } from "../../../theme"
import * as Burnt from "burnt"
import Animated, { FadeInDown } from "react-native-reanimated"

const shouldDisplayModal = Platform.OS === "android"

const MODAL_WRAPPER: ViewStyle = {
  position: "absolute",
  top: "25%",
  maxHeight: 400,
  padding: spacing[5],
  alignSelf: "center",
  justifyContent: "center",
  alignItems: "center",
  backgroundColor: color.secondaryBackground,
  borderRadius: Platform.select({ ios: 8, android: 4 }),
  shadowOffset: { width: 0, height: 1 },
  shadowColor: color.palette.black,
  shadowRadius: 2,
  shadowOpacity: 0.45,
}

const MODAL_ICON: TextStyle = {
  fontSize: 72.5,
}

const MODAL_TITLE: TextStyle = {
  marginBottom: spacing[2],
  textAlign: "center",
  fontSize: 22,
  fontWeight: "700",
}

const MODAL_TEXT: TextStyle = {
  marginBottom: spacing[4],
  textAlign: "center",
  fontSize: 18,
}

const MODAL_BUTTON: ViewStyle = {
  minWidth: "80%",
}

export interface RouteListModalProps {
  routesDate: number
}

/**
 * A modal that warns that no trains were found for the provided date, so we show
 * trains for the next day which has trains.
 *
 * For iOS we'll display a native alert, for Android we'll show modal
 */
export const RouteListModal = function RouteListModal({ routesDate, ...rest }: RouteListModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [displayWarningSheet, setDisplayWarningSheet] = useState(false)
  const formattedRoutesDate = format(routesDate, "eeee, dd/MM/yyyy", { locale: dateFnsLocalization })

  useEffect(() => {
    const duration = 3.5 // seconds
    Burnt.alert({
      title: translate("modals.noTrainsFound"),
      message: `${translate("modals.foundTrainsAt")} ${formattedRoutesDate}`,
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
  }, [])

  useEffect(() => {
    if (shouldDisplayModal) {
      // so modal won't be opened immidiately; looks nicer
      setTimeout(() => setIsModalOpen(true), 250)
    }
  }, [])

  const androidModal = shouldDisplayModal && (
    <Modal style={MODAL_WRAPPER} isVisible={isModalOpen} animationIn="zoomIn" animationOut="zoomOut">
      <Text style={MODAL_ICON}>⚠️</Text>
      <Text style={MODAL_TITLE} tx="modals.noTrainsFound" />
      <Text style={MODAL_TEXT}>
        {translate("modals.foundTrainsAt")}
        {formattedRoutesDate}
      </Text>
      <Button
        title={translate("common.ok")}
        style={MODAL_BUTTON}
        onPress={() => {
          setIsModalOpen(false)
          setDisplayWarningSheet(true)
        }}
      />
    </Modal>
  )

  return (
    <>
      {androidModal}
      {displayWarningSheet && (
        <Animated.View entering={FadeInDown}>
          <BottomScreenSheet style={{ backgroundColor: "orange" }}>
            <View>
              <Text tx="modals.noTrainsFound" preset="bold" />
              <Text style={{ fontSize: 14 }}>
                {translate("modals.foundTrainsAt")}
                {formattedRoutesDate}
              </Text>
            </View>
          </BottomScreenSheet>
        </Animated.View>
      )}
    </>
  )
}
