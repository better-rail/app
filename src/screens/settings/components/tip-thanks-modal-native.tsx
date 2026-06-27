import React from "react"
import { View, Modal, TouchableWithoutFeedback, Platform } from "react-native"
import { StyleSheet } from "react-native-unistyles"
import { Button, Text } from "@/components"
import { translate } from "@/i18n"

interface TipThanksModalNativeProps {
  visible: boolean
  onClose: () => void
}

export const TipThanksModalNative = function TipThanksModalNative({ visible, onClose }: TipThanksModalNativeProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <View style={styles.modalWrapper}>
              <Text style={styles.modalIcon}>🙏</Text>
              <Text style={styles.modalTitle} tx="settings.thankYou" />
              <Text style={styles.modalText} tx="settings.thankYouText" />

              <Button
                title={translate("common.close")}
                containerStyle={styles.modalButtonContainer}
                style={styles.modalButton}
                onPress={onClose}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  )
}

const styles = StyleSheet.create((theme, rt) => ({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalWrapper: {
    padding: Platform.select({ ios: theme.spacing[6], android: theme.spacing[5] }),
    marginHorizontal: theme.spacing[4],
    maxWidth: rt.screen.width - theme.spacing[4] * 2,
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.modalBackground,
    borderRadius: Platform.select({ ios: 14, android: 6 }),
    shadowOffset: { width: 0, height: 1 },
    shadowColor: theme.colors.palette.black,
    shadowRadius: 4,
    shadowOpacity: 0.45,
    elevation: 5,
  },
  modalIcon: {
    fontSize: 72.5,
  },
  modalTitle: {
    marginBottom: theme.spacing[2],
    textAlign: "center",
    fontSize: 22,
    fontWeight: "700",
  },
  modalText: {
    marginBottom: theme.spacing[3],
    textAlign: "center",
    fontSize: 18,
  },
  modalButtonContainer: {
    maxHeight: 60 * rt.fontScale,
  },
  modalButton: {
    minWidth: "90%",
  },
}))
